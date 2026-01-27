import { NextResponse } from "next/server";
import { getProductsFromPrisma } from "@/lib/api/products";

export async function GET() {
  try {
    const products = await getProductsFromPrisma();
    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
