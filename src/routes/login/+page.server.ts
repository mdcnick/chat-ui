import { fail, redirect } from "@sveltejs/kit";
import { base } from "$app/paths";
import { loginEnabled, sanitizeReturnPath } from "$lib/server/auth";
import { forwardBetterAuthCookies } from "$lib/server/betterAuth";
import { config } from "$lib/server/config";
import type { Actions, PageServerLoad } from "./$types";

function sanitizeNext(raw: string | null): string {
	return sanitizeReturnPath(raw) ?? `${base}/`;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		throw redirect(302, sanitizeNext(url.searchParams.get("next")));
	}

	const githubEnabled = !!(config.GITHUB_CLIENT_ID && config.GITHUB_CLIENT_SECRET);
	const googleEnabled = !!(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET);

	return {
		loginEnabled,
		githubEnabled,
		googleEnabled,
		next: sanitizeNext(url.searchParams.get("next")),
		error: url.searchParams.get("error"),
		message: url.searchParams.get("message"),
	};
};

export const actions: Actions = {
	default: async ({ request, fetch, url, cookies }) => {
		const data = await request.formData();
		const email = String(data.get("email") ?? "").trim();
		const password = String(data.get("password") ?? "");
		const next = sanitizeNext(data.get("next") as string | null);

		if (!email || !password) {
			return fail(400, { error: "Email and password are required.", email });
		}

		if (!loginEnabled) {
			return fail(503, { error: "Login is not configured.", email });
		}

		const res = await fetch(`${url.origin}${base}/api/auth/sign-in/email`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password }),
		});

		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			const msg = (body as { message?: string })?.message ?? "";
			return fail(401, {
				error: msg || "Invalid email or password.",
				email,
			});
		}

		forwardBetterAuthCookies(cookies, res);

		throw redirect(302, next);
	},
};
