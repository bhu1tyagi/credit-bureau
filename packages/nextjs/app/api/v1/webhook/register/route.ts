import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServerClient } from "~~/lib/supabase/server";

const VALID_EVENTS = ["score_change", "liquidation", "attestation_expired", "attestation_created"];

export async function POST(request: NextRequest) {
  let body: { url?: string; events?: string[] };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "INVALID_BODY", message: "Invalid JSON body" } }, { status: 400 });
  }

  const { url, events } = body;

  if (!url) {
    return NextResponse.json({ error: { code: "MISSING_PARAM", message: "url is required" } }, { status: 400 });
  }

  // Validate URL
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: { code: "INVALID_URL", message: "Invalid webhook URL" } }, { status: 400 });
  }

  if (!events || !Array.isArray(events) || events.length === 0) {
    return NextResponse.json(
      { error: { code: "MISSING_PARAM", message: "events array is required" } },
      { status: 400 },
    );
  }

  // Validate event types
  const invalidEvents = events.filter(e => !VALID_EVENTS.includes(e));
  if (invalidEvents.length > 0) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_EVENTS",
          message: `Invalid events: ${invalidEvents.join(", ")}. Valid: ${VALID_EVENTS.join(", ")}`,
        },
      },
      { status: 400 },
    );
  }

  try {
    const supabase = createServerClient();
    const secret = crypto.randomBytes(32).toString("hex");

    const { data, error } = await supabase
      .from("webhooks")
      .insert({
        url,
        events,
        secret,
        active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      id: data.id,
      url: data.url,
      events: data.events,
      secret, // Show once on creation
      active: data.active,
      createdAt: data.created_at,
    });
  } catch (error) {
    console.error("Webhook registration error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to register webhook" } },
      { status: 500 },
    );
  }
}
