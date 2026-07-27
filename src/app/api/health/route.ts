import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "RoyalCommand.ai",
    time: new Date().toISOString(),
  });
}
