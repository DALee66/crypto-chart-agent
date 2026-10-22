import { NextRequest } from "next/server";
import { collectAllFeeds, collectFeedById } from "@/lib/feeds/collectors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("project");
  const symbol = request.nextUrl.searchParams.get("symbol")?.trim() || "BTC";
  const intervalMs = Math.min(
    10000,
    Math.max(1500, Number(request.nextUrl.searchParams.get("interval") ?? 2500))
  );

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      const tick = async () => {
        try {
          const feeds = projectId
            ? [await collectFeedById(projectId, symbol)].filter(Boolean)
            : await collectAllFeeds(symbol);
          send({
            updatedAt: new Date().toISOString(),
            mode: "stream-poll",
            symbol,
            feeds,
          });
        } catch (error) {
          send({
            error: error instanceof Error ? error.message : "stream error",
          });
        }
      };

      await tick();
      const timer = setInterval(() => {
        void tick();
      }, intervalMs);

      const abort = () => {
        closed = true;
        clearInterval(timer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      request.signal.addEventListener("abort", abort);
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
