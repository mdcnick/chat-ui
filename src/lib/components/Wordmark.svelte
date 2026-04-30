<script lang="ts">
	interface Props {
		size?: "sm" | "md" | "lg" | "xl";
		showFlame?: boolean;
		animated?: boolean;
		classNames?: string;
	}

	let { size = "md", showFlame = true, animated = false, classNames = "" }: Props = $props();

	const dimensions = {
		sm: { flame: "size-4", word: "text-xl", gap: "gap-1.5" },
		md: { flame: "size-6", word: "text-3xl", gap: "gap-2" },
		lg: { flame: "size-9", word: "text-5xl", gap: "gap-3" },
		xl: { flame: "size-14", word: "text-7xl", gap: "gap-4" },
	}[size];
</script>

<span class="inline-flex items-baseline {dimensions.gap} {classNames}">
	{#if showFlame}
		<svg
			class="{dimensions.flame} -translate-y-[0.06em] flex-shrink-0 self-end {animated
				? 'flame-flicker'
				: ''}"
			viewBox="0 0 24 28"
			fill="none"
			aria-hidden="true"
		>
			<defs>
				<linearGradient id="hearth-flame-outer" x1="50%" y1="0%" x2="50%" y2="100%">
					<stop offset="0%" stop-color="oklch(var(--chart-4))" />
					<stop offset="55%" stop-color="oklch(var(--primary))" />
					<stop offset="100%" stop-color="oklch(var(--chart-1))" />
				</linearGradient>
				<linearGradient id="hearth-flame-inner" x1="50%" y1="20%" x2="50%" y2="100%">
					<stop offset="0%" stop-color="oklch(0.97 0.04 90)" />
					<stop offset="50%" stop-color="oklch(var(--chart-4))" />
					<stop offset="100%" stop-color="oklch(var(--primary))" />
				</linearGradient>
			</defs>
			<path
				d="M12 1.5c-.4 3.2-2.6 5.6-4.6 7.7C5.4 11.3 3 13.7 3 17.4 3 22.7 7 26.5 12 26.5s9-3.8 9-9.1c0-2.4-1-4.4-2.4-6 .2 1.4-.4 2.5-1.4 2.7.6-1.6.5-3.6-.6-5.6-1-1.9-2.6-3.4-4.6-7Z"
				fill="url(#hearth-flame-outer)"
				stroke="oklch(var(--chart-5))"
				stroke-width="1.1"
				stroke-linejoin="round"
			/>
			<path
				d="M12 10.5c-.3 1.8-1.6 3.1-2.7 4.3-.9 1-2 2.2-2 4.1 0 2.9 2.1 4.9 4.7 4.9s4.7-2 4.7-4.9c0-1.4-.6-2.5-1.4-3.4.1.8-.3 1.4-.9 1.6.4-1 .4-2.2-.2-3.3-.6-1-1.4-1.9-2.2-3.3Z"
				fill="url(#hearth-flame-inner)"
			/>
		</svg>
	{/if}
	<span
		class="font-display {dimensions.word} font-normal italic leading-none tracking-[-0.02em] text-foreground"
	>
		Hearth
	</span>
</span>

<style>
	.flame-flicker {
		transform-origin: 50% 95%;
		animation: flicker 2.4s ease-in-out infinite;
	}
	@keyframes flicker {
		0%,
		100% {
			transform: translateY(-0.06em) scale(1, 1);
			filter: drop-shadow(0 0 6px oklch(var(--primary) / 0.35));
		}
		25% {
			transform: translateY(-0.08em) scale(0.98, 1.04);
			filter: drop-shadow(0 0 9px oklch(var(--primary) / 0.5));
		}
		50% {
			transform: translateY(-0.05em) scale(1.02, 0.98);
			filter: drop-shadow(0 0 5px oklch(var(--primary) / 0.3));
		}
		75% {
			transform: translateY(-0.07em) scale(0.99, 1.02);
			filter: drop-shadow(0 0 8px oklch(var(--primary) / 0.45));
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.flame-flicker {
			animation: none;
		}
	}
</style>
