import JSZip from "jszip";

type JobData = Record<string, unknown>;

function sanitizeFilename(url: string): string {
  return url
    .replace(/https?:\/\//, "")
    .replace(/[^a-zA-Z0-9-_/]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/\//g, "-")
    || "page";
}

export async function generateSchemaPackage(job: JobData): Promise<Buffer> {
  const zip = new JSZip();
  const client = job.clients as Record<string, unknown>;
  const clientName = (client?.name as string) || "Client";
  const pageOptimizations = (job.page_optimizations || []) as Array<Record<string, unknown>>;

  const schemaFolder = zip.folder("schema-code")!;
  const siteWideFolder = schemaFolder.folder("site-wide")!;

  // Generate per-page schema files
  for (const page of pageOptimizations) {
    const schemaCode = page.schema_code as Array<{ type: string; json_ld: string }>;
    if (!schemaCode?.length) continue;

    const pageUrl = page.url as string;
    const filename = sanitizeFilename(pageUrl);

    // Separate site-wide schemas from page-specific
    for (const schema of schemaCode) {
      const siteWideTypes = ["Organization", "WebSite", "BreadcrumbList"];
      const isSiteWide = siteWideTypes.some((t) =>
        schema.type.toLowerCase().includes(t.toLowerCase())
      );

      const content = schema.json_ld;
      const schemaFilename = `${schema.type.toLowerCase().replace(/\s+/g, "-")}-schema.json`;

      if (isSiteWide) {
        // Only add once
        if (!siteWideFolder.file(schemaFilename)) {
          siteWideFolder.file(schemaFilename, content);
        }
      } else {
        const pageFolder = schemaFolder.folder(filename) || schemaFolder;
        pageFolder.file(schemaFilename, content);
      }
    }
  }

  // Generate llms.txt
  const llmsTxt = `# ${clientName}

## About
${(client?.business_type as string) || "Business"} serving ${(client?.target_geography as string) || "local area"}.

## Services
${pageOptimizations
  .filter((p) => p.page_type === "service")
  .map((p) => `- ${p.primary_keyword || p.url}`)
  .join("\n")}

## Contact
Website: ${(client?.website_url as string) || ""}
`;

  schemaFolder.file("llms.txt", llmsTxt);

  // Generate README.md
  const readme = `# Schema Code Package — ${clientName}

## Installation

Each JSON file contains ready-to-paste JSON-LD structured data.

### How to implement:

1. **WordPress**: Use a plugin like "Schema Pro" or add directly to theme header
2. **Shopify**: Add to theme.liquid before </head>
3. **Any CMS**: Add a <script type="application/ld+json"> tag to each page's <head>

### File Structure:

- \`site-wide/\` — Schema that goes on every page (Organization, BreadcrumbList)
- \`[page-name]/\` — Page-specific schema (Service, FAQPage, etc.)
- \`llms.txt\` — AI crawler guidance file (place at site root)

### Implementation Steps:

1. Start with site-wide schemas — add to every page template
2. Add page-specific schemas to individual pages
3. Place llms.txt at your site root (e.g., https://example.com/llms.txt)
4. Validate with Google's Rich Results Test: https://search.google.com/test/rich-results
5. Submit updated sitemap to Google Search Console

### Validation:

After deploying, test each page at:
- Google Rich Results Test: https://search.google.com/test/rich-results
- Schema.org Validator: https://validator.schema.org/
`;

  schemaFolder.file("README.md", readme);

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return Buffer.from(buffer);
}
