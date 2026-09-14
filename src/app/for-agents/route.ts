import { renderAgentsIndexMarkdown } from "@/lib/agent-public-docs";

export const runtime = "nodejs";

const MARKDOWN_HEADERS = {
  "Content-Type": "text/markdown; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "public, max-age=300, s-maxage=300",
} as const;

export function GET() {
  return new Response(renderAgentsIndexMarkdown(), {
    status: 200,
    headers: MARKDOWN_HEADERS,
  });
}
