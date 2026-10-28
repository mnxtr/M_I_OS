#!/usr/bin/env node
/**
 * Read-only public product route smoke test for an already authorized,
 * reachable deployment. Does not handle authentication or customer data.
 *
 * Usage: node apps/web/scripts/verify-product-sites.mjs https://preview.example.vercel.app
 */
const slugs = ["ask", "knowledge", "compliance", "analytics", "quality", "operations", "connect"];
const sections = ["about", "platform", "trust", "demo"];

const base = process.argv[2];
if (!base) {
  process.stderr.write("Usage: node apps/web/scripts/verify-product-sites.mjs https://<authorized-host>\n");
  process.exit(2);
}

let origin;
try {
  const url = new URL(base);
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) ||
    url.pathname !== "/" || url.search || url.hash || url.username || url.password
  ) throw new Error("Invalid origin");
  origin = url.origin;
} catch {
  process.stderr.write("Expected an HTTPS origin, or localhost HTTP for development, without credentials or paths.\n");
  process.exit(2);
}

const paths = [
  "/products",
  ...slugs.flatMap((slug) => ["/products/" + slug, ...sections.map((section) => "/products/" + slug + "/" + section)]),
];
let failures = 0;
for (const path of paths) {
  try {
    const response = await fetch(origin + path, {
      method: "GET",
      headers: { accept: "text/html" },
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    const contentType = response.headers.get("content-type") || "";
    const valid = response.status === 200 && contentType.includes("text/html");
    process.stdout.write((valid ? "PASS " : "FAIL ") + response.status + " " + path + "\n");
    if (!valid) failures++;
  } catch (error) {
    failures++;
    process.stderr.write("FAIL " + path + " " + (error instanceof Error ? error.message : "network error") + "\n");
  }
}
process.stdout.write("\n" + (paths.length - failures) + "/" + paths.length + " public pages responded correctly.\n");
if (failures) process.exitCode = 1;
