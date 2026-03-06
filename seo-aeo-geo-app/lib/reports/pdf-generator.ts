import jsPDF from "jspdf";

type JobData = Record<string, unknown>;

export async function generatePdfReport(job: JobData): Promise<Buffer> {
  const doc = new jsPDF();
  const client = job.clients as Record<string, unknown>;
  const clientName = (client?.name as string) || "Client";
  const websiteUrl = (client?.website_url as string) || "";
  const crawlResults = job.site_crawl_results as Record<string, unknown>;
  const pages = ((crawlResults?.pages || []) as Array<Record<string, unknown>>);

  let y = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  function addPage() {
    doc.addPage();
    y = 20;
  }

  function checkSpace(needed: number) {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) {
      addPage();
    }
  }

  // Cover page
  doc.setFontSize(32);
  doc.setTextColor(37, 99, 235);
  y = 80;
  doc.text("SEO / AEO / GEO", pageWidth / 2, y, { align: "center" });
  y += 15;
  doc.setFontSize(22);
  doc.setTextColor(51, 65, 133);
  doc.text("Optimization Report", pageWidth / 2, y, { align: "center" });
  y += 30;
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(clientName, pageWidth / 2, y, { align: "center" });
  y += 10;
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text(websiteUrl, pageWidth / 2, y, { align: "center" });
  y += 8;
  doc.text(new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), pageWidth / 2, y, { align: "center" });

  // Executive Summary
  addPage();
  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235);
  doc.text("1. Executive Summary", margin, y);
  y += 12;

  const avgScore = pages.length
    ? Math.round(pages.reduce((s, p) => s + ((p.health_score as number) || 0), 0) / pages.length)
    : 0;

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const summaryLines = doc.splitTextToSize(
    `This report provides a comprehensive SEO, AEO, and GEO audit for ${clientName}. ` +
    `${pages.length} pages were audited with an average health score of ${avgScore}/100.`,
    contentWidth
  );
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 6 + 10;

  // Page scores overview
  checkSpace(30);
  doc.setFontSize(14);
  doc.setTextColor(37, 99, 235);
  doc.text("Page Health Scores", margin, y);
  y += 10;

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  for (const page of pages) {
    checkSpace(8);
    const score = (page.health_score as number) || 0;
    const color = score >= 80 ? [16, 185, 129] : score >= 60 ? [245, 158, 11] : [239, 68, 68];
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(`${score}/100`, margin, y);
    doc.setTextColor(0, 0, 0);
    doc.text(`  ${page.url}`, margin + 20, y);
    y += 6;
  }

  // Technical flags
  const techFlags = (crawlResults?.technical_flags || []) as Array<Record<string, unknown>>;
  if (techFlags.length) {
    checkSpace(30);
    y += 10;
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.text("Technical Issues", margin, y);
    y += 10;

    doc.setFontSize(9);
    for (const flag of techFlags) {
      checkSpace(8);
      const severity = flag.severity as string;
      const color = severity === "critical" ? [239, 68, 68] : severity === "high" ? [245, 158, 11] : [100, 116, 139];
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(`[${severity.toUpperCase()}]`, margin, y);
      doc.setTextColor(0, 0, 0);
      const issueLines = doc.splitTextToSize(`${flag.issue}: ${flag.fix}`, contentWidth - 30);
      doc.text(issueLines, margin + 30, y);
      y += issueLines.length * 5 + 3;
    }
  }

  const pdfBuffer = doc.output("arraybuffer");
  return Buffer.from(pdfBuffer);
}
