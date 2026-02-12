"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, AlertCircle, CheckCircle2, Info } from "lucide-react";

interface PreviewRow {
  rowIndex: number;
  isValid: boolean;
  errors: string[];
  action: "create" | "update";
  rawCategory: string;
  mappedCategorySlug: string | null;
  mappingReason: string | null;
  mappingConfidence: string | null;
  missingCategory: boolean;
  data: { sku?: string; name: string; category: string; priceFils: number };
}

interface PreviewData {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  missingCategoryCount: number;
  counts: { willCreate: number; willUpdate: number };
  rows: PreviewRow[];
}

interface ImportResult {
  ok: boolean;
  requestId: string;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  rowErrors: Array<{ rowNumber: number; sku?: string | null; name?: string | null; message: string }>;
}

type State = "initial" | "uploading" | "preview" | "importing" | "complete";

function dedupeRowErrors(
  errors: Array<{ rowNumber: number; sku?: string | null; name?: string | null; message: string }>
): Array<{ rowNumber: number; sku?: string | null; name?: string | null; message: string }> {
  const map = new Map<number, { rowNumber: number; sku?: string | null; name?: string | null; messages: string[] }>();
  for (const err of errors) {
    const existing = map.get(err.rowNumber);
    if (existing) {
      existing.messages.push(err.message);
    } else {
      map.set(err.rowNumber, { rowNumber: err.rowNumber, sku: err.sku, name: err.name, messages: [err.message] });
    }
  }
  return Array.from(map.values()).map((v) => ({
    rowNumber: v.rowNumber,
    sku: v.sku,
    name: v.name,
    message: v.messages.join("; "),
  }));
}


