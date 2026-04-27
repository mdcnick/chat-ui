import { fail, redirect } from "@sveltejs/kit";
import { base } from "$app/paths";
import { loginEnabled } from "$lib/server/auth";
import { forwardBetterAuthCookies } from "$lib/server/betterAuth";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(302, `${base}/`);
	}
	return { loginEnabled };
};

export const actions: Actions = {
	default: async ({ request, fetch, url, cookies }) => {
		const data = await request.formData();
		const name = String(data.get("name") ?? "").trim();
		const email = String(data.get("email") ?? "").trim();
		const password = String(data.get("password") ?? "");

		if (!name || !email || !password) {
			return fail(400, { error: "All fields are required.", name, email });
		}

		if (password.length < 8) {
			return fail(400, { error: "Password must be at least 8 characters.", name, email });
		}

		if (!loginEnabled) {
			return fail(503, { error: "Registration is not configured.", name, email });
		}

		const res = await fetch(`${url.origin}${base}/api/auth/sign-up/email`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, email, password }),
		});

		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			const msg = (body as { message?: string })?.message ?? "";
			if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exist")) {
				return fail(409, {
					error: "An account with this email already exists. Sign in instead.",
					name,
					email,
				});
			}
			return fail(res.status >= 400 && res.status < 500 ? res.status : 400, {
				error: msg || "Could not create account. Please try again.",
				name,
				email,
			});
		}

		forwardBetterAuthCookies(cookies, res);

		throw redirect(302, `${base}/`);
	},
};
