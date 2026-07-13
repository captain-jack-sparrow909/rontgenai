import { notFound, redirect } from "next/navigation";
import { ProductPlaceholder } from "@/components/app/product-placeholder";
import { availableProducts, getProduct } from "@/lib/products";

export function generateStaticParams() {
  return availableProducts
    .filter((p) => p.slug !== "blueprint")
    .map((p) => ({ product: p.slug }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ product: string }>;
}) {
  const { product: slug } = await params;

  // Dedicated Blueprint app lives at /app/blueprint
  if (slug === "blueprint") {
    redirect("/app/blueprint");
  }

  const product = getProduct(slug);

  if (!product || product.status !== "available") {
    notFound();
  }

  return <ProductPlaceholder product={product} />;
}
