import { NextRequest, NextResponse } from "next/server";
import { callClaude, extractTextContent, parseJsonFromResponse } from "@/lib/claude";

export const dynamic = "force-dynamic";

const EXTRACTION_PROMPT = `You are a document parsing assistant. Extract client brief information from the uploaded document and return it as structured JSON.

Return a JSON object with EXACTLY this structure (use empty strings or empty arrays for fields not found in the document — NEVER omit a field):

{
  "client_name": "",
  "website_url": "",
  "business_type": "",
  "industry": "One of: Home Services, Legal, Medical / Healthcare, E-commerce, SaaS, Restaurant / Hospitality, Real Estate, Automotive, Financial Services, Education, Construction, Other",
  "target_geography": "",
  "primary_goal": "One of: leads, sales, calls, foot_traffic, brand_awareness",
  "cms_platform": "One of: WordPress, Shopify, Squarespace, Wix, Webflow, Custom, Other, Unknown",
  "competitors": [
    { "url": "", "name": "" }
  ],
  "keywords": [
    { "keyword": "", "priority": "high or medium or low" }
  ],
  "gbp": {
    "claimed": "yes or no or unknown",
    "url": "",
    "reviewCount": "",
    "avgRating": ""
  },
  "analytics": {
    "monthlyTraffic": "",
    "conversionRate": "",
    "topLandingPages": ""
  },
  "pain_points": "",
  "previous_seo": "",
  "budget": ""
}

RULES:
1. Extract ALL available information from the document
2. For industry, map to the closest match from the allowed values
3. For primary_goal, infer from context if not explicitly stated
4. For keywords, infer priority from emphasis/context in the document
5. Return ONLY valid JSON — no markdown, no preamble
6. All fields MUST be present`;

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Supported MIME types
const SUPPORTED_TYPES = new Set([
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
]);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 10MB.` },
        { status: 400 }
      );
    }

    // Read file as text (works for .txt, .csv, .json, .md)
    // For .docx/.pdf, Claude can still extract from the raw text representation
    let text: string;
    try {
      text = await file.text();
    } catch {
      return NextResponse.json(
        { error: "Could not read file content. Try a .txt, .csv, or .json file." },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: "File appears to be empty" },
        { status: 400 }
      );
    }

    // Truncate very long documents to stay within token limits
    const maxChars = 50000;
    const truncated = text.length > maxChars
      ? text.substring(0, maxChars) + "\n\n[Document truncated — remaining content omitted]"
      : text;

    console.log(`[Parse Upload] Processing file: ${file.name} (${(file.size / 1024).toFixed(1)}KB, ${text.length} chars)`);

    const response = await callClaude({
      model: "claude-haiku-4-5-20251001", // Fast and cheap for extraction
      maxTokens: 4096,
      messages: [
        {
          role: "user",
          content: `${EXTRACTION_PROMPT}\n\n---\n\nFile name: ${file.name}\nFile type: ${file.type || "unknown"}\n\nDocument content:\n${truncated}`,
        },
      ],
    });

    const responseText = extractTextContent(response);
    const stopReason = (response as Record<string, unknown>).stop_reason as string | undefined;
    const extracted = parseJsonFromResponse(responseText, stopReason);

    console.log(`[Parse Upload] Successfully extracted data from: ${file.name}`);

    return NextResponse.json(extracted);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Parse Upload] Error: ${msg}`);
    return NextResponse.json(
      { error: `Failed to parse document: ${msg}` },
      { status: 500 }
    );
  }
}
