import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_SYMBOL,
  collectMarketSnapshot,
} from "@/lib/market/realtime";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const symbol =
    request.nextUrl.searchParams.get("symbol")?.trim() || DEFAULT_SYMBOL;

  try {
    const snapshot = await collectMarketSnapshot(symbol);
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Не удалось получить рыночные данные",
        detail: error instanceof Error ? error.message : "unknown",
      },
      { status: 502 }
    );
  }
}
