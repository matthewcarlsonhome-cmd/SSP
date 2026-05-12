import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { getServiceClient } from "./supabase";

export async function resolveRequestContext(request: NextRequest, clientId?: string) {
  const service = getServiceClient();
  let userId: string | null = null;
  let organizationId: string | null = null;

  try {
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // Route handlers that only read auth do not need to mutate cookies.
          },
        },
      }
    );
    const { data } = await authClient.auth.getUser();
    userId = data.user?.id || null;
    if (userId) {
      const { data: userRow } = await service
        .from("users")
        .select("organization_id")
        .eq("id", userId)
        .single();
      organizationId = userRow?.organization_id || null;
    }
  } catch {
    // The existing app supports unauthenticated local usage. Fall through to
    // client/default organization resolution for that compatibility path.
  }

  if (!organizationId && clientId) {
    const { data: client } = await service
      .from("clients")
      .select("organization_id")
      .eq("id", clientId)
      .single();
    organizationId = client?.organization_id || null;
  }

  if (!organizationId) {
    const { data: existing } = await service.from("organizations").select("id").limit(1).single();
    if (existing?.id) organizationId = existing.id;
  }

  if (!organizationId) {
    const { data: created, error } = await service
      .from("organizations")
      .insert({ name: "Default Agency" })
      .select("id")
      .single();
    if (error) throw error;
    organizationId = created!.id;
  }

  return { userId, organizationId };
}
