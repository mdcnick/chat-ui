<script lang="ts">
	import type { KeyValuePair } from "$lib/types/Tool";
	import {
		validateMcpServerUrl,
		validateHeader,
		isSensitiveHeader,
	} from "$lib/utils/mcpValidation";
	import IconEye from "~icons/carbon/view";
	import IconEyeOff from "~icons/carbon/view-off";
	import IconTrash from "~icons/carbon/trash-can";
	import IconAdd from "~icons/carbon/add";
	import IconWarning from "~icons/carbon/warning";

	interface Props {
		onsubmit: (server: { name: string; url: string; headers?: KeyValuePair[] }) => void;
		oncancel: () => void;
		initialName?: string;
		initialUrl?: string;
		initialHeaders?: KeyValuePair[];
		submitLabel?: string;
	}

	let {
		onsubmit,
		oncancel,
		initialName = "",
		initialUrl = "",
		initialHeaders = [],
		submitLabel = "Add Server",
	}: Props = $props();

	let name = $state("");
	let url = $state("");
	let headers = $state<KeyValuePair[]>([]);

	$effect.pre(() => {
		name = initialName;
		url = initialUrl;
		headers = initialHeaders.length > 0 ? [...initialHeaders] : [];
	});
	let showHeaderValues = $state<Record<number, boolean>>({});
	let error = $state<string | null>(null);

	function addHeader() {
		headers = [...headers, { key: "", value: "" }];
	}

	function removeHeader(index: number) {
		headers = headers.filter((_, i) => i !== index);
		delete showHeaderValues[index];
	}

	function toggleHeaderVisibility(index: number) {
		showHeaderValues = {
			...showHeaderValues,
			[index]: !showHeaderValues[index],
		};
	}

	function validate(): boolean {
		if (!name.trim()) {
			error = "Server name is required";
			return false;
		}

		if (!url.trim()) {
			error = "Server URL is required";
			return false;
		}

		const urlValidation = validateMcpServerUrl(url);
		if (!urlValidation) {
			error = "Invalid URL.";
			return false;
		}

		// Validate headers
		for (let i = 0; i < headers.length; i++) {
			const header = headers[i];
			if (header.key.trim() || header.value.trim()) {
				const headerError = validateHeader(header.key, header.value);
				if (headerError) {
					error = `Header ${i + 1}: ${headerError}`;
					return false;
				}
			}
		}

		error = null;
		return true;
	}

	function handleSubmit() {
		if (!validate()) return;

		// Filter out empty headers
		const filteredHeaders = headers.filter((h) => h.key.trim() && h.value.trim());

		onsubmit({
			name: name.trim(),
			url: url.trim(),
			headers: filteredHeaders.length > 0 ? filteredHeaders : undefined,
		});
	}
</script>

<div class="space-y-4">
	<!-- Server Name -->
	<div>
		<label for="server-name" class="mb-1 block text-sm font-medium text-muted-foreground">
			Server Name <span class="text-red-500">*</span>
		</label>
		<input
			id="server-name"
			type="text"
			bind:value={name}
			placeholder="My MCP Server"
			class="mt-1.5 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground"
		/>
	</div>

	<!-- Server URL -->
	<div>
		<label for="server-url" class="mb-1 block text-sm font-medium text-muted-foreground">
			Server URL <span class="text-red-500">*</span>
		</label>
		<input
			id="server-url"
			type="url"
			bind:value={url}
			placeholder="https://example.com/mcp"
			class="mt-1.5 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground"
		/>
	</div>

	<!-- HTTP Headers -->
	<details class="rounded-lg border border-border">
		<summary class="cursor-pointer px-4 py-2 text-sm font-medium text-muted-foreground">
			HTTP Headers (Optional)
		</summary>
		<div class="space-y-2 border-t border-border p-4">
			{#if headers.length === 0}
				<p class="text-sm text-muted-foreground">No headers configured</p>
			{:else}
				{#each headers as header, i}
					<div class="flex gap-2">
						<input
							bind:value={header.key}
							placeholder="Header name (e.g., Authorization)"
							class="flex-1 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground"
						/>
						<div class="relative flex-1">
							<input
								bind:value={header.value}
								type={showHeaderValues[i] ? "text" : "password"}
								placeholder="Value"
								class="w-full rounded-lg border border-input bg-card px-3 py-2 pr-10 text-sm text-foreground"
							/>
							{#if isSensitiveHeader(header.key)}
								<button
									type="button"
									onclick={() => toggleHeaderVisibility(i)}
									class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground"
									title={showHeaderValues[i] ? "Hide value" : "Show value"}
								>
									{#if showHeaderValues[i]}
										<IconEyeOff class="size-4" />
									{:else}
										<IconEye class="size-4" />
									{/if}
								</button>
							{/if}
						</div>
						<button
							type="button"
							onclick={() => removeHeader(i)}
							class="rounded-lg bg-destructive/10 p-2 text-destructive hover:bg-destructive/20"
							title="Remove header"
						>
							<IconTrash class="size-4" />
						</button>
					</div>
				{/each}
			{/if}

			<button
				type="button"
				onclick={addHeader}
				class="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent dark:bg-muted dark:text-muted-foreground dark:hover:bg-accent"
			>
				<IconAdd class="size-4" />
				Add Header
			</button>

			<p class="text-xs text-muted-foreground">
				Common examples:<br />
				• Bearer token:
				<code class="rounded bg-muted px-1">Authorization: Bearer YOUR_TOKEN</code><br />
				• API key:
				<code class="rounded bg-muted px-1">X-API-Key: YOUR_KEY</code>
			</p>
		</div>
	</details>

	<!-- Security warning about custom MCP servers -->
	<div
		class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-yellow-900/40 dark:bg-yellow-900/20 dark:text-yellow-100"
	>
		<div class="flex items-start gap-3">
			<IconWarning class="mt-0.5 size-4 flex-none text-amber-600 dark:text-yellow-300" />
			<div class="text-sm leading-5">
				<p class="font-medium">Be careful with custom MCP servers.</p>
				<p class="mt-1 text-[13px] text-amber-800 dark:text-yellow-100/90">
					They receive your requests (including conversation context and any headers you add) and
					can run powerful tools on your behalf. Only add servers you trust and review their source.
					Never share confidental informations.
				</p>
			</div>
		</div>
	</div>

	<!-- Error message -->
	{#if error}
		<div class="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
			<p class="text-sm text-red-800 dark:text-red-200">{error}</p>
		</div>
	{/if}

	<!-- Actions -->
	<div class="flex justify-end gap-2">
		<button
			type="button"
			onclick={oncancel}
			class="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent dark:bg-muted dark:text-muted-foreground dark:hover:bg-accent"
		>
			Cancel
		</button>
		<button
			type="button"
			onclick={handleSubmit}
			class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow-pink hover:brightness-105"
		>
			{submitLabel}
		</button>
	</div>
</div>
