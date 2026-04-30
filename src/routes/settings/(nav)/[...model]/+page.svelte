<script lang="ts">
	import { page } from "$app/state";
	import { base } from "$app/paths";

	import type { BackendModel } from "$lib/server/models";
	import IconOmni from "$lib/components/icons/IconOmni.svelte";
	import IconFast from "$lib/components/icons/IconFast.svelte";
	import IconCheap from "$lib/components/icons/IconCheap.svelte";
	import { useSettingsStore } from "$lib/stores/settings";
	import CopyToClipBoardBtn from "$lib/components/CopyToClipBoardBtn.svelte";
	import CarbonArrowUpRight from "~icons/carbon/arrow-up-right";
	import CarbonCopy from "~icons/carbon/copy";
	import CarbonChat from "~icons/carbon/chat";
	import CarbonCode from "~icons/carbon/code";
	import CarbonChevronDown from "~icons/carbon/chevron-down";
	import CarbonReset from "~icons/carbon/reset";
	import LucideCheck from "~icons/lucide/check";
	import CarbonMagicWandFilled from "~icons/carbon/magic-wand-filled";
	import { PROVIDERS_HUB_ORGS } from "@huggingface/inference";
	import { Select } from "bits-ui";

	import { goto } from "$app/navigation";
	import { usePublicConfig } from "$lib/utils/PublicConfig.svelte";
	import Switch from "$lib/components/Switch.svelte";

	const publicConfig = usePublicConfig();
	const settings = useSettingsStore();
	const modelId = $derived(page.params.model ?? "");

	// Functional bindings for nested settings (Svelte 5):
	// Avoid binding directly to $settings.*[modelId]; write via store update
	function getToolsOverride() {
		return (
			$settings.toolsOverrides?.[modelId] ??
			Boolean((model as unknown as { supportsTools?: boolean }).supportsTools)
		);
	}
	function setToolsOverride(v: boolean) {
		settings.update((s) => ({
			...s,
			toolsOverrides: { ...s.toolsOverrides, [modelId]: v },
		}));
	}
	function getMultimodalOverride() {
		return $settings.multimodalOverrides?.[modelId] ?? Boolean(model?.multimodal);
	}
	function setMultimodalOverride(v: boolean) {
		settings.update((s) => ({
			...s,
			multimodalOverrides: { ...s.multimodalOverrides, [modelId]: v },
		}));
	}
	function getHidePromptExamples() {
		return $settings.hidePromptExamples?.[modelId] ?? false;
	}
	function setHidePromptExamples(v: boolean) {
		settings.update((s) => ({
			...s,
			hidePromptExamples: { ...s.hidePromptExamples, [modelId]: v },
		}));
	}

	function getProviderOverride() {
		return $settings.providerOverrides?.[modelId] ?? "auto";
	}
	function setProviderOverride(v: string) {
		settings.update((s) => ({
			...s,
			providerOverrides: { ...s.providerOverrides, [modelId]: v },
		}));
	}

	function getCustomPrompt() {
		return $settings.customPrompts?.[modelId] ?? "";
	}
	function setCustomPrompt(v: string) {
		settings.update((s) => ({
			...s,
			customPrompts: { ...s.customPrompts, [modelId]: v },
		}));
	}
	function getCustomPromptEnabled() {
		return $settings.customPromptsEnabled?.[modelId] ?? true;
	}
	function setCustomPromptEnabled(v: boolean) {
		settings.update((s) => ({
			...s,
			customPromptsEnabled: { ...s.customPromptsEnabled, [modelId]: v },
		}));
	}

	type RouterProvider = { provider: string } & Record<string, unknown>;

	$effect(() => {
		const defaultPreprompt =
			page.data.models.find((el: BackendModel) => el.id === modelId)?.preprompt || "";
		settings.initValue("customPrompts", modelId, defaultPreprompt);
	});

	let hasCustomPreprompt = $derived(
		$settings.customPrompts[modelId] !==
			page.data.models.find((el: BackendModel) => el.id === modelId)?.preprompt
	);

	let model = $derived(page.data.models.find((el: BackendModel) => el.id === modelId));
	let providerList: RouterProvider[] = $derived((model?.providers ?? []) as RouterProvider[]);

	// Initialize multimodal override for this model if not set yet
	$effect(() => {
		if (model) {
			// Default to the model's advertised capability
			settings.initValue("multimodalOverrides", modelId, !!model.multimodal);
		}
	});

	// Initialize tools override for this model if not set yet
	$effect(() => {
		if (model) {
			settings.initValue(
				"toolsOverrides",
				modelId,
				Boolean((model as unknown as { supportsTools?: boolean }).supportsTools)
			);
		}
	});

	// Ensure hidePromptExamples has an entry for this model so the switch can bind safely
	$effect(() => {
		settings.initValue("hidePromptExamples", modelId, false);
	});

	// Ensure customPromptsEnabled has an entry for this model (default enabled)
	$effect(() => {
		settings.initValue("customPromptsEnabled", modelId, true);
	});

	// Initialize provider override for this model (default to "auto")
	$effect(() => {
		settings.initValue("providerOverrides", modelId, "auto");
	});

	// Provider selection policies for the dropdown
	const PROVIDER_POLICIES = [
		{ value: "auto", label: "Auto (your HF preference order)" },
		{ value: "fastest", label: "Fastest (highest throughput)" },
		{ value: "cheapest", label: "Cheapest (lowest cost)" },
	] as const;
