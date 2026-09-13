import { renderAgentDatasetMarkdown } from "@/lib/agent-public-docs";

export const runtime = "nodejs";

const MARKDOWN_HEADERS = {
  "Content-Type": "text/markdown; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "public, max-age=300, s-maxage=300",
} as const;

const NOT_FOUND_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store",
} as const;

export async function GET(
  _request: Request,
  context: { params: Promise<{ dataset: string }> },
) {
  const { dataset } = await context.params;
  const markdown = renderAgentDatasetMarkdown(dataset);
  if (markdown === null) {
    return new Response("Scheda non disponibile.\n", {
      status: 404,
      headers: NOT_FOUND_HEADERS,
    });
  }
  return new Response(markdown, { status: 200, headers: MARKDOWN_HEADERS });
}
