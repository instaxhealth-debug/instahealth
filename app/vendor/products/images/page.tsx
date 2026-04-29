"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, Link as LinkIcon, Download, CheckCircle2, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { BulkFileUpload } from "./BulkFileUpload";
import { CsvUrlImport } from "./CsvUrlImport";

export default function BulkImageImportPage() {
  const { toast } = useToast();

  const downloadUrlTemplate = () => {
    const csv = `sku,imageUrl
ABC123,https://example.com/images/product1.jpg
XYZ789,https://example.com/images/product2.png
DEF456,https://example.com/images/product3.webp`;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product-images-url-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadMappingTemplate = () => {
    const csv = `sku,filename
ABC123,product1.jpg
XYZ789,product2.png
DEF456,product3.webp`;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product-images-mapping-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <Link href="/vendor/products">
        <Button variant="ghost" size="sm" className="rounded-xl">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Products
        </Button>
      </Link>

      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Bulk Image Import</h1>
            <p className="text-gray-600">
              Upload product images in bulk or import via CSV URLs
            </p>
          </div>
          <Badge className="bg-[#41a59b]/10 text-[#41a59b] border-[#41a59b]/30 font-semibold px-3 py-1">
            <ImageIcon className="h-3 w-3 mr-1" />
            Images matched by SKU
          </Badge>
        </div>
      </div>

      {/* Requirements Card */}
      <Card className="bg-gradient-to-br from-blue-50/50 to-teal-50/30 border-[#41a59b]/20 rounded-2xl shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#41a59b]/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-[#41a59b]" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">Before you upload</CardTitle>
              <CardDescription className="text-sm text-gray-600 mt-0.5">
                Important requirements for successful image imports
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="flex gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-[#41a59b] mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Images are matched to products by SKU</p>
                <p className="text-xs text-gray-600 mt-0.5">Ensure your SKUs match exactly with your product database</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-[#41a59b] mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">You can only update images for your own products</p>
                <p className="text-xs text-gray-600 mt-0.5">Vendor authentication ensures product ownership</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-[#41a59b] mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">URLs must use HTTPS</p>
                <p className="text-xs text-gray-600 mt-0.5">HTTP is not allowed for security reasons</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-[#41a59b] mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Supported formats: JPEG, PNG, WebP</p>
                <p className="text-xs text-gray-600 mt-0.5">Recommended for optimal quality and compatibility</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-[#41a59b] mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Maximum file size: 5MB per image</p>
                <p className="text-xs text-gray-600 mt-0.5">Larger files will be rejected automatically</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-[#41a59b] mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Maximum batch size: 10 files per upload</p>
                <p className="text-xs text-gray-600 mt-0.5">For more files, upload in multiple batches</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Mode Tabs */}
      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-12 bg-gray-100 p-1 rounded-xl">
          <TabsTrigger
            value="upload"
            className="gap-2 rounded-lg data-[state=active]:bg-[#41a59b] data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            <Upload className="h-4 w-4" />
            Upload Files
          </TabsTrigger>
          <TabsTrigger
            value="csv"
            className="gap-2 rounded-lg data-[state=active]:bg-[#41a59b] data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            <LinkIcon className="h-4 w-4" />
            Import URLs (CSV)
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Bulk File Upload */}
        <TabsContent value="upload" className="space-y-6">
          <Card className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Upload className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">Upload Image Files</CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    Upload multiple images at once. Files are matched to products by SKU.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Instructions */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">How it works:</h3>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="font-semibold text-[#41a59b] flex-shrink-0">1.</span>
                    <div>
                      <strong className="text-gray-900">Option 1 - Filename = SKU:</strong>
                      <span className="text-gray-600"> Name your files with the product SKU (e.g., </span>
                      <code className="bg-white px-2 py-0.5 rounded border border-gray-200 text-xs font-mono text-gray-900">ABC123.jpg</code>
                      <span className="text-gray-600">)</span>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-[#41a59b] flex-shrink-0">2.</span>
                    <div>
                      <strong className="text-gray-900">Option 2 - CSV Mapping:</strong>
                      <span className="text-gray-600"> Upload a CSV file that maps filenames to SKUs, then upload your images</span>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-[#41a59b] flex-shrink-0">3.</span>
                    <span className="text-gray-600">All images will be uploaded to secure cloud storage and linked to your products</span>
                  </li>
                </ol>

                <div className="pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadMappingTemplate}
                    className="gap-2 rounded-xl"
                  >
                    <Download className="h-4 w-4" />
                    Download CSV Mapping Template
                  </Button>
                </div>
              </div>

              <BulkFileUpload />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: CSV URL Import */}
        <TabsContent value="csv" className="space-y-6">
          <Card className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <LinkIcon className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">Import via CSV URLs</CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    Import product images using a CSV file with HTTPS URLs
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Instructions */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">CSV Format:</h3>
                <div className="bg-white p-4 rounded-lg border border-gray-200 font-mono text-xs text-gray-900 mb-4">
                  <div>sku,imageUrl</div>
                  <div className="text-gray-600">ABC123,https://example.com/images/product1.jpg</div>
                  <div className="text-gray-600">XYZ789,https://example.com/images/product2.png</div>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#41a59b] flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">
                      First row must be headers: <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 text-xs font-mono">sku,imageUrl</code>
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#41a59b] flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">
                      All URLs must start with <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 text-xs font-mono">https://</code>
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#41a59b] flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Local file paths and HTTP URLs will be rejected</span>
                  </div>
                  <div className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#41a59b] flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">
                      Leave <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 text-xs font-mono">imageUrl</code> empty to clear an image (requires confirmation)
                    </span>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadUrlTemplate}
                    className="gap-2 rounded-xl"
                  >
                    <Download className="h-4 w-4" />
                    Download CSV Template
                  </Button>
                </div>
              </div>

              <CsvUrlImport />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
