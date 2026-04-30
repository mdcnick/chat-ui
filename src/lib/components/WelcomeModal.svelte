<script lang="ts">
	import Modal from "$lib/components/Modal.svelte";
	import Wordmark from "$lib/components/Wordmark.svelte";
	import IconOmni from "$lib/components/icons/IconOmni.svelte";
	import { usePublicConfig } from "$lib/utils/PublicConfig.svelte";

	const publicConfig = usePublicConfig();

	interface Props {
		close: () => void;
	}

	let { close }: Props = $props();
</script>

<Modal closeOnBackdrop={false} onclose={close} width="!max-w-[440px] !m-4">
	<div class="flex w-full flex-col bg-card">
		<!-- Hero: ember-glow canvas with the wordmark centered -->
		<div class="relative h-52 select-none overflow-hidden">
			<!-- layered atmosphere -->
			<div
				class="absolute inset-0"
				style="background:
					radial-gradient(120% 80% at 50% 110%, oklch(var(--primary) / 0.55), transparent 60%),
					radial-gradient(100% 60% at 50% 100%, oklch(var(--chart-4) / 0.45), transparent 70%),
					linear-gradient(180deg, oklch(var(--chart-5)) 0%, oklch(var(--chart-3)) 100%);"
			></div>

			<!-- subtle circuit-trace decoration, echoes the original logo -->
			<svg
				class="absolute inset-0 h-full w-full opacity-[0.18]"
				viewBox="0 0 440 208"
				fill="none"
				preserveAspectRatio="none"
				aria-hidden="true"
			>
				<g stroke="oklch(var(--chart-4))" stroke-width="1" stroke-linecap="round">
					<path d="M0 40 L80 40 L100 60 L180 60" />
					<path d="M440 30 L360 30 L340 50 L260 50" />
					<path d="M0 170 L70 170 L90 150 L160 150" />
					<path d="M440 180 L370 180 L350 160 L280 160" />
					<circle cx="80" cy="40" r="2.5" fill="oklch(var(--chart-4))" />
					<circle cx="360" cy="30" r="2.5" fill="oklch(var(--chart-4))" />
					<circle cx="70" cy="170" r="2.5" fill="oklch(var(--chart-4))" />
					<circle cx="370" cy="180" r="2.5" fill="oklch(var(--chart-4))" />
					<circle cx="180" cy="60" r="1.5" fill="oklch(var(--primary))" />
					<circle cx="260" cy="50" r="1.5" fill="oklch(var(--primary))" />
				</g>
			</svg>

			<!-- grain overlay -->
			<div
				class="absolute inset-0 opacity-30 mix-blend-overlay"
				style="background-image: url(&quot;data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.95 0 0 0 0 0.45 0 0 0 0 0.1 0 0 0 0.18 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>&quot;);"
			></div>

			<!-- centerpiece -->
			<div class="relative flex h-full w-full flex-col items-center justify-center gap-3">
				<div class="[--foreground:0.96_0.018_78]">
					<Wordmark size="xl" animated classNames="drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]" />
				</div>
				<p
					class="font-display text-base italic tracking-wide text-white/75"
					style="text-shadow: 0 1px 8px oklch(var(--chart-5) / 0.6);"
				>
					gather your hearth.
				</p>
			</div>

			<!-- corner badge -->
			<div
				class="absolute right-3 top-3 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] font-medium tracking-wider text-white/85 backdrop-blur-sm"
			>
				MCP READY
			</div>
		</div>

		<!-- body copy -->
		<div class="flex flex-col gap-5 px-7 pb-7 pt-6 text-card-foreground">
			<p class="text-[15px] leading-relaxed">
				Welcome. <span class="font-display text-base italic">Hearth</span> is your private circle's chat
				with open-source AI — bring your tribe, share the fire.
			</p>
			<div class="flex items-start gap-2.5 text-[14px] leading-relaxed text-muted-foreground">
				<IconOmni classNames="mt-1 flex-shrink-0 text-primary" />
				<p>
					<span class="font-medium text-card-foreground">Omni</span> picks the right model for what you're
					asking — code, vision, reasoning — without you having to think about it.
				</p>
			</div>
			<p class="text-[14px] leading-relaxed text-muted-foreground">
				Or pick any model directly. Connect MCP servers for tools. It's your fire to tend.
			</p>

			<button
				class="group relative mt-1 w-full overflow-hidden rounded-xl bg-primary px-5 py-3 text-base font-medium text-primary-foreground shadow-glow-ember transition-all hover:translate-y-[-1px] hover:brightness-110 active:translate-y-0"
				onclick={close}
			>
				<span class="relative z-10">Start chatting</span>
				<span
					class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
				></span>
			</button>
		</div>
	</div>
</Modal>
