<script lang="ts">
	import { afterNavigate, goto } from "$app/navigation";
	import { base } from "$app/paths";
	import CarbonClose from "~icons/carbon/close";

	interface Props {
		children?: import("svelte").Snippet;
	}

	let { children }: Props = $props();

	let previousPage: string = $state(base || "/");

	afterNavigate(({ from }) => {
		if (from?.url && !from.url.pathname.includes("settings")) {
			previousPage = from.url.toString() || previousPage || base || "/";
		}
	});
</script>

<div
	class="mx-auto flex h-full w-full max-w-[980px] flex-col gap-4 overflow-hidden px-3 pb-3 pt-3 text-gray-800 dark:text-gray-200 md:px-4 md:pb-4"
>
	<div
		class="flex items-center gap-3 rounded-[28px] border border-gray-200/80 bg-white/80 px-4 py-3 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur dark:border-gray-700/80 dark:bg-gray-800/80 dark:shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_18px_40px_rgba(0,0,0,0.28)]"
	>
		<div class="min-w-0 flex-1">
			<p
				class="text-[11px] font-semibold uppercase tracking-[0.28em] text-gray-500 dark:text-gray-400"
			>
				Settings
			</p>
			<div class="mt-1">
				<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 md:text-xl">
					Account, preferences, and provider access
				</h2>
				<p class="hidden text-sm text-gray-500 dark:text-gray-400 md:block">
					Manage your account, app defaults, billing, and API keys in one place.
				</p>
			</div>
		</div>

		<button
			class="flex size-10 items-center justify-center rounded-2xl border border-gray-200 bg-white/80 text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200 dark:hover:bg-gray-700"
			aria-label="Close settings"
			onclick={() => goto(previousPage)}
		>
			<CarbonClose class="text-xl text-gray-900 dark:text-gray-200" />
		</button>
	</div>

	<div class="scrollbar-custom min-h-0 w-full flex-1 overflow-y-auto overflow-x-clip">
		<div
			class="min-h-full rounded-[30px] border border-gray-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.9))] px-4 py-5 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_24px_48px_rgba(15,23,42,0.08)] dark:border-gray-700/80 dark:bg-[linear-gradient(180deg,rgba(31,41,55,0.96),rgba(17,24,39,0.92))] dark:shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_24px_48px_rgba(0,0,0,0.32)]"
		>
			<div class="mx-auto w-full max-w-5xl">
				{@render children?.()}
			</div>
		</div>
	</div>
</div>
