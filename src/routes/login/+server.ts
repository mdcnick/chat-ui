import { base } from "$app/paths";
import { redirect } from "@sveltejs/kit";
import { loginEnabled, triggerLoginFlow } from "$lib/server/auth";

export async function GET(event) {
	if (event.locals.user) {
		const next = event.url.searchParams.get("next");
		if (next?.startsWith("/")) {
			return redirect(302, next);
		}
		return redirect(302, `${base}/`);
	}

	if (!loginEnabled) {
		return new Response("Clerk login is not configured. Set PUBLIC_CLERK_SIGN_IN_URL.", {
			status: 503,
			headers: {
				"content-type": "text/plain; charset=utf-8",
			},
		});
	}

	return await triggerLoginFlow(event);
}
