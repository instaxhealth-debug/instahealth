"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, Link as LinkIcon, Download, AlertCircle } from "lucide-react";
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link href="/vendor/products">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Products
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold">Bulk Image Import</h1>
          <p className="text-muted-foreground">
            Upload product images in bulk or import via CSV URLs
          </p>
        </div>
      </div>

      {/* Important Notes */}
      <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                Important Requirements:
              </p>
              <ul className="list-disc list-inside space-y-1 text-yellow-800 dark:text-yellow-200">
                <li>Images are matched to products by <strong>SKU</strong></li>
                <li>You can only update images for your own products</li>
                <li>All URLs must be <strong>HTTPS</strong> (HTTP is not allowed)</li>
                <li>Supported formats: JPEG, PNG, WebP</li>
                <li>Maximum file size: <strong>5MB per image</strong></li>
                <li>Maximum batch size: <strong>100 images at once</strong></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Files
          </TabsTrigger>
          <TabsTrigger value="csv" className="gap-2">
            <LinkIcon className="h-4 w-4" />
            Import URLs (CSV)
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Bulk File Upload */}
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Image Files</CardTitle>
              <CardDescription>
                Upload multiple images at once. Files are matched to products by SKU.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Instructions */}
              <div className="space-y-3 text-sm">
                <h3 className="font-semibold">How it works:</h3>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>
                    <strong>Option 1 - Filename = SKU:</strong> Name your files with the
                    product SKU (e.g., <code className="bg-muted px-1 py-0.5 rounded">ABC123.jpg</code>)
                  </li>
                  <li>
                    <strong>Option 2 - CSV Mapping:</strong> Upload a CSV file that maps
                    filenames to SKUs, then upload your images
                  </li>
                  <li>
                    All images will be uploaded to secure cloud storage and linked to your products
                  </li>
                </ol>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadMappingTemplate}
                    className="gap-2"
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
        <TabsContent value="csv" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import via CSV URLs</CardTitle>
              <CardDescription>
                Import product images using a CSV file with HTTPS URLs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Instructions */}
              <div className="space-y-3 text-sm">
                <h3 className="font-semibold">CSV Format:</h3>
                <div className="bg-muted p-3 rounded-md font-mono text-xs">
                  sku,imageUrl<br />
                  ABC123,https://example.com/images/product1.jpg<br />
                  XYZ789,https://example.com/images/product2.png
                </div>

                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>First row must be headers: <code className="bg-muted px-1 py-0.5 rounded">sku,imageUrl</code></li>
                  <li>All URLs must start with <code className="bg-muted px-1 py-0.5 rounded">https://</code></li>
                  <li>Local file paths and HTTP URLs will be rejected</li>
                  <li>Leave <code className="bg-muted px-1 py-0.5 rounded">imageUrl</code> empty to clear an image (requires confirmation)</li>
                </ul>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadUrlTemplate}
                    className="gap-2"
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
