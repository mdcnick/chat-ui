import type { RequestHandler } from "@sveltejs/kit";
import { logger } from "$lib/server/logger";
import { superjsonResponse } from "$lib/server/api/utils/superjsonResponse";
import { config } from "$lib/server/config";
import { requireAdmin } from "$lib/server/api/utils/requireAuth";

export const GET: RequestHandler = async ({ locals }) => {
	requireAdmin(locals);
	const base = (config.OPENAI_BASE_URL || "https://router.huggingface.co/v1").replace(/\/$/, "");
	const res = await fetch(`${base}/models`);
	const body = await res.text();
	let parsed: unknown;
	try {
		parsed = JSON.parse(body);
	} catch (error) {
		logger.warn({ err: String(error), base }, "[debug] failed to parse upstream /models response");
		parsed = undefined;
	}
	return superjsonResponse({
		status: res.status,
		ok: res.ok,
		base,
		length: (() => {
			if (parsed && typeof parsed === "object" && "data" in parsed) {
				const data = (parsed as { data?: unknown }).data;
				return Array.isArray(data) ? data.length : null;
			}
			return null;
		})(),
		sample: body.slice(0, 2000),
	});
};
