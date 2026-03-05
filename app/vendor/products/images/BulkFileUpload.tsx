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
    <div className="space-y-6">
      {/* STEP INDICATOR */}
      <div className="flex items-center gap-4 pb-6 border-b">
        <div className={`flex items-center gap-2 ${currentStep === "select" ? "font-semibold" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "select" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            1
          </div>
          <span>Select</span>
        </div>
        <div className="flex-1 h-px bg-border" />
        <div className={`flex items-center gap-2 ${currentStep === "review" ? "font-semibold" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "review" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            2
          </div>
          <span>Review</span>
        </div>
        <div className="flex-1 h-px bg-border" />
        <div className={`flex items-center gap-2 ${currentStep === "upload" ? "font-semibold" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "upload" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            3
          </div>
          <span>Upload</span>
        </div>
      </div>

      {/* STEP 1: SELECT FILES */}
      {currentStep === "select" && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="image-files">Select Images (max {MAX_FILES_PER_BATCH})</Label>
            <Input
              id="image-files"
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileSelect}
            />
            <p className="text-xs text-muted-foreground">
              Max {MAX_FILES_PER_BATCH} files • Max 5MB per file • JPEG, PNG, WebP only
            </p>
          </div>

          {files.length > 0 && (
            <div className="space-y-3">
              <Label>Selected Files ({files.length}/{MAX_FILES_PER_BATCH})</Label>
              <div className="border rounded-md p-3 max-h-64 overflow-y-auto space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm bg-muted p-2 rounded"
                  >
                    <span className="truncate flex-1">{file.name}</span>
                    <span className="text-muted-foreground text-xs mx-2">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border rounded-md p-3">
            <div className="space-y-0.5">
              <Label htmlFor="replace-existing">Replace Existing Images</Label>
              <p className="text-xs text-muted-foreground">
                Overwrite images that are already set for products
              </p>
            </div>
            <Switch
              id="replace-existing"
              checked={replaceExisting}
              onCheckedChange={setReplaceExisting}
            />
          </div>

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
                Proceed to Review ({files.length} files)
              </>
            )}
          </Button>
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
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Upload Results</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((result, index) => {
              const isSuccess = result.status === "uploaded";
              const isSkipped = result.status === "skipped";
              const isError = result.status === "error";

              return (
                <div
                  key={index}
                  className={`p-3 rounded-md border ${
                    isSuccess
                      ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                      : isSkipped
                      ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800"
                      : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {isSuccess && <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />}
                    {isSkipped && <FileWarning className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />}
                    {isError && <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 text-sm space-y-1">
                      <p className="font-medium">
                        {result.filename} → {result.productName}
                      </p>
                      {isSuccess && <p className="text-green-700 text-xs">✓ Uploaded successfully</p>}
                      {isSkipped && result.error && <p className="text-yellow-700 text-xs">⏭ {result.error}</p>}
                      {isError && result.error && <p className="text-red-700 text-xs">✗ {result.error}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Button onClick={handleStartOver} variant="outline" className="w-full">
            Upload More Images
          </Button>
        </div>
      )}
    </div>
  );
}