</script>

<div class="flex flex-col items-start">
	<div class="mb-4 flex flex-col gap-0.5">
		<h2 class="text-base font-semibold md:text-lg">
			{model.displayName}
		</h2>

		{#if model.description}
			<p class="line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">
				{model.description}
			</p>
		{/if}
	</div>
	<div class="mb-4 flex flex-wrap items-center gap-1.5">
		<button
			class="flex w-fit items-center rounded-full bg-primary px-3 py-1.5 text-sm !text-primary-foreground shadow-glow-pink hover:brightness-105"
			name="Activate model"
			onclick={(e) => {
				e.stopPropagation();
				settings.instantSet({
					activeModel: modelId,
				});
				goto(`${base}/`);
			}}
		>
			<CarbonChat class="mr-1.5 text-sm" />
			New chat
		</button>

		{#if model.modelUrl}
			<a
				href={model.modelUrl || "https://huggingface.co/" + model.name}
				target="_blank"
				class="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-sm hover:bg-accent hover:text-accent-foreground"
				rel="noreferrer"
			>
				<CarbonArrowUpRight class="mr-1.5 shrink-0 text-xs " />
				Model page
			</a>
		{/if}

		{#if model.datasetName || model.datasetUrl}
			<a
				href={model.datasetUrl || "https://huggingface.co/datasets/" + model.datasetName}
				target="_blank"
				class="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-sm hover:bg-accent hover:text-accent-foreground"
				rel="noreferrer"
			>
				<CarbonArrowUpRight class="mr-1.5 shrink-0 text-xs " />
				Dataset page
			</a>
		{/if}

		{#if model.websiteUrl}
			<a
				href={model.websiteUrl}
				target="_blank"
				class="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-sm hover:bg-accent hover:text-accent-foreground"
				rel="noreferrer"
			>
				<CarbonArrowUpRight class="mr-1.5 shrink-0 text-xs " />
				Model website
			</a>
		{/if}

		{#if publicConfig.isHuggingChat}
			{#if !model?.isRouter}
				<a
					href={"https://huggingface.co/" + model.name + "?inference_api=true"}
					target="_blank"
					class="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-sm hover:bg-accent hover:text-accent-foreground"
					rel="noreferrer"
				>
					<CarbonCode class="mr-1.5 shrink-0 text-xs" />
					Use via API
				</a>
				<a
					href={"https://huggingface.co/" + model.name}
					target="_blank"
					class="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-sm hover:bg-accent hover:text-accent-foreground"
					rel="noreferrer"
				>
					<CarbonArrowUpRight class="mr-1.5 shrink-0 text-xs" />
					View model card
				</a>
			{/if}
			<CopyToClipBoardBtn
				value="{publicConfig.PUBLIC_ORIGIN || page.url.origin}{base}/models/{model.id}"
				classNames="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-sm hover:bg-accent hover:text-accent-foreground"
			>
				<div class="flex items-center gap-1.5">
					<CarbonCopy class="shrink-0 text-xs" />Copy direct link
				</div>
			</CopyToClipBoardBtn>
		{/if}
	</div>

	<div class="relative flex w-full flex-col gap-2">
		{#if model?.isRouter}
			<p class="mb-3 mt-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
				<IconOmni classNames="-translate-y-px" /> Omni routes your messages to the best underlying model
				depending on your request.
			</p>
		{/if}
		<div class="flex w-full flex-row items-center justify-between">
			<h3 class="text-[15px] font-semibold text-foreground">System Prompt</h3>
			<div class="flex items-center gap-2">
				<div
					class="flex select-none items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
				>
					<span>Enabled</span>
					<Switch
						name="customPromptEnabled"
						size="sm"
						bind:checked={getCustomPromptEnabled, setCustomPromptEnabled}
					/>
				</div>
				{#if hasCustomPreprompt}
					<button
						type="button"
						aria-label="Reset system prompt"
						title="Reset to default"
						class="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
						onclick={(e) => {
							e.stopPropagation();
							settings.update((s) => ({
								...s,
								customPrompts: { ...s.customPrompts, [modelId]: model.preprompt },
							}));
						}}
					>
						<CarbonReset class="size-3.5" />
					</button>
				{/if}
			</div>
		</div>

		<textarea
			aria-label="Custom system prompt"
			rows="8"
			disabled={!getCustomPromptEnabled()}
			class="scrollbar-custom w-full resize-none rounded-xl border border-border bg-muted p-3 text-[13px] text-foreground"
			class:opacity-30={!getCustomPromptEnabled()}
			bind:value={getCustomPrompt, setCustomPrompt}
		></textarea>
		<!-- Capabilities -->
		<div class="mt-3 rounded-2xl border border-border bg-card px-4 shadow-md">
			<div class="divide-y divide-border">
				<div
					class="flex items-start justify-between gap-4 rounded-xl px-1 py-3 transition-colors hover:bg-accent/50"
				>
					<div>
						<div class="text-[13px] font-medium text-gray-800 dark:text-gray-200">
							Tool calling (functions)
						</div>
						<p class="text-[12px] text-muted-foreground">
							Enable tools and allow the model to call them in chat.
						</p>
					</div>
					<Switch name="forceTools" bind:checked={getToolsOverride, setToolsOverride} />
				</div>

				<div
					class="flex items-start justify-between gap-4 rounded-xl px-1 py-3 transition-colors hover:bg-accent/50"
				>
					<div>
						<div class="text-[13px] font-medium text-foreground">
							Multimodal support (image inputs)
						</div>
						<p class="text-[12px] text-muted-foreground">
							Enable image uploads and send images to this model.
						</p>
					</div>
					<Switch
						name="forceMultimodal"
						bind:checked={getMultimodalOverride, setMultimodalOverride}
					/>
				</div>

				{#if model?.isRouter}
					<div
						class="flex items-start justify-between gap-4 rounded-xl px-1 py-3 transition-colors hover:bg-accent/50"
					>
						<div>
							<div class="text-[13px] font-medium text-foreground">Hide prompt examples</div>
							<p class="text-[12px] text-muted-foreground">
								Hide the prompt suggestions above the chat input.
							</p>
						</div>
						<Switch
							name="hidePromptExamples"
							bind:checked={getHidePromptExamples, setHidePromptExamples}
						/>
					</div>
				{/if}
			</div>
		</div>

		{#if publicConfig.isHuggingChat && model.providers?.length && !model?.isRouter}
			<div
				class="mt-3 flex flex-col items-start gap-2.5 rounded-2xl border border-border bg-card px-4 py-3 shadow-md"
			>
				<div>
					<div class="text-[13px] font-medium text-foreground">Inference Providers</div>
					<p class="text-[12px] text-muted-foreground">
						Choose which Inference Provider to use with this model. You can also manage provider
						preferences in <a
							class="underline decoration-muted-foreground/50 hover:decoration-muted-foreground"
							target="_blank"
							href="https://huggingface.co/settings/inference-providers/settings"
							>your HF settings</a
						>.
					</p>
				</div>
				<Select.Root
					type="single"
					value={getProviderOverride()}
					onValueChange={(v) => v && setProviderOverride(v)}
				>
					<Select.Trigger
						aria-label="Select inference provider"
						class="inline-flex w-auto items-center justify-between gap-2 rounded-lg border border-border bg-card px-2 py-2 text-sm text-foreground hover:bg-accent"
					>
						{@const currentValue = getProviderOverride()}
						{@const currentPolicy = PROVIDER_POLICIES.find((p) => p.value === currentValue)}
						{@const currentProvider = providerList.find((p) => p.provider === currentValue)}
						<span class="flex items-center gap-2">
							{#if currentValue === "auto"}
								<span class="grid size-5 flex-none place-items-center rounded-md bg-muted">
									<CarbonMagicWandFilled class="size-3 text-muted-foreground" />
								</span>
							{:else if currentValue === "fastest"}
								<span
									class="grid size-5 flex-none place-items-center rounded-md bg-green-500/10 text-green-600 dark:text-green-500"
								>
									<IconFast classNames="size-3" />
								</span>
							{:else if currentValue === "cheapest"}
								<span
									class="grid size-5 flex-none place-items-center rounded-md bg-primary/10 text-primary"
								>
									<IconCheap classNames="size-3" />
								</span>
							{:else if currentProvider}
								{@const hubOrg =
									PROVIDERS_HUB_ORGS[currentValue as keyof typeof PROVIDERS_HUB_ORGS]}
								{#if hubOrg}
									<span
										class="flex size-5 flex-none items-center justify-center rounded-md bg-muted p-0.5"
									>
										<img
											src="https://huggingface.co/api/avatars/{hubOrg}"
											alt=""
											class="size-full rounded"
										/>
									</span>
								{/if}
							{/if}
							{currentPolicy?.label ?? currentProvider?.provider ?? currentValue}
						</span>
						<CarbonChevronDown class="size-4 text-muted-foreground" />
					</Select.Trigger>
					<Select.Portal>
						<Select.Content
							class="scrollbar-custom z-50 max-h-60 overflow-y-auto rounded-xl border border-border bg-card/95 p-1 shadow-lg backdrop-blur"
							sideOffset={4}
						>
							<Select.Group>
								<Select.GroupHeading class="px-2 py-1.5 text-xs font-medium text-muted-foreground">
									Selection mode
								</Select.GroupHeading>
								{#each PROVIDER_POLICIES as opt (opt.value)}
									<Select.Item
										value={opt.value}
										class="flex cursor-pointer select-none items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none data-[highlighted]:bg-accent"
									>
										{#if opt.value === "auto"}
											<span class="grid size-5 flex-none place-items-center rounded-md bg-muted">
												<CarbonMagicWandFilled class="size-3 text-muted-foreground" />
											</span>
										{:else if opt.value === "fastest"}
											<span
												class="grid size-5 flex-none place-items-center rounded-md bg-green-500/10 text-green-600 dark:text-green-500"
											>
												<IconFast classNames="size-3" />
											</span>
										{:else if opt.value === "cheapest"}
											<span
												class="grid size-5 flex-none place-items-center rounded-md bg-primary/10 text-primary"
											>
												<IconCheap classNames="size-3" />
											</span>
										{/if}
										<span class="flex-1">{opt.label}</span>
										{#if getProviderOverride() === opt.value}
											<LucideCheck class="size-4 text-muted-foreground" />
										{/if}
									</Select.Item>
								{/each}
							</Select.Group>
							<div class="my-1 h-px bg-border"></div>
							<Select.Group>
								<Select.GroupHeading class="px-2 py-1.5 text-xs font-medium text-muted-foreground">
									Specific provider
								</Select.GroupHeading>
								{#each providerList as prov (prov.provider)}
									{@const hubOrg =
										PROVIDERS_HUB_ORGS[prov.provider as keyof typeof PROVIDERS_HUB_ORGS]}
									<Select.Item
										value={prov.provider}
										class="flex cursor-pointer select-none items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none data-[highlighted]:bg-accent"
									>
										{#if hubOrg}
											<span
												class="flex size-5 flex-none items-center justify-center rounded-md bg-muted p-0.5"
											>
												<img
													src="https://huggingface.co/api/avatars/{hubOrg}"
													alt=""
													class="size-full rounded"
												/>
											</span>
										{:else}
											<span class="size-5"></span>
										{/if}
										<span class="flex-1">{prov.provider}</span>
										{#if getProviderOverride() === prov.provider}
											<LucideCheck class="size-4 text-muted-foreground" />
										{/if}
									</Select.Item>
								{/each}
							</Select.Group>
						</Select.Content>
					</Select.Portal>
				</Select.Root>
			</div>
		{/if}
		<!-- Tokenizer-based token counting disabled in this build -->
	</div>
</div>
