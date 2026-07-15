import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function applyCacheControl(response: Response, url: URL): Response {
  if (response.headers.has("cache-control")) return response;

  const { pathname } = url;
  const contentType = response.headers.get("content-type") ?? "";

  let cacheControl: string;

  if (pathname.startsWith("/api/")) {
    cacheControl = "no-store";
  } else if (pathname.startsWith("/uploads/")) {
    cacheControl = "public, max-age=86400, must-revalidate";
  } else if (
    pathname.match(/\.(js|css|woff2?|ttf|eot)$/) ||
    pathname.startsWith("/_assets/") ||
    pathname.startsWith("/assets/")
  ) {
    // Content-hashed filenames: safe to cache forever
    cacheControl = "public, max-age=31536000, immutable";
  } else if (pathname.match(/\.(png|jpe?g|gif|svg|ico|webp|avif)$/)) {
    cacheControl = "public, max-age=604800, must-revalidate";
  } else if (contentType.includes("text/html")) {
    cacheControl = "no-cache, must-revalidate";
  } else {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("cache-control", cacheControl);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return applyCacheControl(normalized, new URL(request.url));
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
