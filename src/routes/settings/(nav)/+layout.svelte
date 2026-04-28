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
		class="flex items-center gap-3 rounded-xl border border-gray-200/60 bg-white/60 px-4 py-2.5 shadow-sm backdrop-blur dark:border-gray-700/60 dark:bg-gray-800/60 dark:shadow-md"
	>
		<div class="min-w-0 flex-1">
			<h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">
				Settings
			</h2>
		</div>

		<button
			class="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white/60 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
			aria-label="Close settings"
			onclick={() => goto(previousPage)}
		>
			<CarbonClose class="text-lg" />
		</button>
	</div>

	<div class="scrollbar-custom min-h-0 w-full flex-1 overflow-y-auto overflow-x-clip">
		<div class="min-h-full px-3 py-4 md:px-4">
			<div class="mx-auto w-full max-w-3xl">
				{@render children?.()}
			</div>
		</div>
	</div>
