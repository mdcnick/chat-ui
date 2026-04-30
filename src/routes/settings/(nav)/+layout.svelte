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
	class="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-2.5 shadow-sm backdrop-blur"
>
	<div class="min-w-0 flex-1">
		<h2 class="text-base font-semibold text-card-foreground">Settings</h2>
	</div>

	<button
		class="flex size-8 items-center justify-center rounded-lg border border-border bg-card/60 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
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
