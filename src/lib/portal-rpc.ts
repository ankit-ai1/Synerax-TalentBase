/**
 * Browser helper: same shape as supabase.rpc() ({ data, error }) but runs through /api/account/action
 * so the server can send the matching emails and notifications.
 */
export async function portalRpc<T = unknown>(action: string, args: Record<string, unknown>): Promise<{ data: T | null; error: { message: string } | null }> {
  try {
    const res = await fetch("/api/account/action", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, args }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) return { data: null, error: { message: out.error ?? "Something went wrong" } };
    return { data: (out.data ?? null) as T, error: null };
  } catch {
    return { data: null, error: { message: "Network error — please try again" } };
  }
}

/** Staff: tell the server something changed so it can email the candidate / client (deduplicated server-side) */
export function staffEvent(type: "stage" | "interview", id: string | null | undefined) {
  if (!id) return;
  fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, id }), keepalive: true }).catch(() => {});
}
