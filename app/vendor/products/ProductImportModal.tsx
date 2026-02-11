"use client";

import { useState, useRef } from "react";
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
import { Upload, Download, AlertCircle, CheckCircle2 } from "lucide-react";

interface PreviewRow {
  rowIndex: number;
  isValid: boolean;
  errors: string[];
  action: "create" | "update";
  data: { sku?: string; name: string; category: string; priceFils: number };
}

interface PreviewData {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  counts: { willCreate: number; willUpdate: number };
  rows: PreviewRow[];
}

interface ImportResult {
  ok: boolean;
  requestId: string;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}

type State = "initial" | "uploading" | "preview" | "importing" | "complete";

export function ProductImportModal() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>("initial");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  function reset() {
    setState("initial");
    setFile(null);
    setPreview(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    setFile(f);
    setState("uploading");

    try {
      const formData = new FormData();
      formData.append("file", f);

      const res = await fetch("/api/vendor/products/import/preview", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!data.ok) {
        toast({ title: "Preview failed", description: data.message, variant: "destructive" });
        reset();
        return;
      }

      setPreview(data.preview);
      setState("preview");
    } catch {
      toast({ title: "Network error", description: "Failed to upload file", variant: "destructive" });
      reset();
    }
  }

  async function handleImport() {
    if (!file) return;
    setState("importing");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/vendor/products/import/commit", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!data.ok) {
        toast({ title: "Import failed", description: data.message, variant: "destructive" });
        setState("preview");
        return;
      }

      setResult(data);
      setState("complete");
      toast({
        title: "Import complete",
        description: `Created ${data.created}, updated ${data.updated} products`,
      });
    } catch {
      toast({ title: "Network error", description: "Import request failed", variant: "destructive" });
      setState("preview");
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

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[280px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left w-12">#</th>
                      <th className="px-3 py-2 text-left w-12" />
                      <th className="px-3 py-2 text-left w-16">Action</th>
                      <th className="px-3 py-2 text-left">Name</th>
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
                        <td className="px-3 py-2 truncate max-w-[180px]">{row.data.name}</td>
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
              <StatCard label="Created" value={result.created} className="bg-green-50 text-green-700" />
              <StatCard label="Updated" value={result.updated} className="bg-blue-50 text-blue-700" />
              <StatCard label="Failed" value={result.failed + result.skipped} className="bg-red-50 text-red-700" />
            </div>
            {result.errors.length > 0 && (
              <div className="border rounded-lg p-3 max-h-[150px] overflow-y-auto text-xs space-y-1">
                {result.errors.slice(0, 20).map((e, i) => (
                  <div key={i} className="text-red-600">
                    Row {e.row}: {e.message}
                  </div>
                ))}
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
