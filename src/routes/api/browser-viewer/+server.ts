import { env } from "$env/dynamic/private";
import { error } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";

// Proxy the Steel session viewer HTML, rewriting the hardcoded container-internal
// WebSocket URL (ws://0.0.0.0:3000) to the host-accessible address so the browser
// can actually connect to the Steel cast WebSocket.
export async function GET({ url: reqUrl }: RequestEvent) {
	const baseURL = (env.STEEL_BASE_URL ?? "").replace(/\/$/, "");
	if (!baseURL) {
		error(503, "Steel browser not configured");
	}

	// Accept an explicit session viewer URL via ?url= param; fall back to generic debug page.
	const rawParam = reqUrl.searchParams.get("url");
	const viewerUrl = rawParam ? decodeURIComponent(rawParam) : `${baseURL}/v1/sessions/debug`;

	// Safety: only allow proxying URLs that originate from the configured Steel base
	if (rawParam) {
		try {
			const target = new URL(viewerUrl);
			const allowed = new URL(baseURL);
			if (target.hostname !== allowed.hostname || target.port !== allowed.port) {
				error(403, "Viewer URL host does not match configured Steel base URL");
			}
		} catch {
			error(400, "Invalid viewer URL");
		}
	}

	let html: string;
	try {
		const res = await fetch(viewerUrl);
		if (!res.ok) {
			error(502, `Steel viewer returned ${res.status}`);
		}
		html = await res.text();
	} catch (err) {
		error(502, `Could not reach Steel viewer: ${err instanceof Error ? err.message : err}`);
	}

	// Derive the host-accessible WebSocket base URL from STEEL_BASE_URL
	// e.g. http://localhost:3001 → ws://localhost:3001
	const wsBase = baseURL.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
	html = html.replace(/ws:\/\/0\.0\.0\.0:\d+/g, wsBase);

	// The Steel viewer canvas is position:absolute with height:100%/width:auto, causing
	// it to overflow the panel horizontally (1920px wide in a 640px panel = clipped).
	// Keep it absolutely positioned but reset left/transform and constrain to panel width.
	const cssOverride = `<style>
.canvas-container { overflow: hidden !important; }
.canvas {
  left: 0 !important;
  top: 0 !important;
  transform: none !important;
  width: 100% !important;
  height: auto !important;
}
</style>`;
	html = html.replace("</head>", cssOverride + "</head>");

	return new Response(html, {
		headers: { "content-type": "text/html; charset=utf-8" },
	});
}
