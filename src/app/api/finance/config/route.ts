import { NextResponse } from "next/server";
import { AUSTRALIAN_BANKS, getCdrRuntimeStatus } from "@/lib/finance/australia";

export async function GET() {
  const cdr = getCdrRuntimeStatus();

  return NextResponse.json({
    cdr,
    banks: AUSTRALIAN_BANKS.map((bank) => ({
      id: bank.id,
      name: bank.name,
      shortName: bank.shortName,
      coverage: bank.coverage,
      requirements: bank.requirements,
      sourceLabel: bank.sourceLabel,
      sourceUrl: bank.sourceUrl,
      lastVerified: bank.lastVerified,
      note: bank.note,
    })),
  });
}
