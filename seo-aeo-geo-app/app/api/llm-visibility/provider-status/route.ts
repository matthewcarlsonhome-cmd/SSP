import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    chatgpt: Boolean(process.env.OPENAI_API_KEY),
    claude: Boolean(process.env.ANTHROPIC_API_KEY),
    gemini: Boolean(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY),
    perplexity: Boolean(process.env.PERPLEXITY_API_KEY),
    firecrawl: Boolean(process.env.FIRECRAWL_API_KEY),
    mode: "server",
  });
}
