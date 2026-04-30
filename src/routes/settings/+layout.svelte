<script lang="ts">
	import { base } from "$app/paths";
	import { afterNavigate, goto } from "$app/navigation";
	import { useSettingsStore } from "$lib/stores/settings";
	import CarbonCheckmark from "~icons/carbon/checkmark";
	import Modal from "$lib/components/Modal.svelte";
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
	const settings = useSettingsStore();
</script>

<Modal
	onclose={() => goto(previousPage)}
	width="border border-border h-[90dvh] w-[90dvw] pb-0 overflow-hidden rounded-2xl bg-card shadow-2xl outline-none text-foreground sm:h-[90dvh] xl:w-[920px] xl:h-[80dvh] 2xl:w-[980px] 2xl:h-[70dvh]"
>
	{#if $settings.recentlySaved}
		<div
			class="absolute bottom-4 right-4 m-2 flex items-center gap-1.5 rounded-full border bg-primary px-3 py-1 text-primary-foreground"
		>
			<CarbonCheckmark class="text-primary-foreground" />
		</div>
	{/if}
	{@render children?.()}
</Modal>
