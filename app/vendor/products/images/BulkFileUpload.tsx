"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Loader2, CheckCircle2, AlertCircle, FileWarning } from "lucide-react";
import { upload } from "@vercel/blob/client";
import { SmartMatchPreview } from "./SmartMatchPreview";
import {
  findProductMatch,
  type VendorProduct,
  type MatchConfidence,
} from "@/lib/matching/product-image-matcher";

// Upload result status taxonomy
type UploadStatus = "uploaded" | "skipped" | "needs_confirmation" | "error";

interface UploadResult {
  filename: string;
  productName: string;
  status: UploadStatus;
  confidence?: MatchConfidence;
  imageUrl?: string;
  error?: string;
}

interface SmartMatchRow {
  file: File;
  filename: string;
  resolvedProductId: string | null;
  productName: string | null;
  confidence: MatchConfidence;
  score: number;
}

const MAX_FILES_PER_BATCH = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_CONCURRENT_UPLOADS = 3;

type WizardStep = "select" | "review" | "upload";

export function BulkFileUpload() {
  const { toast } = useToast();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>("select");

  // File state
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Smart Match state
  const [vendorProducts, setVendorProducts] = useState<VendorProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [smartMatchRows, setSmartMatchRows] = useState<SmartMatchRow[]>([]);

  // Upload state
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [results, setResults] = useState<UploadResult[] | null>(null);

  /**
   * STEP 1: SELECT FILES
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (selectedFiles.length > MAX_FILES_PER_BATCH) {
      toast({
        title: "Too many files",
        description: `Maximum ${MAX_FILES_PER_BATCH} files per batch`,
        variant: "destructive",
      });
      return;
    }

    const invalidFiles: string[] = [];
    const validFiles: File[] = [];

    for (const file of selectedFiles) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        invalidFiles.push(`${file.name}: Invalid type`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        invalidFiles.push(`${file.name}: Too large`);
        continue;
      }
      validFiles.push(file);
    }

    if (invalidFiles.length > 0) {
      toast({
        title: "Some files rejected",
        description: invalidFiles.join(", "),
        variant: "destructive",
      });
    }

    setFiles(validFiles);
    setResults(null);
    setCurrentStep("select");
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Fetch vendor products for Smart Match
   */
  const fetchVendorProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const response = await fetch("/api/vendor/products");
      if (!response.ok) throw new Error("Failed to fetch products");

      const data = await response.json();
      const products: VendorProduct[] = data.products.map((p: any) => ({
        id: p.id,
        sku: p.sku || null,
        name: p.name,
        slug: p.slug || null,
      }));
      setVendorProducts(products);
    } catch (error) {
      toast({
        title: "Failed to load products",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoadingProducts(false);
    }
  }, [toast]);

  // Load products on mount
  useEffect(() => {
    if (vendorProducts.length === 0) {
      fetchVendorProducts();
    }
  }, [vendorProducts.length, fetchVendorProducts]);

  /**
   * STEP 2: REVIEW MATCHES
   */
  const handleProceedToReview = () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one image",
        variant: "destructive",
      });
      return;
    }

    // Perform Smart Match
    const rows: SmartMatchRow[] = files.map((file) => {
      const matchResult = findProductMatch(file.name, vendorProducts);

      return {
        file,
        filename: file.name,
        resolvedProductId: matchResult.autoConfirm ? matchResult.suggestedProduct?.id || null : null,
        productName: matchResult.suggestedProduct?.name || null,
        confidence: matchResult.confidence,
        score: matchResult.score,
      };
    });

    setSmartMatchRows(rows);
    setCurrentStep("review");
  };

  const handleSmartMatchUpdate = (filename: string, productId: string) => {
    const product = vendorProducts.find((p) => p.id === productId);
    if (!product) return;

    setSmartMatchRows((prev) =>
      prev.map((row) =>
        row.filename === filename
          ? { ...row, resolvedProductId: productId, productName: product.name }
          : row
      )
    );
  };

  const handleBackToSelect = () => {
    setSmartMatchRows([]);
    setCurrentStep("select");
  };

  /**
   * STEP 3: UPLOAD
   */
  const handleConfirmAndUpload = () => {
    // Validate all rows have productId
    const unresolvedRows = smartMatchRows.filter((row) => !row.resolvedProductId);

    if (unresolvedRows.length > 0) {
      const filenames = unresolvedRows.map((r) => r.filename).join(", ");
      toast({
        title: "Cannot upload",
        description: `All files must have a matched product: ${filenames}`,
        variant: "destructive",
      });
      return;
    }

    setCurrentStep("upload");
    handleUpload();
  };

  const uploadSingleFile = async (
    file: File,
    vendorId: string,
    productId: string,
    productName: string
  ): Promise<UploadResult> => {
    try {
      // Pre-check: can upload?
      const canUploadResponse = await fetch(
        `/api/vendor/products/images/can-upload?productId=${encodeURIComponent(productId)}&replaceExisting=${replaceExisting}`
      );

      if (!canUploadResponse.ok) {
        const errorData = await canUploadResponse.json();
        return {
          filename: file.name,
          productName,
          status: "error",
          error: errorData.error || "Upload check failed",
        };
      }

      const canUploadData = await canUploadResponse.json();

      if (!canUploadData.ok) {
        return {
          filename: file.name,
          productName,
          status: "skipped",
          error: canUploadData.reason,
        };
      }

      // Upload to blob
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const blobPath = `vendors/${vendorId}/products/${productId}.${ext}`;

      const blob = await upload(blobPath, file, {
        access: "public",
        handleUploadUrl: "/api/vendor/products/images/upload-token",
        clientPayload: JSON.stringify({ replaceExisting }),
      });

      // Update database
      const updateResponse = await fetch("/api/vendor/products/images/update-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          imageUrl: blob.url,
          replaceExisting,
          filename: file.name,
        }),
      });

      const contentType = updateResponse.headers.get("content-type");
      let updateData: any;

      if (contentType?.includes("application/json")) {
        updateData = await updateResponse.json();
      } else {
        const text = await updateResponse.text();
        throw new Error(`Server error: ${text.substring(0, 200)}`);
      }

      if (!updateResponse.ok) {
        throw new Error(updateData.error || `HTTP ${updateResponse.status}`);
      }

      return {
        filename: file.name,
        productName,
        status: "uploaded",
        imageUrl: blob.url,
      };
    } catch (error) {
      console.error(`[BULK_UPLOAD] Error uploading ${file.name}:`, error);

      let errorMessage = error instanceof Error ? error.message : "Upload failed";
      if (errorMessage.includes("blob already exists")) {
        errorMessage = "Image exists. Enable 'Replace Existing Images' to overwrite.";
      }

      return {
        filename: file.name,
        productName,
        status: "error",
        error: errorMessage,
      };
    }
  };

  const handleUpload = async () => {
    setIsUploading(true);
    setResults(null);
    setUploadProgress({ current: 0, total: files.length });

    try {
      const vendorIdResponse = await fetch("/api/vendor/products/images/vendor-id");
      const vendorData = await vendorIdResponse.json();

      if (!vendorIdResponse.ok) {
        throw new Error(vendorData.error || "Failed to get vendor ID");
      }

      const { vendorId } = vendorData;

      // Upload with controlled concurrency
      const uploadResults: UploadResult[] = [];
      let currentIndex = 0;

      while (currentIndex < files.length) {
        const batch = files.slice(currentIndex, currentIndex + MAX_CONCURRENT_UPLOADS);

        const batchResults = await Promise.all(
          batch.map((file) => {
            const row = smartMatchRows.find((r) => r.filename === file.name);
            if (!row || !row.resolvedProductId || !row.productName) {
              return Promise.resolve({
                filename: file.name,
                productName: "Unknown",
                status: "error" as UploadStatus,
                error: "No product match",
              });
            }
            return uploadSingleFile(file, vendorId, row.resolvedProductId, row.productName);
          })
        );

        uploadResults.push(...batchResults);
        currentIndex += batch.length;
        setUploadProgress({ current: currentIndex, total: files.length });
      }

      setResults(uploadResults);

      const successCount = uploadResults.filter((r) => r.status === "uploaded").length;
      const errorCount = uploadResults.filter((r) => r.status === "error").length;

      toast({
        title: "Upload complete",
        description: `${successCount} uploaded, ${errorCount} errors`,
        variant: errorCount === 0 ? "default" : "destructive",
      });

      if (successCount > 0) {
        setFiles([]);
        setSmartMatchRows([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("[BULK_UPLOAD] Error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleStartOver = () => {
    setResults(null);
    setFiles([]);
    setSmartMatchRows([]);
    setCurrentStep("select");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /**
   * RENDER
   */
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* STEP INDICATOR */}
      <div className="flex items-center justify-center gap-2 px-6 py-8">
        <div className={`flex items-center gap-3 transition-all ${currentStep === "select" ? "font-medium" : "text-muted-foreground"}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
            currentStep === "select" 
              ? "bg-primary text-primary-foreground border-primary" 
              : "bg-background border-muted-foreground/40"
          }`}>
            <span className="text-sm font-semibold">1</span>
          </div>
          <span className="text-sm">Select</span>
        </div>
        <div className={`w-16 h-[2px] mx-2 transition-colors ${
          currentStep === "review" || currentStep === "upload" ? "bg-primary" : "bg-border"
        }`} />
        <div className={`flex items-center gap-3 transition-all ${currentStep === "review" ? "font-medium" : "text-muted-foreground"}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
            currentStep === "review" 
              ? "bg-primary text-primary-foreground border-primary" 
              : "bg-background border-muted-foreground/40"
          }`}>
            <span className="text-sm font-semibold">2</span>
          </div>
          <span className="text-sm">Review</span>
        </div>
        <div className={`w-16 h-[2px] mx-2 transition-colors ${
          currentStep === "upload" ? "bg-primary" : "bg-border"
        }`} />
        <div className={`flex items-center gap-3 transition-all ${currentStep === "upload" ? "font-medium" : "text-muted-foreground"}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
            currentStep === "upload" 
              ? "bg-primary text-primary-foreground border-primary" 
              : "bg-background border-muted-foreground/40"
          }`}>
            <span className="text-sm font-semibold">3</span>
          </div>
          <span className="text-sm">Upload</span>
        </div>
      </div>

      {/* STEP 1: SELECT FILES */}
      {currentStep === "select" && (
        <div className="space-y-6">
          <div className="bg-card border rounded-lg p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="image-files" className="text-base font-medium">Select Images</Label>
              <Input
                id="image-files"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Max {MAX_FILES_PER_BATCH} files · Max 5MB per file · JPEG, PNG, WebP
              </p>
            </div>

            {files.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Selected Files</Label>
                  <span className="text-xs text-muted-foreground">{files.length}/{MAX_FILES_PER_BATCH}</span>
                </div>
                <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB · {file.type.split('/')[1].toUpperCase()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="replace-existing" className="text-sm font-medium cursor-pointer">Replace Existing Images</Label>
                <p className="text-xs text-muted-foreground">
                  Overwrite images already set for products
                </p>
              </div>
              <Switch
                id="replace-existing"
                checked={replaceExisting}
                onCheckedChange={setReplaceExisting}
              />
            </div>
          </div>

          <div className="sticky bottom-0 pt-4 pb-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t">
            <Button
              onClick={handleProceedToReview}
              disabled={files.length === 0 || isLoadingProducts}
              className="w-full"
              size="lg"
            >
              {isLoadingProducts ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading products...
                </>
              ) : (
                <>
                  Continue to Review · {files.length} {files.length === 1 ? 'file' : 'files'}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: REVIEW MATCHES */}
      {currentStep === "review" && (
        <SmartMatchPreview
          smartMatchRows={smartMatchRows}
          allProducts={vendorProducts}
          onMatchUpdate={handleSmartMatchUpdate}
          onConfirm={handleConfirmAndUpload}
          onCancel={handleBackToSelect}
        />
      )}

      {/* STEP 3: UPLOAD RESULTS */}
      {currentStep === "upload" && results && (
        <div className="space-y-6">
          <div className="bg-card border rounded-lg p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Upload Complete</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {results.filter(r => r.status === "uploaded").length} uploaded, 
                  {results.filter(r => r.status === "skipped").length} skipped, 
                  {results.filter(r => r.status === "error").length} failed
                </p>
              </div>
              
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {results.map((result, index) => {
                  const isSuccess = result.status === "uploaded";
                  const isSkipped = result.status === "skipped";
                  const isError = result.status === "error";

                  return (
                    <div
                      key={index}
                      className={`rounded-lg border p-4 transition-colors ${
                        isSuccess
                          ? "bg-green-50/50 border-green-200/60 dark:bg-green-950/20 dark:border-green-800/40"
                          : isSkipped
                          ? "bg-amber-50/50 border-amber-200/60 dark:bg-amber-950/20 dark:border-amber-800/40"
                          : "bg-red-50/50 border-red-200/60 dark:bg-red-950/20 dark:border-red-800/40"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 rounded-full p-1 ${
                          isSuccess 
                            ? "bg-green-100 dark:bg-green-900/40"
                            : isSkipped
                            ? "bg-amber-100 dark:bg-amber-900/40"
                            : "bg-red-100 dark:bg-red-900/40"
                        }`}>
                          {isSuccess && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />}
                          {isSkipped && <FileWarning className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                          {isError && <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium leading-tight">{result.productName}</p>
                              <p className="text-xs text-muted-foreground truncate">{result.filename}</p>
                            </div>
                          </div>
                          {isSuccess && (
                            <p className="text-xs text-green-700 dark:text-green-400">Successfully uploaded</p>
                          )}
                          {isSkipped && result.error && (
                            <p className="text-xs text-amber-700 dark:text-amber-400">{result.error}</p>
                          )}
                          {isError && result.error && (
                            <p className="text-xs text-red-700 dark:text-red-400">{result.error}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 pt-4 pb-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t">
            <Button onClick={handleStartOver} variant="outline" className="w-full" size="lg">
              Upload More Images
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
