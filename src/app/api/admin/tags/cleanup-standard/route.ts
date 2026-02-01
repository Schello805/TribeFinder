import { requireAdminSession } from "@/lib/requireAdmin";
import { jsonError, jsonUnauthorized } from "@/lib/apiResponse";

// Endpoint is disabled - no cleanup needed

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  return jsonError("Endpoint deaktiviert", 410);
}

export async function POST() {
  const session = await requireAdminSession();
  if (!session) return jsonUnauthorized();

  return jsonError("Endpoint deaktiviert", 410);
}
