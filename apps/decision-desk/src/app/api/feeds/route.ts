import { NextRequest, NextResponse } from "next/server";
import { collectAllFeeds, collectFeedById } from "@/lib/feeds/collectors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("project");
  const symbol = request.nextUrl.searchParams.get("symbol")?.trim() || "BTC";

  try {
    if (projectId) {
      const feed = await collectFeedById(projectId, symbol);
      if (!feed) {
        return NextResponse.json({ error: "Unknown project" }, { status: 404 });
      }
      return NextResponse.json({
        updatedAt: new Date().toISOString(),
        mode: "snapshot",
        symbol,
        feeds: [feed],
      });
    }

    const feeds = await collectAllFeeds(symbol);
    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      mode: "snapshot",
      symbol,
      feeds,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Feed collection failed",
        detail: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 }
    );
  }
}
