"use client";

/**
 * Product Card Component with Shopify Handoff Support
 *
 * Displays products from both native and Shopify sources
 * Handles checkout handoff for external products
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceFils: number;
  imageUrl: string | null;
  category: string;
  source?: string;
  checkoutMode?: string;
  externalCheckoutUrl?: string | null;
  vendor: {
    name: string;
    slug: string;
  };
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const price = `AED ${(product.priceFils / 100).toFixed(2)}`;
  const isExternalCheckout = product.checkoutMode === "handoff" && product.externalCheckoutUrl;

  const handleExternalCheckout = () => {
    if (product.externalCheckoutUrl) {
      window.open(product.externalCheckoutUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <Link href={`/marketplace/${product.vendor.slug}/${product.slug}`}>
        <div className="relative aspect-square w-full bg-gray-100">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No image
            </div>
          )}
          {product.source === "shopify" && (
            <Badge className="absolute top-2 right-2 bg-purple-500">
              Shopify
            </Badge>
          )}
        </div>
      </Link>

      <CardContent className="p-4 space-y-3">
        <div className="space-y-1">
          <Link
            href={`/marketplace/${product.vendor.slug}/${product.slug}`}
            className="hover:underline"
          >
            <h3 className="font-semibold line-clamp-2">{product.name}</h3>
          </Link>
          <p className="text-sm text-muted-foreground">{product.vendor.name}</p>
        </div>

        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {product.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-lg font-bold">{price}</span>
          <Badge variant="outline">{product.category}</Badge>
        </div>

        {isExternalCheckout ? (
          <Button
            onClick={handleExternalCheckout}
            className="w-full"
            variant="default"
          >
            Buy on Shopify
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button asChild className="w-full">
            <Link href={`/marketplace/${product.vendor.slug}/${product.slug}`}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              View Details
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
