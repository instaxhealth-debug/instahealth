"use client";

import { DeleteProductModal } from "./DeleteProductModal";

interface ProductListActionsProps {
  productId: string;
  productName: string;
}

export function ProductListActions({ productId, productName }: ProductListActionsProps) {
  return (
    <DeleteProductModal
      productId={productId}
      productName={productName}
      redirectAfterDelete={false}
    />
  );
}
