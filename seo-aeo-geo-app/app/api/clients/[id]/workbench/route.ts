import { NextRequest, NextResponse } from "next/server";
import { buildClientWorkbench } from "@/lib/client-workbench";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = await buildClientWorkbench(id);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to build client workbench:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build client workbench" },
      { status: error instanceof Error && error.message === "Client not found" ? 404 : 500 }
    );
  }
}
