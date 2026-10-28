import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/products/ProductExperience";
import { getProduct, isProductSection, PRODUCT_SECTIONS, PRODUCT_SLUGS } from "@/lib/products/catalog";
import { defaultProductDomain, productFromHost } from "@/lib/products/subdomains";

type PageProps = { params: Promise<{ product: string; section: string }> };

export function generateStaticParams() {
  return PRODUCT_SLUGS.flatMap((product) => PRODUCT_SECTIONS.map((section) => ({ product, section })));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { product: slug, section } = await params;
  const product = getProduct(slug);
  if (!product || !isProductSection(section)) return { title: "Page not found" };
  const title = section[0]!.toUpperCase() + section.slice(1);
  return {
    title: title + " — Linora " + product.name,
    description: product.description,
  };
}

export default async function ProductInformationPage({ params }: PageProps) {
  const { product: slug, section } = await params;
  const product = getProduct(slug);
  if (!product || !isProductSection(section)) notFound();
  const incoming = await headers();
  const current = productFromHost(incoming.get("host"), defaultProductDomain());
  return <ProductDetail product={product} section={section} branded={current?.slug === product.slug} />;
}
