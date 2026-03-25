import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "~~/lib/supabase/server";

export async function POST(request: NextRequest) {
  let body: { email?: string; wallet_address?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const { email, wallet_address } = body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json(
      { error: { code: "INVALID_EMAIL", message: "A valid email address is required" } },
      { status: 400 },
    );
  }

  try {
    const supabase = createServerClient();
    const { error } = await (supabase as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .from("waitlist")
      .insert({
        email: email.toLowerCase().trim(),
        wallet_address: wallet_address || null,
      });

    if (error) {
      // Unique constraint violation — already on the waitlist
      if (error.code === "23505") {
        return NextResponse.json({ message: "You're already on the waitlist!" });
      }
      console.error("[Waitlist] Insert error:", error);
      throw error;
    }

    return NextResponse.json({ message: "Successfully joined the waitlist!" });
  } catch (error) {
    console.error("[Waitlist] Failed:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to join waitlist" } },
      { status: 500 },
    );
  }
}
