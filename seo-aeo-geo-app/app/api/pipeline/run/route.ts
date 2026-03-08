import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/agents/pipeline";
import { getServiceClient } from "@/lib/supabase";

export const maxDuration = 300; // 5 min timeout for long-running pipeline

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    // Run pipeline asynchronously — catch errors and persist them to the job
    runPipeline(jobId).catch(async (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Pipeline failed for job ${jobId}:`, msg);
      try {
        const supabase = getServiceClient();
        // Mark job as failed so the UI can show the error
        await supabase
          .from("audit_jobs")
          .update({
            status: "failed",
            error_message: msg,
            current_step: "Pipeline crashed — see error below",
          })
          .eq("id", jobId);
        // Also write a log entry so it shows in the live output
        await supabase.from("audit_logs").insert({
          job_id: jobId,
          level: "error",
          message: `Pipeline crashed: ${msg}`,
          agent: null,
          detail: null,
          page_url: null,
        });
      } catch (dbError) {
        console.error("Failed to update job status after pipeline crash:", dbError);
      }
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
