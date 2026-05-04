import { describe, expect, it } from "vitest";
import {
  buildClientVoiceProfile,
  classifyUrl,
  normalizeAuditUrl,
  parsePageSignals,
  pickAuditUrls,
} from "@/lib/site-crawl/analyzer";

const SAMPLE_HTML = `
<!doctype html>
<html>
  <head>
    <title>Madison HVAC Repair | Reliable Heating</title>
    <meta name="description" content="Licensed HVAC repair, replacement, and maintenance in Madison, WI.">
    <meta name="robots" content="index,follow">
    <link rel="canonical" href="https://example.com/services/hvac-repair">
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": "Reliable Heating",
        "url": "https://example.com",
        "telephone": "608-555-1212",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "123 Main Street",
          "addressLocality": "Madison",
          "addressRegion": "WI"
        }
      }
    </script>
  </head>
  <body>
    <h1>HVAC Repair in Madison, WI</h1>
    <h2>Emergency furnace repair</h2>
    <p>Reliable Heating is a locally owned, licensed and insured HVAC company with 20+ years serving homeowners.</p>
    <p>We provide repair, installation, replacement, maintenance, and emergency service for Madison, WI families.</p>
    <p>Call 608-555-1212 or contact our team to schedule a free estimate.</p>
    <p>What should I do if my furnace stops working?</p>
    <a href="/contact">Contact</a>
    <a href="https://vendor.example.com">Vendor</a>
    <img src="/truck.jpg" alt="Reliable Heating service truck">
    <img src="/team.jpg">
  </body>
</html>`;

describe("site crawl analyzer", () => {
  it("normalizes and classifies priority URLs", () => {
    expect(normalizeAuditUrl("example.com")).toBe("https://example.com");
    expect(classifyUrl("https://example.com/services/hvac-repair")).toBe("service");
    expect(classifyUrl("https://example.com/service-area/madison")).toBe("location");
    expect(classifyUrl("https://example.com/privacy-policy")).toBe("legal");
  });

  it("selects budgeted same-domain URLs by audit value", () => {
    const selected = pickAuditUrls(
      [
        { url: "https://example.com/privacy-policy", title: "Privacy" },
        { url: "https://example.com/services/hvac-repair", title: "HVAC Repair" },
        { url: "https://example.com/service-area/madison", title: "Madison Service Area" },
        { url: "https://other.com/services/hvac-repair", title: "External" },
      ],
      "https://example.com",
      3
    );

    expect(selected.map((item) => item.pageType)).toEqual(["home", "service", "location"]);
    expect(selected.every((item) => item.url.startsWith("https://example.com"))).toBe(true);
  });

  it("parses deterministic SEO, schema, NAP, and answer-ready signals", () => {
    const parsed = parsePageSignals({
      url: "https://example.com/services/hvac-repair",
      html: SAMPLE_HTML,
      rawHtml: SAMPLE_HTML,
      markdown:
        "Reliable Heating is a locally owned, licensed and insured HVAC company with 20+ years serving homeowners.",
      statusCode: 200,
    });

    expect(parsed.title).toBe("Madison HVAC Repair | Reliable Heating");
    expect(parsed.description).toContain("Licensed HVAC repair");
    expect(parsed.canonicalUrl).toBe("https://example.com/services/hvac-repair");
    expect(parsed.indexabilityStatus).toBe("indexable");
    expect(parsed.pageType).toBe("service");
    expect(parsed.h1).toBe("HVAC Repair in Madison, WI");
    expect(parsed.schemaItems[0].type).toBe("LocalBusiness");
    expect(parsed.schemaItems[0].warnings).toContain("Missing sameAs links.");
    expect(parsed.napSignals.phones).toContain("608-555-1212");
    expect(parsed.images).toEqual({ total: 2, withAlt: 1, withoutAlt: 1 });
    expect(parsed.faqQuestions).toContain("What should I do if my furnace stops working?");
    expect(parsed.internalLinks.length).toBe(1);
    expect(parsed.externalLinks.length).toBe(1);
  });

  it("builds a compact client voice profile from parsed pages", () => {
    const parsed = parsePageSignals({
      url: "https://example.com/services/hvac-repair",
      html: SAMPLE_HTML,
      rawHtml: SAMPLE_HTML,
      markdown:
        "Reliable Heating is a locally owned, licensed and insured HVAC company with 20+ years serving homeowners. We offer repair and emergency service.",
      statusCode: 200,
    });
    const markdownByUrl = new Map([[parsed.url, "Reliable Heating is locally owned and trusted. Call today for a free estimate."]]);
    const profile = buildClientVoiceProfile([parsed], markdownByUrl);

    expect(profile.tone).toMatch(/local|trust/);
    expect(profile.services).toContain("repair");
    expect(profile.ctas).toContain("call");
    expect(profile.proofPoints).toEqual(expect.arrayContaining(["locally owned"]));
  });
});
