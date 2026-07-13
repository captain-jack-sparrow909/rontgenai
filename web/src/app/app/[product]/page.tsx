import { notFound, redirect } from "next/navigation";
import { ProductPlaceholder } from "@/components/app/product-placeholder";
import { availableProducts, getProduct } from "@/lib/products";

const DEDICATED = new Set(["blueprint", "pulse", "atlas", "sentinel"]);

export function generateStaticParams() {
  return availableProducts
    .filter((p) => !DEDICATED.has(p.slug))
    .map((p) => ({ product: p.slug }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ product: string }>;
}) {
  const { product: slug } = await params;

  if (slug === "blueprint") redirect("/app/blueprint");
  if (slug === "pulse") redirect("/app/pulse");
  if (slug === "atlas") redirect("/app/atlas");
  if (slug === "sentinel") redirect("/app/sentinel");

  const product = getProduct(slug);

  if (!product || product.status !== "available") {
    notFound();
  }

  return <ProductPlaceholder product={product} />;
}
