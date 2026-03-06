import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/agents/pipeline";

export const maxDuration = 300; // 5 min timeout for long-running pipeline

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    // Run pipeline asynchronously
    runPipeline(jobId).catch((error) => {
      console.error(`Pipeline failed for job ${jobId}:`, error);
    });

    return NextResponse.json({ status: "started", jobId });
  } catch (error) {
    console.error("Pipeline trigger error:", error);
    return NextResponse.json(
      { error: "Failed to start pipeline" },
      { status: 500 }
    );
  }
}
