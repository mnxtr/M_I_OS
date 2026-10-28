import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ProductLanding } from "@/components/products/ProductExperience";
import { getProduct, PRODUCT_SLUGS } from "@/lib/products/catalog";
import { defaultProductDomain, productFromHost } from "@/lib/products/subdomains";

type PageProps = { params: Promise<{ product: string }> };

export function generateStaticParams() {
  return PRODUCT_SLUGS.map((product) => ({ product }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { product: slug } = await params;
  const product = getProduct(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: "Linora " + product.name + " — " + product.tagline,
    description: product.description,
    openGraph: { title: "Linora " + product.name, description: product.description },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { product: slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();
  const incoming = await headers();
  const current = productFromHost(incoming.get("host"), defaultProductDomain());
  return <ProductLanding product={product} branded={current?.slug === product.slug} />;
}
