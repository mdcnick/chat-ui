import { base } from "$app/paths";
import { redirect } from "@sveltejs/kit";

export function load() {
	redirect(302, `${base}/settings/application`);
}
