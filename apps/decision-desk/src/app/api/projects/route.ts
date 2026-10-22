import { NextRequest, NextResponse } from "next/server";
import { catalogMeta, projectsAsExportPayload } from "@/data/projects";
import { enrichProjectsWithLive } from "@/lib/github";

export async function GET(request: NextRequest) {
  const live = request.nextUrl.searchParams.get("live") === "1";
  const format = request.nextUrl.searchParams.get("format");

  try {
    const enriched = await enrichProjectsWithLive(live);

    if (format === "json") {
      return NextResponse.json({
        ...projectsAsExportPayload(),
        meta: {
          ...catalogMeta,
          live,
          servedAt: new Date().toISOString(),
        },
        projects: enriched,
      });
    }

    return NextResponse.json({
      meta: {
        ...catalogMeta,
        live,
        servedAt: new Date().toISOString(),
      },
      projects: enriched,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Не удалось собрать данные проектов",
        detail: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 }
    );
  }
}
