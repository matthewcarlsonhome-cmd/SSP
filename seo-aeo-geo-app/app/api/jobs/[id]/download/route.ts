import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { generateDocxReport } from "@/lib/reports/docx-generator";
import { generateRoadmapCsv, generateLinkOpportunitiesCsv, generateCitationTasksCsv } from "@/lib/reports/roadmap-csv";
import { generateSchemaPackage } from "@/lib/reports/schema-packager";
import { generateMarkdownReport } from "@/lib/reports/markdown-generator";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const format = request.nextUrl.searchParams.get("format") || "docx";
    const supabase = getServiceClient();

    const { data: job, error } = await supabase
      .from("audit_jobs")
      .select("*, clients(*), page_audits(*), link_opportunities(*), citation_tasks(*)")
      .eq("id", id)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status !== "completed") {
      return NextResponse.json(
        { error: "Audit not yet completed" },
        { status: 400 }
      );
    }

    const client = job.clients as Record<string, unknown>;
    const clientName = (client?.name as string) || "Client";

    switch (format) {
      case "docx": {
        const buffer = await generateDocxReport(job);
        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename="${clientName}-SEO-AEO-GEO-Report.docx"`,
          },
        });
      }
      case "markdown":
      case "md": {
        const markdown = generateMarkdownReport(job);
        return new NextResponse(markdown, {
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Content-Disposition": `attachment; filename="${clientName}-SEO-AEO-GEO-Report.md"`,
          },
        });
      }
      case "csv": {
        const csv = generateRoadmapCsv(job);
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${clientName}-roadmap.csv"`,
          },
        });
      }
      case "links-csv": {
        const csv = generateLinkOpportunitiesCsv(job);
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${clientName}-link-opportunities.csv"`,
          },
        });
      }
      case "citations-csv": {
        const csv = generateCitationTasksCsv(job);
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${clientName}-citation-tasks.csv"`,
          },
        });
      }
      case "schema": {
        const zip = await generateSchemaPackage(job);
        return new NextResponse(new Uint8Array(zip), {
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${clientName}-schema-code.zip"`,
          },
        });
      }
      default:
        return NextResponse.json(
          { error: `Unknown format: ${format}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Failed to generate download" },
      { status: 500 }
    );
  }
}