export function ProductImportModal() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>("initial");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [allowedCategories, setAllowedCategories] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState("");
  const [previewId, setPreviewId] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  function reset() {
    setState("initial");
    setFile(null);
    setPreview(null);
    setResult(null);
    setBulkCategory("");
    setPreviewId("");
    if (inputRef.current) inputRef.current.value = "";
  }

  const fetchPreview = useCallback(async (f: File, bulkCat?: string) => {
    const formData = new FormData();
    formData.append("file", f);
    if (bulkCat) formData.append("bulkCategory", bulkCat);

    const res = await fetch("/api/vendor/products/import/preview", {
      method: "POST",
      body: formData,
    });
    return res.json();
  }, []);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    setFile(f);
    setState("uploading");

    try {
      const data = await fetchPreview(f);

      if (!data.ok) {
        toast({ title: "Preview failed", description: data.message, variant: "destructive" });
        reset();
        return;
      }

      setAllowedCategories(data.allowedCategories || []);
      setPreviewId(data.previewId || "");
      setPreview(data.preview);
      setState("preview");
    } catch {
      toast({ title: "Network error", description: "Failed to upload file", variant: "destructive" });
      reset();
    }
  }

  async function handleBulkCategoryChange(value: string) {
    setBulkCategory(value);
    if (!file || !value) return;

    setState("uploading");
    try {
      const data = await fetchPreview(file, value);
      if (data.ok) {
        setPreview(data.preview);
        setPreviewId(data.previewId || "");
      }
      setState("preview");
    } catch {
      setState("preview");
    }
  }

  async function handleImport() {
    if (!file) return;
    setState("importing");

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (bulkCategory) formData.append("bulkCategory", bulkCategory);
      if (previewId) formData.append("previewId", previewId);

      const res = await fetch("/api/vendor/products/import/commit", {
        method: "POST",
        body: formData,
      });

      // Handle 5xx / timeout — force re-preview
      if (res.status >= 500) {
        toast({
          title: "Import failed",
          description: "Server error — please re-upload.",
          variant: "destructive",
        });
        reset();
        return;
      }

      const data = await res.json();

      if (!data.ok) {
        // PREVIEW_OUTDATED means file/config changed — force full re-preview
        if (data.code === "PREVIEW_OUTDATED") {
          toast({
            title: "Preview outdated",
            description: "Preview outdated — please re-upload.",
            variant: "destructive",
          });
          reset();
          return;
        }
        toast({ title: "Import failed", description: data.message, variant: "destructive" });
        setState("preview");
        return;
      }

      const hasFailures = data.failedCount > 0;
      if (hasFailures) {
        setResult(data);
        setState("complete");
        toast({
          title: "Imported with warnings",
          description: `Imported with warnings: ${data.createdCount} created, ${data.updatedCount} updated, ${data.failedCount} failed`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Import complete",
          description: `Imported ${data.createdCount + data.updatedCount} products`,
        });
        reset();
        setOpen(false);
      }
      router.refresh();
    } catch {
      // Network error or timeout — force re-preview
      toast({
        title: "Import failed",
        description: "Server error — please re-upload.",
        variant: "destructive",
      });
      reset();
    }
  }

  function handleClose() {
    const wasComplete = state === "complete";
    setOpen(false);
    setTimeout(() => {
      reset();
      if (wasComplete) window.location.reload();
    }, 200);
  }

  const hasMissingCategories = (preview?.missingCategoryCount ?? 0) > 0;
  const onlyMissingCategoryErrors = preview && preview.invalidRows > 0 && hasMissingCategories;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Products from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk create or update products by SKU.
          </DialogDescription>
        </DialogHeader>

        {/* Allowed categories info */}
        {allowedCategories.length > 0 && state !== "complete" && (
          <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              <strong>Allowed categories:</strong>{" "}
              {allowedCategories.join(", ")}
            </span>
          </div>
        )}

        {/* INITIAL */}
        {state === "initial" && (
          <div className="space-y-4">
            <Button variant="outline" size="sm" asChild>
              <a href="/vendor/products/import-template.csv" download>
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </a>
            </Button>

            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Select a .csv or .xlsx file
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileSelect}
                className="text-sm"
              />
            </div>
          </div>
        )}

        {/* UPLOADING */}
        {state === "uploading" && (
          <div className="py-10 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Validating CSV...</p>
          </div>
        )}

        {/* PREVIEW */}
        {state === "preview" && preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <StatCard label="Total" value={preview.totalRows} />
              <StatCard label="Valid" value={preview.validRows} className="bg-green-50 text-green-700" />
              <StatCard label="Invalid" value={preview.invalidRows} className="bg-red-50 text-red-700" />
              <StatCard
                label="Create / Update"
                value={`${preview.counts.willCreate} / ${preview.counts.willUpdate}`}
                className="bg-blue-50 text-blue-700"
              />
            </div>

            {/* Bulk assign category dropdown */}
            {onlyMissingCategoryErrors && allowedCategories.length > 1 && (
              <div className="flex items-center gap-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-amber-700 font-medium mb-1">
                    {preview.missingCategoryCount} row{preview.missingCategoryCount > 1 ? "s" : ""} missing category
                  </p>
                  <div className="flex items-center gap-2">
                    <label htmlFor="bulk-category" className="text-xs text-amber-700">
                      Assign to all:
                    </label>
                    <select
                      id="bulk-category"
                      value={bulkCategory}
                      onChange={(e) => handleBulkCategoryChange(e.target.value)}
                      className="text-xs border rounded px-2 py-1 bg-white"
                    >
                      <option value="">Select category...</option>
                      {allowedCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[280px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left w-12">#</th>
                      <th className="px-3 py-2 text-left w-12" />
                      <th className="px-3 py-2 text-left w-16">Action</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Category</th>
                      <th className="px-3 py-2 text-left">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <tr key={row.rowIndex} className="border-t">
                        <td className="px-3 py-2 text-muted-foreground">{row.rowIndex}</td>
                        <td className="px-3 py-2">
                          {row.isValid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              row.action === "create"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {row.action}
                          </span>
                        </td>
                        <td className="px-3 py-2 truncate max-w-[140px]">{row.data.name}</td>
                        <td className="px-3 py-2 text-xs">
                          {row.mappedCategorySlug ? (
                            <span className="text-green-700">
                              {row.mappedCategorySlug}
                              {row.mappingConfidence === "MEDIUM" && (
                                <span className="text-amber-600 ml-1" title={`Matched via ${row.mappingReason}`}>~</span>
                              )}
                            </span>
                          ) : row.missingCategory ? (
                            <span className="text-amber-600 italic">missing</span>
                          ) : null}
                          {row.rawCategory && row.mappedCategorySlug && row.rawCategory !== row.mappedCategorySlug && (
                            <span className="text-muted-foreground ml-1">
                              ← {row.rawCategory}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-red-600 text-xs">{row.errors.join("; ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {preview.rows.length < preview.totalRows && (
              <p className="text-xs text-muted-foreground text-center">
                Showing {preview.rows.length} of {preview.totalRows} rows
              </p>
            )}
          </div>
        )}

        {/* IMPORTING */}
        {state === "importing" && (
          <div className="py-10 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Importing products...</p>
          </div>
        )}

        {/* COMPLETE */}
        {state === "complete" && result && (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold">Import Complete</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Created" value={result.createdCount} className="bg-green-50 text-green-700" />
              <StatCard label="Updated" value={result.updatedCount} className="bg-blue-50 text-blue-700" />
              <StatCard label="Failed" value={result.failedCount} className="bg-red-50 text-red-700" />
            </div>
            {result.rowErrors.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const dedupedRows = dedupeRowErrors(result.rowErrors);
                      const header = "rowNumber,sku,name,message";
                      const lines = dedupedRows.map((e) => {
                        const values = [
                          String(e.rowNumber),
                          e.sku ?? "",
                          e.name ?? "",
                          e.message,
                        ];
                        return values.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
                      });
                      const text = [header, ...lines].join("\n");
                      try {
                        await navigator.clipboard.writeText(text);
                        toast({ title: "Copied failed rows" });
                      } catch {
                        toast({ title: "Copy failed", description: "Please try again.", variant: "destructive" });
                      }
                    }}
                  >
                    Copy failed rows
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const dedupedRows = dedupeRowErrors(result.rowErrors);
                      const header = "rowNumber,sku,name,message";
                      const lines = dedupedRows.map((e) => {
                        const values = [
                          String(e.rowNumber),
                          e.sku ?? "",
                          e.name ?? "",
                          e.message,
                        ];
                        return values.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
                      });
                      const text = [header, ...lines].join("\n");
                      const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "failed-rows.csv";
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Download failed rows
                  </Button>
                </div>
                <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="py-1 pr-2">Row</th>
                        <th className="py-1 pr-2">SKU</th>
                        <th className="py-1 pr-2">Name</th>
                        <th className="py-1">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dedupeRowErrors(result.rowErrors).map((e, i) => (
                        <tr key={`${e.rowNumber}-${i}`} className="border-t">
                          <td className="py-1 pr-2 text-muted-foreground">{e.rowNumber}</td>
                          <td className="py-1 pr-2">{e.sku || "-"}</td>
                          <td className="py-1 pr-2">{e.name || "-"}</td>
                          <td className="py-1 text-red-600">{e.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {state === "preview" && (
            <>
              <Button variant="outline" onClick={reset}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={!preview || preview.invalidRows > 0}>
                Import {preview?.validRows || 0} Products
              </Button>
            </>
          )}
          {state === "complete" && (
            <Button onClick={handleClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({
  label,
  value,
  className = "",
}: {
  label: string;
  value: number | string;
  className?: string;
}) {
  return (
    <div className={`border rounded-lg p-3 ${className}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
