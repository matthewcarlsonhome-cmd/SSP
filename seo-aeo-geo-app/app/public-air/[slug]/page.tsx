import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AirDeliverableSnapshot } from "@/components/air/AirDeliverableSnapshot";
import { AirPrintButton } from "@/components/air/AirPrintButton";
import { getServiceClient } from "@/lib/supabase";
import type { AirSnapshotDeliverable } from "@/lib/air/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PublicAirPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = getServiceClient();
  const { data: audit } = await supabase
    .from("air_audits")
    .select("id, status")
    .eq("public_slug", slug)
    .eq("status", "published")
    .single();
  if (!audit) notFound();

  const { data: deliverable } = await supabase
    .from("air_audit_deliverables")
    .select("content")
    .eq("audit_id", audit.id)
    .eq("is_latest", true)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();
  if (!deliverable?.content) notFound();

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 print:bg-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex justify-end print:hidden">
          <AirPrintButton />
        </div>
        <AirDeliverableSnapshot deliverable={deliverable.content as AirSnapshotDeliverable} />
      </div>
    </main>
  );
}
