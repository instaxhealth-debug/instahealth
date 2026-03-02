"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { parseImageCsv } from "@/lib/csv-image-parser";
import { upload } from "@vercel/blob/client";
import { FailedUploadRetry } from "./FailedUploadRetry";

interface SkuSuggestion {
  sku: string;
  productName: string;
  score: number;
  scorePercent: string;
}

interface UploadResult {
  filename: string;
  sku: string;
  success: boolean;
  imageUrl?: string;
  error?: string;
  requiresConfirmation?: boolean;
  suggestions?: SkuSuggestion[];
  derivedSku?: string;
  matchMethod?: string;
  wasAutoAssigned?: boolean;
}

const MAX_FILES_PER_BATCH = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_CONCURRENT_UPLOADS = 3; // Limit concurrent uploads

function extractSkuFromFilename(filename: string): string {
  // Remove file extension and return as SKU
  return filename.replace(/\.(jpg|jpeg|png|webp)$/i, "");
}

export function BulkFileUpload() {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [mappingMode, setMappingMode] = useState<"filename" | "csv">("filename");
  const [csvMapping, setCsvMapping] = useState<Map<string, string> | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [enableFuzzyMatch, setEnableFuzzyMatch] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [results, setResults] = useState<UploadResult[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    // Validate file count
    if (selectedFiles.length > MAX_FILES_PER_BATCH) {
      toast({
        title: "Too many files",
        description: `Maximum ${MAX_FILES_PER_BATCH} files per batch. Please select fewer files.`,
        variant: "destructive",
      });
      return;
    }

    // Validate each file
    const invalidFiles: string[] = [];
    const validFiles: File[] = [];

    for (const file of selectedFiles) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        invalidFiles.push(`${file.name}: Invalid type (${file.type})`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        invalidFiles.push(`${file.name}: Too large (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        continue;
      }
      validFiles.push(file);
    }

    if (invalidFiles.length > 0) {
      toast({
        title: "Some files were rejected",
        description: invalidFiles.join(", "),
        variant: "destructive",
      });
    }

    setFiles((prev) => [...prev, ...validFiles]);
    setResults(null);
  };

  const handleCsvMapping = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseImageCsv(file);

      if (parsed.errors.length > 0) {
        toast({
          title: "CSV parsing error",
          description: parsed.errors[0].error,
          variant: "destructive",
        });
        return;
      }

      const mapping = new Map<string, string>();
      for (const row of parsed.rows) {
        if (row.filename) {
          mapping.set(row.filename, row.sku);
        }
      }

      setCsvMapping(mapping);
      toast({
        title: "CSV mapping loaded",
        description: `${mapping.size} mappings found`,
      });
    } catch (error) {
      toast({
        title: "Failed to parse CSV",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRetrySuccess = (retryData: {
    filename: string;
    sku: string;
    imageUrl: string;
  }) => {
    setResults((prev) => {
      if (!prev) return prev;
      return prev.map((result) =>
        result.filename === retryData.filename
          ? {
              ...result,
              success: true,
              sku: retryData.sku,
              imageUrl: retryData.imageUrl,
              requiresConfirmation: false,
              error: undefined,
            }
          : result
      );
    });

    toast({
      title: "Upload successful",
      description: `${retryData.filename} → SKU: ${retryData.sku}`,
    });
  };

  const dismissRetry = (filename: string) => {
    setResults((prev) => {
      if (!prev) return prev;
      return prev.filter((result) => result.filename !== filename);
    });
  };

  /**
   * Upload a single file directly to Blob, then update DB
   * NO file bytes pass through Next.js API routes
   * Uses secure handleUpload pattern (token NOT exposed to browser)
   */
  const uploadSingleFile = async (
    file: File,
    vendorId: string
  ): Promise<UploadResult> => {
    let sku = "";
    try {
      // Determine SKU based on mapping mode
      if (mappingMode === "csv" && csvMapping) {
        const mappedSku = csvMapping.get(file.name);
        if (!mappedSku) {
          return {
            filename: file.name,
            sku: "",
            success: false,
            error: "SKU not found in CSV mapping",
          };
        }
        sku = mappedSku;
      } else {
        // filename mode: extract SKU from filename
        sku = extractSkuFromFilename(file.name);
      }

      // ✅ PRE-CHECK: Call can-upload endpoint BEFORE uploading bytes
      // This prevents storage landfill by blocking uploads that would fail anyway
      const canUploadResponse = await fetch(
        `/api/vendor/products/images/can-upload?sku=${encodeURIComponent(sku)}&replaceExisting=${replaceExisting}`
      );

      if (!canUploadResponse.ok) {
        const errorData = await canUploadResponse.json();
        return {
          filename: file.name,
          sku,
          success: false,
          error: errorData.error || "Failed to check upload permission",
        };
      }

      const canUploadData = await canUploadResponse.json();

      // If upload is blocked (product already has image and Replace is OFF)
      if (!canUploadData.ok) {
        return {
          filename: file.name,
          sku,
          success: false,
          error: canUploadData.reason,
        };
      }

      // Only proceed to upload if pre-check passed
      // Construct blob path: vendors/{vendorId}/products/{sku}.{ext}
      // This path will be validated server-side in handleUpload
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const blobPath = `vendors/${vendorId}/products/${sku}.${ext}`;

      // Upload directly to Blob using secure handleUpload pattern
      // handleUploadUrl calls our endpoint which uses handleUpload()
      // This does NOT expose BLOB_READ_WRITE_TOKEN to browser
      // clientPayload passes replaceExisting flag to server
      const blob = await upload(blobPath, file, {
        access: "public",
        handleUploadUrl: "/api/vendor/products/images/upload-token",
        clientPayload: JSON.stringify({ replaceExisting }),
      });

      // Update database via small JSON endpoint with fuzzy matching
      const updateResponse = await fetch("/api/vendor/products/images/update-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku,
          imageUrl: blob.url,
          replaceExisting,
          filename: file.name,
          allowFuzzyMatch: enableFuzzyMatch,
        }),
      });

      // Robust error handling - check content type
      const contentType = updateResponse.headers.get("content-type");
      let updateData: any;

      if (contentType?.includes("application/json")) {
        updateData = await updateResponse.json();
      } else {
        const text = await updateResponse.text();
        throw new Error(`Server error (${updateResponse.status}): ${text.substring(0, 200)}`);
      }

      if (!updateResponse.ok) {
        // Check if this is a 404 with suggestions
        if (updateResponse.status === 404 && updateData.requiresConfirmation) {
          return {
            filename: file.name,
            sku,
            derivedSku: sku,
            success: false,
            requiresConfirmation: true,
            suggestions: updateData.suggestions || [],
            error: updateData.error,
            imageUrl: blob.url, // Keep imageUrl for retry
          };
        }

        throw new Error(updateData.error || `HTTP ${updateResponse.status}`);
      }

      return {
        filename: file.name,
        sku: updateData.sku,
        derivedSku: sku,
        success: true,
        imageUrl: blob.url,
        matchMethod: updateData.matchMethod,
        wasAutoAssigned: updateData.wasAutoAssigned,
      };
    } catch (error) {
      console.error(`[BULK_UPLOAD] Error uploading ${file.name}:`, error);

      // Check if this is a "blob already exists" error
      let errorMessage = error instanceof Error ? error.message : "Upload failed";
      if (errorMessage.includes("blob already exists") || errorMessage.includes("already exists")) {
        errorMessage = "Image already exists in storage. Toggle 'Replace Existing Images' to overwrite.";
      }

      return {
        filename: file.name,
        sku: sku || extractSkuFromFilename(file.name),
        success: false,
        error: errorMessage,
      };
    }
  };

  /**
   * Upload files with controlled concurrency (max 3 at a time)
   */
  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one image file",
        variant: "destructive",
      });
      return;
    }

    if (mappingMode === "csv" && !csvMapping) {
      toast({
        title: "CSV mapping required",
        description: "Please upload a CSV mapping file first",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setResults(null);
    setUploadProgress({ current: 0, total: files.length });

    try {
      // Get vendorId for blob path construction (tiny JSON response)
      const vendorIdResponse = await fetch("/api/vendor/products/images/vendor-id");

      const contentType = vendorIdResponse.headers.get("content-type");
      let vendorData: any;

      if (contentType?.includes("application/json")) {
        vendorData = await vendorIdResponse.json();
      } else {
        const text = await vendorIdResponse.text();
        throw new Error(`Server error (${vendorIdResponse.status}): ${text.substring(0, 200)}`);
      }

      if (!vendorIdResponse.ok) {
        throw new Error(vendorData.error || "Failed to get vendor ID");
      }

      const { vendorId } = vendorData;

      // Upload files with controlled concurrency
      const uploadResults: UploadResult[] = [];
      let currentIndex = 0;

      // Process files in batches of MAX_CONCURRENT_UPLOADS
      while (currentIndex < files.length) {
        const batch = files.slice(currentIndex, currentIndex + MAX_CONCURRENT_UPLOADS);

        const batchResults = await Promise.all(
          batch.map((file) => uploadSingleFile(file, vendorId))
        );

        uploadResults.push(...batchResults);
        currentIndex += batch.length;

        // Update progress
        setUploadProgress({ current: currentIndex, total: files.length });
      }

      setResults(uploadResults);

      const successCount = uploadResults.filter((r) => r.success).length;
      const failureCount = uploadResults.filter((r) => !r.success).length;

      toast({
        title: "Upload complete",
        description: `${successCount} images uploaded successfully, ${failureCount} failed`,
        variant: failureCount === 0 ? "default" : "destructive",
      });

      // Clear files on success
      if (successCount > 0) {
        setFiles([]);
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

  return (
    <div className="space-y-6">
      {/* Mapping Mode */}
      <div className="space-y-3">
        <Label>Mapping Mode</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="mappingMode"
              value="filename"
              checked={mappingMode === "filename"}
              onChange={(e) => setMappingMode("filename")}
              className="h-4 w-4"
            />
            <span className="text-sm">Filename = SKU</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="mappingMode"
              value="csv"
              checked={mappingMode === "csv"}
              onChange={(e) => setMappingMode("csv")}
              className="h-4 w-4"
            />
            <span className="text-sm">CSV Mapping</span>
          </label>
        </div>
      </div>

      {/* CSV Mapping Upload (only if CSV mode) */}
      {mappingMode === "csv" && (
        <div className="space-y-2">
          <Label htmlFor="csv-mapping">CSV Mapping File</Label>
          <Input
            id="csv-mapping"
            ref={csvInputRef}
            type="file"
            accept=".csv"
            onChange={handleCsvMapping}
          />
          {csvMapping && (
            <p className="text-sm text-green-600">
              ✓ {csvMapping.size} mappings loaded
            </p>
          )}
        </div>
      )}

      {/* File Input */}
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
          Max {MAX_FILES_PER_BATCH} files per batch • Max 5MB per file • JPEG, PNG, WebP only
        </p>
      </div>

      {/* Selected Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
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
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Options */}
      <div className="space-y-3">
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
            disabled={isUploading}
          />
        </div>

        <div className="flex items-center justify-between border rounded-md p-3">
          <div className="space-y-0.5">
            <Label htmlFor="fuzzy-match">Smart SKU Matching</Label>
            <p className="text-xs text-muted-foreground">
              Auto-fix minor filename differences (e.g., spaces, copy, final)
            </p>
          </div>
          <Switch
            id="fuzzy-match"
            checked={enableFuzzyMatch}
            onCheckedChange={setEnableFuzzyMatch}
            disabled={isUploading}
          />
        </div>
      </div>

      {/* Upload Button */}
      <Button
        onClick={handleUpload}
        disabled={isUploading || files.length === 0}
        className="w-full"
        size="lg"
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading {uploadProgress?.current || 0}/{uploadProgress?.total || 0} images...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Upload {files.length} Images
          </>
        )}
      </Button>

      {/* Results */}
      {results && (
        <div className="space-y-3 border-t pt-6">
          <h3 className="font-semibold">Upload Results</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((result, index) => {
              // Show retry UI for failed uploads with suggestions
              if (!result.success && result.requiresConfirmation && result.suggestions) {
                return (
                  <FailedUploadRetry
                    key={index}
                    filename={result.filename}
                    derivedSku={result.derivedSku || result.sku}
                    originalError={result.error || "Product not found"}
                    suggestions={result.suggestions}
                    imageUrl={result.imageUrl || ""}
                    replaceExisting={replaceExisting}
                    onRetrySuccess={handleRetrySuccess}
                    onDismiss={() => dismissRetry(result.filename)}
                  />
                );
              }

              // Show standard success/error result
              return (
                <div
                  key={index}
                  className={`p-3 rounded-md border ${
                    result.success
                      ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                      : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {result.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 text-sm space-y-1">
                      <p className="font-medium">
                        {result.filename} → SKU: {result.sku}
                      </p>
                      {result.success && result.imageUrl && (
                        <>
                          <p className="text-green-700 dark:text-green-300 text-xs">
                            ✓ Uploaded successfully
                            {result.wasAutoAssigned && (
                              <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                                ({result.matchMethod === "normalized" ? "normalized match" : "fuzzy match"})
                              </span>
                            )}
                          </p>
                          {result.derivedSku && result.derivedSku !== result.sku && (
                            <p className="text-xs text-green-600 dark:text-green-400">
                              Derived: {result.derivedSku} → Matched: {result.sku}
                            </p>
                          )}
                        </>
                      )}
                      {!result.success && result.error && (
                        <p className="text-red-700 dark:text-red-300 text-xs">
                          ✗ {result.error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
