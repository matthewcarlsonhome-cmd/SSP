import { NextRequest, NextResponse } from "next/server";
import { callClaude, extractTextContent, parseJsonFromResponse } from "@/lib/claude";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are a business research assistant. Given a website URL, use web search to visit the site and research the business thoroughly.

Return a JSON object with EXACTLY this structure (use empty strings or empty arrays for fields you cannot determine — NEVER omit a field):

{
  "client_name": "The business/company name",
  "business_type": "What the business does (e.g. 'Pool construction & renovation', 'Personal injury law firm')",
  "industry": "One of: Home Services, Legal, Medical / Healthcare, E-commerce, SaaS, Restaurant / Hospitality, Real Estate, Automotive, Financial Services, Education, Construction, Other",
  "target_geography": "City/region the business serves (e.g. 'Houston, TX metro area')",
  "primary_goal": "One of: leads, sales, calls, foot_traffic, brand_awareness — pick the most likely for this business type",
  "cms_platform": "One of: WordPress, Shopify, Squarespace, Wix, Webflow, Custom, Other, Unknown",
  "competitors": [
    { "url": "https://competitor1.com", "name": "Competitor 1 Name" },
    { "url": "https://competitor2.com", "name": "Competitor 2 Name" },
    { "url": "https://competitor3.com", "name": "Competitor 3 Name" }
  ],
  "keywords": [
    { "keyword": "primary keyword phrase", "priority": "high" },
    { "keyword": "secondary keyword phrase", "priority": "high" },
    { "keyword": "related keyword", "priority": "medium" },
    { "keyword": "long-tail keyword", "priority": "medium" },
    { "keyword": "local keyword variation", "priority": "medium" }
  ],
  "gbp": {
    "claimed": "yes or no or unknown",
    "url": "Google Business Profile URL if found, otherwise empty string",
    "reviewCount": "number as string, or empty string",
    "avgRating": "number as string (e.g. '4.5'), or empty string"
  },
  "pain_points": "Brief analysis of visible SEO issues from looking at the site (missing meta tags, no schema, thin content, etc.)"
}

CRITICAL RULES:
1. Search the web to find the actual website and analyze it
2. Search for the business name + city to find their Google Business Profile
3. Search for competitors in their industry and geography
4. Suggest 5 realistic SEO keywords based on their business type and location
5. Return ONLY valid JSON — no markdown, no preamble, no explanation
6. For CMS detection, look at page source indicators (wp-content = WordPress, myshopify = Shopify, etc.)
7. For competitors, search for businesses offering the same services in the same area
8. All fields MUST be present in the response`;

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    console.log(`[Autopopulate] Researching business at: ${normalizedUrl}`);

    const response = await callClaude({
      model: "claude-haiku-4-5-20251001", // Haiku is fine for research — fast and cheap
      maxTokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 5,
        },
      ],
      messages: [
        {
          role: "user",
          content: `Research this business website and return the structured JSON data: ${normalizedUrl}`,
        },
      ],
    });

    const text = extractTextContent(response);
    const stopReason = (response as Record<string, unknown>).stop_reason as string | undefined;
    const data = parseJsonFromResponse(text, stopReason);

    console.log(`[Autopopulate] Successfully extracted data for: ${normalizedUrl}`);

    return NextResponse.json(data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Autopopulate] Error: ${msg}`);
    return NextResponse.json(
      { error: `Failed to research business: ${msg}` },
      { status: 500 }
    );
  }
}
