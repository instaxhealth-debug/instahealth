"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { parseImageCsv } from "@/lib/csv-image-parser";

interface CsvRow {
  sku: string;
  imageUrl: string;
  validation?: {
    valid: boolean;
    error?: string;
  };
}

interface ImportResult {
  rowIndex: number;
  sku: string;
  imageUrl: string;
  success: boolean;
  action?: "updated" | "cleared" | "skipped";
  error?: string;
}

export function CsvUrlImport() {
  const { toast } = useToast();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<CsvRow[]>([]);
  const [allowClear, setAllowClear] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      // Convert to CsvRow format and validate URLs
      const rows = parsed.rows
        .filter((row) => row.imageUrl !== undefined)
        .map((row) => {
          const csvRow: CsvRow = {
            sku: row.sku,
            imageUrl: row.imageUrl || "",
          };

          // Basic validation (full validation happens on backend)
          if (csvRow.imageUrl && !csvRow.imageUrl.startsWith("https://")) {
            csvRow.validation = {
              valid: false,
              error: "URL must start with https://",
            };
          } else if (csvRow.imageUrl === "") {
            csvRow.validation = {
              valid: true,
              error: "Will clear image (requires confirmation)",
            };
          } else {
            csvRow.validation = { valid: true };
          }

          return csvRow;
        });

      if (rows.length === 0) {
        toast({
          title: "No valid rows found",
          description: "CSV must have sku and imageUrl columns",
          variant: "destructive",
        });
        return;
      }

      setCsvFile(file);
      setParsedRows(rows);
      setResults(null);

      toast({
        title: "CSV loaded",
        description: `${rows.length} rows found`,
      });
    } catch (error) {
      toast({
        title: "Failed to parse CSV",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) {
      toast({
        title: "No data to import",
        description: "Please upload a CSV file first",
        variant: "destructive",
      });
      return;
    }

    // Check if any rows will clear images and allowClear is not enabled
    const hasClearRows = parsedRows.some((row) => row.imageUrl === "");
    if (hasClearRows && !allowClear) {
      toast({
        title: "Clearing images not allowed",
        description: "Enable 'Allow clearing images' to proceed with empty URLs",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setResults(null);

    try {
      const response = await fetch("/api/vendor/products/images/csv-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rows: parsedRows,
          allowClear,
        }),
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

      setResults(data.results);

      toast({
        title: "Import complete",
        description: `${data.successCount} images imported, ${data.failureCount} failed`,
        variant: data.failureCount === 0 ? "default" : "destructive",
      });

      // Clear on success
      if (data.successCount > 0) {
        setCsvFile(null);
        setParsedRows([]);
        if (csvInputRef.current) csvInputRef.current.value = "";
      }
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* CSV File Upload */}
      <div className="space-y-2">
        <Label htmlFor="csv-file">CSV File</Label>
        <Input
          id="csv-file"
          ref={csvInputRef}
          type="file"
          accept=".csv"
          onChange={handleCsvUpload}
        />
      </div>

      {/* Preview Table */}
      {parsedRows.length > 0 && (
        <div className="space-y-2">
          <Label>Preview ({parsedRows.length} rows)</Label>
          <div className="border rounded-md max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-left p-2 border-b font-semibold">#</th>
                  <th className="text-left p-2 border-b font-semibold">SKU</th>
                  <th className="text-left p-2 border-b font-semibold">Image URL</th>
                  <th className="text-left p-2 border-b font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row, index) => (
                  <tr
                    key={index}
                    className={`border-b hover:bg-muted/50 ${
                      row.validation?.valid === false ? "bg-red-50 dark:bg-red-950/30" : ""
                    }`}
                  >
                    <td className="p-2 text-muted-foreground">{index + 1}</td>
                    <td className="p-2 font-mono">{row.sku}</td>
                    <td className="p-2 truncate max-w-md">
                      {row.imageUrl || <span className="text-muted-foreground italic">empty</span>}
                    </td>
                    <td className="p-2">
                      {row.validation?.valid === false ? (
                        <span className="text-red-600 dark:text-red-400 text-xs flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {row.validation.error}
                        </span>
                      ) : row.imageUrl === "" ? (
                        <span className="text-yellow-600 dark:text-yellow-400 text-xs">
                          Will clear
                        </span>
                      ) : (
                        <span className="text-green-600 dark:text-green-400 text-xs flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Valid
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Options */}
      {parsedRows.length > 0 && (
        <div className="flex items-center justify-between border rounded-md p-3">
          <div className="space-y-0.5">
            <Label htmlFor="allow-clear">Allow Clearing Images</Label>
            <p className="text-xs text-muted-foreground">
              Allow empty imageUrl values to clear product images
            </p>
          </div>
          <Switch
            id="allow-clear"
            checked={allowClear}
            onCheckedChange={setAllowClear}
          />
        </div>
      )}

      {/* Import Button */}
      <Button
        onClick={handleImport}
        disabled={isImporting || parsedRows.length === 0}
        className="w-full"
        size="lg"
      >
        {isImporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Importing {parsedRows.length} images...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Import {parsedRows.length} Images
          </>
        )}
      </Button>

      {/* Results */}
      {results && (
        <div className="space-y-3 border-t pt-6">
          <h3 className="font-semibold">Import Results</h3>
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
                      Row {result.rowIndex}: SKU {result.sku}
                    </p>
                    {result.success && result.action === "updated" && (
                      <p className="text-green-700 dark:text-green-300 text-xs truncate">
                        ✓ Updated: {result.imageUrl}
                      </p>
                    )}
                    {result.success && result.action === "cleared" && (
                      <p className="text-green-700 dark:text-green-300 text-xs">
                        ✓ Image cleared
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
