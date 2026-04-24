<script lang="ts">
	import { invalidateAll, goto } from "$app/navigation";
	import { base } from "$app/paths";
	import { page } from "$app/state";
	import IconCheap from "$lib/components/icons/IconCheap.svelte";
	import IconFast from "$lib/components/icons/IconFast.svelte";
	import { error } from "$lib/stores/errors";
	import { useSettingsStore } from "$lib/stores/settings";
	import type { Model } from "$lib/types/Model";
	import { PROVIDERS_HUB_ORGS } from "@huggingface/inference";
	import { tick } from "svelte";
	import CarbonCheckmark from "~icons/carbon/checkmark";
	import CarbonSearch from "~icons/carbon/search";
	import LucideHammer from "~icons/lucide/hammer";
	import LucideImage from "~icons/lucide/image";

	interface Props {
		models: Model[];
		currentModel: Model;
		disabled?: boolean;
	}

	let { models, currentModel, disabled = false }: Props = $props();

	const settings = useSettingsStore();

	let rootEl: HTMLDivElement | undefined = $state();
	let searchInputEl: HTMLInputElement | undefined = $state();
	let isOpen = $state(false);
	let modelFilter = $state("");
	let activeProvider = $state("all");
	let changingModelId = $state<string | null>(null);

	const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ");
	let queryTokens = $derived(normalize(modelFilter).trim().split(/\s+/).filter(Boolean));

	function getModelProviders(model: Model): string[] {
		const providers = model.providers ?? [];
		const names = providers
			.map((p) =>
				typeof p === "object" && p !== null ? (p as Record<string, unknown>).provider : undefined
			)
			.filter((p): p is string => typeof p === "string" && p.length > 0);
		return names.length > 0 ? names : ["other"];
	}

	function getPrimaryProvider(model: Model): string {
		return getModelProviders(model)[0] ?? "other";
	}

	function providerDisplayName(providerId: string): string {
		const mapping: Record<string, string> = {
			"hf-inference": "Hugging Face",
			"fireworks-ai": "Fireworks AI",
			together: "Together AI",
			sambanova: "SambaNova",
			groq: "Groq",
			cohere: "Cohere",
			openai: "OpenAI",
			novita: "Novita",
			nebius: "Nebius",
			hyperbolic: "Hyperbolic",
			replicate: "Replicate",
			"fal-ai": "Fal.ai",
			baseten: "Baseten",
			cerebras: "Cerebras",
			clarifai: "Clarifai",
			nscale: "Nscale",
			ovhcloud: "OVHcloud",
			publicai: "Public AI",
			scaleway: "Scaleway",
			wavespeed: "Wavespeed",
			"zai-org": "Z.ai",
			"featherless-ai": "Featherless AI",
			"black-forest-labs": "Black Forest Labs",
			other: "Other",
		};
		return (
			mapping[providerId] ?? providerId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
		);
	}

	function providerMonogram(providerId: string): string {
		const name = providerDisplayName(providerId);
		return name
			.split(/\s+/)
			.map((part) => part[0] ?? "")
			.join("")
			.slice(0, 2)
			.toUpperCase();
	}

	function modelDescription(model: Model): string {
		if (model.isRouter) {
			return "Smart routing across the best model for each request.";
		}

		const providerLine = providerDisplayName(getPrimaryProvider(model));
		return model.description ? `${providerLine} · ${model.description}` : providerLine;
	}

	let availableModels = $derived(models.filter((model) => !model.unlisted));
	let providerOptions = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const model of availableModels) {
			for (const provider of getModelProviders(model)) {
				counts.set(provider, (counts.get(provider) ?? 0) + 1);
			}
		}

		const providers = Array.from(counts.entries())
			.map(([id, count]) => ({ id, count, label: providerDisplayName(id) }))
			.sort((a, b) => a.label.localeCompare(b.label));

		return [{ id: "all", count: availableModels.length, label: "All models" }, ...providers];
	});

	let filteredModels = $derived(
		availableModels.filter((model) => {
			if (activeProvider !== "all" && !getModelProviders(model).includes(activeProvider)) {
				return false;
			}

			if (queryTokens.length === 0) {
				return true;
			}

			const haystack = normalize(
				`${model.id} ${model.name ?? ""} ${model.displayName ?? ""} ${providerDisplayName(getPrimaryProvider(model))}`
			);
			return queryTokens.every((q) => haystack.includes(q));
		})
	);

	let currentProviderOverride = $derived($settings.providerOverrides?.[currentModel.id]);
	let hasProviderOverride = $derived(
		currentProviderOverride && currentProviderOverride !== "auto" && !currentModel.isRouter
	);

	function supportsTools(model: Model): boolean {
		return (
			$settings.toolsOverrides?.[model.id] ??
			Boolean((model as unknown as { supportsTools?: boolean }).supportsTools)
		);
	}

	function supportsMultimodal(model: Model): boolean {
		return $settings.multimodalOverrides?.[model.id] ?? Boolean(model.multimodal);
	}

	async function focusSearch() {
		await tick();
		searchInputEl?.focus();
		searchInputEl?.select();
	}

	function openPicker() {
		if (disabled) return;
		isOpen = true;
		modelFilter = "";
		activeProvider = "all";
		void focusSearch();
	}

	function closePicker() {
		isOpen = false;
		modelFilter = "";
	}

	async function selectModel(model: Model) {
		if (changingModelId || model.id === currentModel.id) {
			closePicker();
			return;
		}

		changingModelId = model.id;

		try {
			if (page.params.id) {
				const response = await fetch(`${base}/conversation/${page.params.id}`, {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ model: model.id }),
				});

				if (!response.ok) {
					throw new Error("Failed to update conversation model");
				}

				await invalidateAll();
			} else if (page.route.id?.includes("/models/")) {
				await settings.instantSet({ activeModel: model.id });
				await goto(`${base}/models/${model.id}`);
			} else {
				await settings.instantSet({ activeModel: model.id });
			}

			closePicker();
		} catch (err) {
			console.error(err);
			$error = err instanceof Error ? err.message : "Failed to switch model";
		} finally {
			changingModelId = null;
		}
	}

	function handleWindowPointer(event: MouseEvent) {
		if (!isOpen || !rootEl) return;
		if (rootEl.contains(event.target as Node)) return;
		closePicker();
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (event.key === "Escape" && isOpen) {
			event.preventDefault();
			closePicker();
		}
	}
