"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { parseImageCsv } from "@/lib/csv-image-parser";

interface UploadResult {
  filename: string;
  sku: string;
  success: boolean;
  imageUrl?: string;
  error?: string;
}

const MAX_FILES_PER_BATCH = 10; // Practical limit for server uploads
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function BulkFileUpload() {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [mappingMode, setMappingMode] = useState<"filename" | "csv">("filename");
  const [csvMapping, setCsvMapping] = useState<Map<string, string> | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
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
      // Build FormData for server-side upload
      const formData = new FormData();

      // Add files
      files.forEach((file) => {
        formData.append("files", file);
      });

      // Add metadata
      formData.append("mappingMode", mappingMode);
      formData.append("replaceExisting", replaceExisting.toString());

      // Add CSV mapping if in CSV mode
      if (mappingMode === "csv" && csvMapping) {
        const mappingArray = Array.from(csvMapping.entries()).map(
          ([filename, sku]) => ({ filename, sku })
        );
        formData.append("mapping", JSON.stringify(mappingArray));
      }

      // Upload to server-side API route
      const response = await fetch("/api/vendor/products/images/bulk-upload", {
        method: "POST",
        body: formData,
      });

      // Robust error handling - check content type
      let data: any;
      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server error (${response.status}): ${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setResults(data.results || []);

      const successCount = data.successCount || 0;
      const failureCount = data.failureCount || 0;

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
            Uploading {files.length} images...
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
            {results.map((result, index) => (
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
                      <p className="text-green-700 dark:text-green-300 text-xs">
                        ✓ Uploaded successfully
                      </p>
                    )}
                    {!result.success && result.error && (
                      <p className="text-red-700 dark:text-red-300 text-xs">
                        ✗ {result.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
