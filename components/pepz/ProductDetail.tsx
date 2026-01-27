"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Package, Truck } from "lucide-react";
import { useCartStore } from "@/lib/store/cart-store";
import { useLocationStore } from "@/lib/store/location-store";
import { useToast } from "@/hooks/use-toast";
// Shopify removed - This component replaced by ProductDetailWithVariants
import type { Product } from "@/types";

interface ProductDetailProps {
  slug: string;
}

export function ProductDetail({ slug }: ProductDetailProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCartStore();
  const { address } = useLocationStore();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchProduct() {
      try {
        setIsLoading(true);
        // Shopify removed - TODO: Use Prisma ProductDetailWithVariants instead
        const data = null as any;

        if (!data.product) {
          setProduct(null);
          return;
        }

        const firstVariant = data.product.variants.edges[0]?.node;
        const transformedProduct: Product = {
          id: data.product.id,
          type: "product",
          vertical: "pepz",
          name: data.product.title,
          slug: data.product.handle,
          description: data.product.description || "",
          image: data.product.images.edges[0]?.node.url || "",
          categoryId: data.product.productType || "",
          shopifyProductId: data.product.id,
          shopifyVariantId: firstVariant?.id || "",
          price: parseFloat(firstVariant?.price.amount || "0"),
          currency: firstVariant?.price.currencyCode || "USD",
          inventoryQuantity: firstVariant?.availableForSale ? 999 : 0, // Storefront API doesn't provide exact inventory
          isActive: firstVariant?.availableForSale || false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        setProduct(transformedProduct);
      } catch (error) {
        console.error("Error fetching product:", error);
        setProduct(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProduct();
  }, [slug]);

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, product.shopifyVariantId, quantity);
    toast({
      title: "Added to cart",
      description: `${quantity} x ${product.name} added to your cart`,
    });
  };

  const handleCheckout = () => {
    if (!product) return;
    // Add to cart first, then redirect
    addItem(product, product.shopifyVariantId, quantity);
    window.location.href = `/checkout?product=${product.id}&quantity=${quantity}`;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Skeleton className="aspect-square" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Product not found.</p>
      </div>
    );
  }

  const deliveryETA = address ? "30-45 minutes" : "Select location to see delivery time";
  const stockStatus = product.inventoryQuantity
    ? product.inventoryQuantity > 10
      ? "In stock"
      : `Only ${product.inventoryQuantity} left`
    : "In stock";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="aspect-square bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center">
        <p className="text-muted-foreground">Product Image</p>
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-3xl font-bold">
              {product.currency} {product.price.toFixed(2)}
            </span>
            {product.compareAtPrice && (
              <span className="text-xl text-muted-foreground line-through">
                {product.currency} {product.compareAtPrice.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        <div>
          <p className="text-muted-foreground mb-4">{product.description}</p>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Stock Status</span>
            </div>
            <p className="text-sm text-muted-foreground">{stockStatus}</p>
          </CardContent>
        </Card>

        {address && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Delivery ETA</span>
              </div>
              <p className="text-sm text-muted-foreground">{deliveryETA}</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Quantity:</label>
            <div className="flex items-center gap-2 border border-border/50 rounded-xl">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-l-xl rounded-r-none"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                -
              </Button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-r-xl rounded-l-none"
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </Button>
            </div>
          </div>

          <div className="flex gap-4">
            <Button onClick={handleAddToCart} className="flex-1 rounded-full gap-2" size="lg">
              <ShoppingCart className="h-5 w-5" />
              Add to Cart
            </Button>
            <Button onClick={handleCheckout} variant="outline" className="flex-1 rounded-full" size="lg">
              Buy Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
