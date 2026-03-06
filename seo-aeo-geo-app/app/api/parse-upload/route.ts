import { NextRequest, NextResponse } from "next/server";
import { callClaude, extractTextContent, parseJsonFromResponse } from "@/lib/claude";

const EXTRACTION_PROMPT = `Extract the following fields from this client brief document. Return valid JSON only, no markdown.
{
  "client_name": "",
  "website_url": "",
  "business_type": "",
  "industry": "",
  "target_geography": [],
  "primary_goal": "",
  "competitors": [{"name": "", "url": ""}],
  "target_keywords": [{"keyword": "", "priority": "medium"}],
  "gbp_status": "",
  "gbp_url": "",
  "review_count": null,
  "average_rating": null,
  "analytics": {"monthly_organic": null, "conversion_rate": null, "top_landing_pages": ""},
  "pain_points": "",
  "cms_platform": "",
  "previous_seo": "",
  "budget": "",
  "additional_context": ""
}

Extract all available information. Use null for fields not mentioned. For target_geography, return as an array if multiple areas. For keywords, infer priority based on emphasis in the document.`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Read file content
    const text = await file.text();

    // Use Claude to extract structured data
    const response = await callClaude({
      model: "claude-sonnet-4-20250514",
      maxTokens: 4000,
      messages: [
        {
          role: "user",
          content: `${EXTRACTION_PROMPT}\n\n---\n\nDocument content:\n${text}`,
        },
      ],
    });

    const responseText = extractTextContent(response);
    const extracted = parseJsonFromResponse(responseText);

    return NextResponse.json(extracted);
  } catch (error) {
    console.error("Upload parsing error:", error);
    return NextResponse.json(
      { error: "Failed to parse uploaded document" },
      { status: 500 }
    );
  }
}
