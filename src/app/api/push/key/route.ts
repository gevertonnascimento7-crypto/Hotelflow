import { NextResponse } from "next/server";
import { getCaller, getVapidKeys, isPushConfigured } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isPushConfigured) return NextResponse.json({ error: "push_not_configured" }, { status: 503 });
  const user = await getCaller(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { publicKey } = await getVapidKeys();
  return NextResponse.json({ publicKey }, { headers: { "cache-control": "no-store" } });
}
