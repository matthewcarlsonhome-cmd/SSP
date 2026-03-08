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

function formatJsonLd(raw: string): string {
  // Try to pretty-print the JSON-LD
  try {
    const parsed = JSON.parse(raw);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}

function wrapInScriptTag(jsonLd: string): string {
  const formatted = formatJsonLd(jsonLd);
  return `<script type="application/ld+json">\n${formatted}\n</script>`;
}

function getCmsInstructions(cmsPlatform: string | undefined): string {
  const cms = (cmsPlatform || "").toLowerCase();

  if (cms.includes("wordpress")) {
    return `## WordPress Installation

### Option A: Using Yoast SEO / Rank Math (Recommended)
1. Install "Rank Math" or "Yoast SEO" plugin if not already installed
2. For site-wide schemas (Organization, WebSite): Go to **Rank Math → Titles & Meta → Local SEO** or **Yoast → Search Appearance → Organization**
3. For per-page schemas: Edit each page → scroll to the SEO plugin section → click **Schema** tab → choose "Custom Schema" → paste the JSON-LD code

### Option B: Manual Theme Editing
1. Go to **Appearance → Theme File Editor** (or edit via FTP)
2. Open \`header.php\` (or your theme's header template)
3. Paste site-wide schema code blocks just before the \`</head>\` tag
4. For per-page schema, use a plugin like "Insert Headers and Footers" or "Header Footer Code Manager"

### Option C: Using a Schema Plugin
1. Install "Schema Pro" or "WP Schema" plugin
2. Go to the plugin settings
3. Use "Custom Schema" to paste JSON-LD for each page type`;
  }

  if (cms.includes("shopify")) {
    return `## Shopify Installation

### Site-Wide Schemas (Organization, WebSite, BreadcrumbList)
1. Go to **Online Store → Themes → Actions → Edit Code**
2. Open \`theme.liquid\`
3. Paste all site-wide schema \`<script>\` blocks just before the \`</head>\` tag
4. Click **Save**

### Per-Page Schemas (Service, FAQPage, Product)
1. Go to **Online Store → Themes → Actions → Edit Code**
2. For product schemas: Edit \`product.liquid\` or \`main-product.liquid\`
3. For collection pages: Edit \`collection.liquid\`
4. For custom pages: Edit the page template or use the Custom Liquid section
5. Paste the schema \`<script>\` block within the template

### Alternative: Use an App
Install "JSON-LD for SEO" app from the Shopify App Store for automatic schema generation`;
  }

  if (cms.includes("squarespace")) {
    return `## Squarespace Installation

### Site-Wide Schemas
1. Go to **Settings → Advanced → Code Injection**
2. In the **Header** code injection area, paste all site-wide schema \`<script>\` blocks
3. Click **Save**

### Per-Page Schemas
1. Open the specific page in the editor
2. Click the **gear icon** (⚙️) for page settings
3. Go to the **Advanced** tab
4. In the **Page Header Code Injection** area, paste the page-specific schema \`<script>\` block
5. Click **Save**`;
  }

  if (cms.includes("wix")) {
    return `## Wix Installation

### Site-Wide Schemas
1. Go to **Settings → Custom Code** (or **Marketing & SEO → Custom Code**)
2. Click **+ Add Custom Code**
3. Paste the schema \`<script>\` block
4. Set placement to **Head**, apply to **All pages**
5. Click **Apply**

### Per-Page Schemas
1. Go to **Settings → Custom Code**
2. Click **+ Add Custom Code**
3. Paste the page-specific schema \`<script>\` block
4. Set placement to **Head**, choose **Specific pages** and select the page
5. Click **Apply**`;
  }

  // Generic / Unknown CMS
  return `## Installation Instructions (Generic)

### Site-Wide Schemas
Add these schema \`<script>\` blocks to the \`<head>\` section of your site's main template or layout file.

### Per-Page Schemas
Add the page-specific schema \`<script>\` block to the \`<head>\` section of each individual page.

### Common Methods:
- **Static HTML:** Add directly in the \`<head>\` of each .html file
- **Template systems:** Add to your base layout template for site-wide, or page templates for per-page
- **CMS with code injection:** Use the "header code" or "custom code" settings
- **Tag Manager:** Add via Google Tag Manager as a Custom HTML tag (set trigger to specific pages)

### Validation
After deploying, test each page at:
- Google Rich Results Test: https://search.google.com/test/rich-results
- Schema.org Validator: https://validator.schema.org/`;
}

export async function generateSchemaPackage(job: JobData): Promise<Buffer> {
  const zip = new JSZip();
  const client = job.clients as Record<string, unknown>;
  const brief = job.input_brief as Record<string, unknown> | undefined;
  const clientName = (client?.name as string) || "Client";
  const cmsPlatform = (brief?.cms_platform as string) || (client as Record<string, unknown>)?.cms_platform as string | undefined;
  const pageOptimizations = (job.page_optimizations || []) as Array<Record<string, unknown>>;

  const schemaFolder = zip.folder("schema-code")!;
  const siteWideFolder = schemaFolder.folder("site-wide")!;
  const pagesFolder = schemaFolder.folder("pages")!;

  const siteWideAdded = new Set<string>();

  // Generate per-page schema files
  for (const page of pageOptimizations) {
    const schemaCode = page.schema_code as Array<{ type: string; json_ld: string }>;
    if (!schemaCode?.length) continue;

    const pageUrl = page.url as string;
    const pageName = sanitizeFilename(pageUrl);
    const pageDir = pagesFolder.folder(pageName)!;

    const pageSchemas: string[] = [];

    for (const schema of schemaCode) {
      const siteWideTypes = ["Organization", "WebSite", "BreadcrumbList"];
      const isSiteWide = siteWideTypes.some((t) =>
        schema.type.toLowerCase().includes(t.toLowerCase())
      );

      const formatted = formatJsonLd(schema.json_ld);
      const wrapped = wrapInScriptTag(schema.json_ld);
      const schemaFilename = `${schema.type.toLowerCase().replace(/\s+/g, "-")}.json`;
      const wrappedFilename = `${schema.type.toLowerCase().replace(/\s+/g, "-")}-ready.html`;

      if (isSiteWide) {
        if (!siteWideAdded.has(schema.type)) {
          siteWideAdded.add(schema.type);
          siteWideFolder.file(schemaFilename, formatted);
          siteWideFolder.file(wrappedFilename, wrapped);
        }
      } else {
        pageDir.file(schemaFilename, formatted);
        pageDir.file(wrappedFilename, wrapped);
        pageSchemas.push(wrapped);
      }
    }

    // Create a combined file with all schemas for this page
    if (pageSchemas.length > 0) {
      pageDir.file("all-schemas-combined.html",
        `<!-- Schema markup for ${pageUrl} -->\n<!-- Paste all of these into the <head> of this page -->\n\n${pageSchemas.join("\n\n")}`
      );
    }
  }

  // Create combined site-wide file
  const siteWideSchemas: string[] = [];
  siteWideFolder.forEach((relativePath, file) => {
    if (relativePath.endsWith("-ready.html")) {
      // We'll read these after generation
    }
  });
  // Regenerate combined from pageOptimizations
  const siteWideTypes = new Map<string, string>();
  for (const page of pageOptimizations) {
    const schemaCode = page.schema_code as Array<{ type: string; json_ld: string }>;
    if (!schemaCode?.length) continue;
    for (const schema of schemaCode) {
      if (["Organization", "WebSite", "BreadcrumbList"].some(t =>
        schema.type.toLowerCase().includes(t.toLowerCase())
      )) {
        if (!siteWideTypes.has(schema.type)) {
          siteWideTypes.set(schema.type, wrapInScriptTag(schema.json_ld));
        }
      }
    }
  }
  if (siteWideTypes.size > 0) {
    siteWideFolder.file("all-site-wide-combined.html",
      `<!-- Site-wide schema markup -->\n<!-- Add these to your main template/layout <head> section -->\n\n${[...siteWideTypes.values()].join("\n\n")}`
    );
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

  // Generate README with CMS-specific instructions
  const readme = `# Schema Code Package — ${clientName}

${getCmsInstructions(cmsPlatform)}

---

## File Structure

\`\`\`
schema-code/
├── site-wide/                    ← Add to EVERY page (main template)
│   ├── *.json                    ← Raw JSON-LD (for reference)
│   ├── *-ready.html              ← Ready-to-paste <script> blocks
│   └── all-site-wide-combined.html ← All site-wide schemas in one file
├── pages/
│   └── [page-name]/
│       ├── *.json                ← Raw JSON-LD per schema type
│       ├── *-ready.html          ← Ready-to-paste <script> blocks
│       └── all-schemas-combined.html ← All schemas for this page
├── llms.txt                      ← AI crawler guidance (place at site root)
└── README.md                     ← This file
\`\`\`

## Quick Start

1. **Site-wide schemas first:** Open \`site-wide/all-site-wide-combined.html\`, copy the entire contents, and add to your main template's \`<head>\`
2. **Per-page schemas:** For each page folder in \`pages/\`, open \`all-schemas-combined.html\` and paste into that page's \`<head>\`
3. **llms.txt:** Upload to your site root (e.g., https://example.com/llms.txt)
4. **Validate:** Test each page at https://search.google.com/test/rich-results
5. **Submit sitemap:** Resubmit your sitemap in Google Search Console after deploying

## Validation Tools

- Google Rich Results Test: https://search.google.com/test/rich-results
- Schema.org Validator: https://validator.schema.org/
- Schema Markup Validator: https://validator.schema.org/
`;

  schemaFolder.file("README.md", readme);

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return Buffer.from(buffer);
}
