import { NextRequest, NextResponse } from "next/server";
import { runVisibilityPrompt, type AuditBusinessProfile, type VisibilityProviderId } from "@/lib/llm-visibility-audit";

export const dynamic = "force-dynamic";

const envByProvider: Record<VisibilityProviderId, string[]> = {
  chatgpt: ["OPENAI_API_KEY"],
  claude: ["ANTHROPIC_API_KEY"],
  gemini: ["GOOGLE_AI_API_KEY", "GEMINI_API_KEY"],
  perplexity: ["PERPLEXITY_API_KEY"],
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const provider = body.provider as VisibilityProviderId;
    const prompt = String(body.prompt || "");
    const business = body.business as AuditBusinessProfile;

    if (!provider || !envByProvider[provider]) {
      return NextResponse.json({ error: "Unsupported visibility provider" }, { status: 400 });
    }
    if (!prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const apiKey = envByProvider[provider].map((key) => process.env[key]).find(Boolean) || "";
    if (!apiKey) {
      return NextResponse.json(
        { error: `${provider} API key is not configured server-side. Add the provider key in Render environment variables.` },
        { status: 503 }
      );
    }

    const result = await runVisibilityPrompt({
      provider,
      prompt,
      apiKey,
      business,
      maxTokens: body.maxTokens ? Number(body.maxTokens) : undefined,
    });

    return NextResponse.json({
      ...result,
      cleanContext: true,
      captureMode: "server_api_stateless",
      caveat: "Each provider call is made as a separate stateless API request with no application-side chat history.",
    });
  } catch (error) {
    console.error("LLM visibility provider run failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Provider run failed" }, { status: 500 });
  }
}