</script>

<svelte:window onmousedown={handleWindowPointer} onkeydown={handleWindowKeydown} />

<div class="relative" bind:this={rootEl}>
	<button
		type="button"
		class="group inline-flex items-center gap-2 rounded-full border border-gray-200/70 bg-white/60 px-2.5 py-1 text-xs text-gray-500 transition-colors hover:border-gray-300 hover:bg-white/90 hover:text-gray-800 dark:border-gray-700/70 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800/90 dark:hover:text-gray-100 {disabled
			? 'cursor-not-allowed opacity-60'
			: ''}"
		onclick={() => (isOpen ? closePicker() : openPicker())}
		aria-haspopup="dialog"
		aria-expanded={isOpen}
		aria-label="Choose chat model"
		{disabled}
	>
		<div
			class="flex size-5 items-center justify-center overflow-hidden rounded-full bg-gray-900/85 text-[10px] font-semibold text-white dark:bg-white/15"
		>
			{#if currentModel.logoUrl}
				<img src={currentModel.logoUrl} alt="" class="size-full object-cover" />
			{:else}
				{currentModel.displayName.slice(0, 1).toUpperCase()}
			{/if}
		</div>
		<span class="truncate font-medium text-gray-700 dark:text-gray-100">
			{currentModel.displayName}
		</span>

		{#if hasProviderOverride}
			{@const hubOrg =
				PROVIDERS_HUB_ORGS[currentProviderOverride as keyof typeof PROVIDERS_HUB_ORGS]}
			<span
				class="inline-flex shrink-0 items-center rounded-md p-0.5 {currentProviderOverride ===
				'fastest'
					? 'bg-green-100 text-green-600 dark:bg-green-800/20 dark:text-green-500'
					: currentProviderOverride === 'cheapest'
						? 'bg-blue-100 text-blue-600 dark:bg-blue-800/20 dark:text-blue-500'
						: ''}"
				title="Provider: {currentProviderOverride}"
			>
				{#if currentProviderOverride === "fastest"}
					<IconFast classNames="text-sm" />
				{:else if currentProviderOverride === "cheapest"}
					<IconCheap classNames="text-sm" />
				{:else if hubOrg}
					<img
						src="https://huggingface.co/api/avatars/{hubOrg}"
						alt={currentProviderOverride}
						class="size-3 flex-none rounded-sm"
					/>
				{/if}
			</span>
		{/if}

		<span
			class="text-[10px] text-gray-400 transition-transform dark:text-gray-500 {isOpen
				? 'rotate-180'
				: ''}"
		>
			▼
		</span>
	</button>

	{#if isOpen}
		<div
			class="absolute bottom-full left-0 z-40 mb-3 w-[min(31rem,calc(100vw-2rem))] overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(37,38,43,0.98),rgba(25,27,31,0.98))] text-gray-100 shadow-[0_28px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl"
			role="dialog"
			aria-label="Model selector"
		>
			<div
				class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.09),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.10),transparent_34%)]"
			></div>

			<div class="relative grid min-h-[24rem] grid-cols-1 sm:grid-cols-[4.4rem,minmax(0,1fr)]">
				<div class="border-white/8 hidden border-r bg-black/10 p-2.5 sm:flex sm:flex-col sm:gap-2">
					{#each providerOptions as provider (provider.id)}
						<button
							type="button"
							class="group flex min-h-12 flex-col items-center justify-center rounded-2xl border px-1.5 text-[10px] font-medium transition-all {activeProvider ===
							provider.id
								? 'border-white/12 bg-white text-gray-900 shadow-[0_12px_30px_rgba(255,255,255,0.08)]'
								: 'bg-white/4 hover:border-white/8 hover:bg-white/8 border-transparent text-gray-400 hover:text-white'}"
							onclick={() => (activeProvider = provider.id)}
							title={provider.label}
						>
							<span
								class="flex size-7 items-center justify-center rounded-full bg-black/20 text-[9px] font-semibold uppercase"
							>
								{provider.id === "all" ? "A" : providerMonogram(provider.id)}
							</span>
							<span class="mt-1 truncate">{provider.count}</span>
						</button>
					{/each}
				</div>

				<div class="flex min-h-0 flex-col p-3">
					<div
						class="border-white/8 bg-white/4 rounded-[22px] border p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
					>
						<div
							class="border-white/7 flex items-center gap-2 rounded-2xl border bg-black/20 px-3 py-2"
						>
							<CarbonSearch class="size-4 flex-none text-gray-500" />
							<input
								bind:this={searchInputEl}
								bind:value={modelFilter}
								type="search"
								placeholder="Search models"
								aria-label="Search models"
								class="w-full border-0 bg-transparent p-0 text-sm text-white outline-none placeholder:text-gray-500 focus:ring-0"
							/>
						</div>

						<div class="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 sm:hidden">
							{#each providerOptions as provider (provider.id)}
								<button
									type="button"
									class="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors {activeProvider ===
									provider.id
										? 'border-white/15 bg-white text-gray-900'
										: 'border-white/8 bg-white/4 hover:border-white/12 text-gray-300 hover:bg-white/10'}"
									onclick={() => (activeProvider = provider.id)}
								>
									{provider.label} · {provider.count}
								</button>
							{/each}
						</div>
					</div>

					<div
						class="border-white/8 mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border bg-black/10"
					>
						<div
							class="border-white/8 flex items-center justify-between border-b px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-gray-500"
						>
							<span
								>{activeProvider === "all"
									? "Model Library"
									: providerDisplayName(activeProvider)}</span
							>
							<span>{filteredModels.length}</span>
						</div>

						<div class="scrollbar-custom min-h-0 flex-1 overflow-y-auto p-2">
							{#if filteredModels.length}
								<div class="flex flex-col gap-1.5">
									{#each filteredModels as model (model.id)}
										{@const isActive = model.id === currentModel.id}
										<button
											type="button"
											class="group flex w-full items-center gap-3 rounded-[20px] border px-3 py-3 text-left transition-all {isActive
												? 'border-white/12 bg-white/10 shadow-[0_16px_30px_rgba(0,0,0,0.18)]'
												: 'hover:border-white/8 hover:bg-white/6 border-transparent bg-transparent'}"
											onclick={() => selectModel(model)}
											disabled={changingModelId !== null}
											aria-current={isActive ? "true" : undefined}
										>
											<div
												class="border-white/8 bg-white/6 flex size-11 flex-none items-center justify-center overflow-hidden rounded-[16px] border"
											>
												{#if model.logoUrl}
													<img src={model.logoUrl} alt="" class="size-full object-cover" />
												{:else}
													<span class="text-sm font-semibold text-gray-200">
														{model.displayName.slice(0, 1).toUpperCase()}
													</span>
												{/if}
											</div>

											<div class="min-w-0 flex-1">
												<div class="flex items-center gap-2">
													<span class="truncate text-sm font-semibold text-white">
														{model.displayName}
													</span>
													{#if isActive}
														<span
															class="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-900"
														>
															Current
														</span>
													{/if}
												</div>
												<p class="mt-1 line-clamp-2 text-xs text-gray-400">
													{modelDescription(model)}
												</p>
											</div>

											<div class="flex flex-col items-end gap-1.5">
												<div class="flex items-center gap-1">
													{#if supportsTools(model)}
														<span
															class="bg-purple-500/12 grid size-7 place-items-center rounded-xl text-purple-300"
															title="Tool calling supported"
														>
															<LucideHammer class="size-3.5" />
														</span>
													{/if}
													{#if supportsMultimodal(model)}
														<span
															class="bg-sky-500/12 grid size-7 place-items-center rounded-xl text-sky-300"
															title="Image input supported"
														>
															<LucideImage class="size-3.5" />
														</span>
													{/if}
												</div>
												{#if changingModelId === model.id}
													<span class="text-[11px] text-gray-500">Switching…</span>
												{:else if isActive}
													<CarbonCheckmark class="size-4 text-white" />
												{/if}
											</div>
										</button>
									{/each}
								</div>
							{:else}
								<div
									class="flex h-full min-h-40 flex-col items-center justify-center px-6 text-center"
								>
									<p class="text-sm font-medium text-white">No models match that search.</p>
									<p class="mt-1 text-xs text-gray-500">
										Try another provider or clear the search input.
									</p>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
