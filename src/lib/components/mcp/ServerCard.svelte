<script lang="ts">
	import type { MCPServer } from "$lib/types/Tool";
	import { toggleServer, healthCheckServer, deleteCustomServer } from "$lib/stores/mcpServers";
	import IconCheckmark from "~icons/carbon/checkmark-filled";
	import IconWarning from "~icons/carbon/warning-filled";
	import IconPending from "~icons/carbon/pending-filled";
	import IconRefresh from "~icons/carbon/renew";
	import IconTrash from "~icons/carbon/trash-can";
	import LucideHammer from "~icons/lucide/hammer";
	import IconSettings from "~icons/carbon/settings";
	import Switch from "$lib/components/Switch.svelte";
	import { getMcpServerFaviconUrl } from "$lib/utils/favicon";

	interface Props {
		server: MCPServer;
		isSelected: boolean;
	}

	let { server, isSelected }: Props = $props();

	let isLoadingHealth = $state(false);

	// Show a quick-access link ONLY for the exact HF MCP login endpoint
	import { isStrictHfMcpLogin as isStrictHfMcpLoginUrl } from "$lib/utils/hf";
	const isHfMcp = $derived.by(() => isStrictHfMcpLoginUrl(server.url));

	const statusInfo = $derived.by(() => {
		switch (server.status) {
			case "connected":
				return {
					label: "Connected",
					color: "text-green-600 dark:text-green-400",
					bgColor: "bg-green-100 dark:bg-green-900/20",
					icon: IconCheckmark,
				};
			case "connecting":
				return {
					label: "Connecting...",
					color: "text-primary",
					bgColor: "bg-primary/15",
					icon: IconPending,
				};
			case "error":
				return {
					label: "Error",
					color: "text-red-600 dark:text-red-400",
					bgColor: "bg-red-100 dark:bg-red-900/20",
					icon: IconWarning,
				};
			case "disconnected":
			default:
				return {
					label: "Unknown",
					color: "text-muted-foreground",
					bgColor: "bg-muted",
					icon: IconPending,
				};
		}
	});

	// Switch setter handles enable/disable (simple, idiomatic)
	function setEnabled(v: boolean) {
		if (v === isSelected) return;
		toggleServer(server.id);
		if (v && server.status !== "connected") handleHealthCheck();
	}

	async function handleHealthCheck() {
		isLoadingHealth = true;
		try {
			await healthCheckServer(server);
		} finally {
			isLoadingHealth = false;
		}
	}

	function handleDelete() {
		deleteCustomServer(server.id);
	}
</script>

<div
	class="rounded-lg border bg-gradient-to-br transition-colors {isSelected
		? 'border-primary/20 bg-primary/5 from-primary/5 to-transparent'
		: 'border-border bg-card from-black/5 dark:from-white/5'}"
>
	<div class="px-4 py-3.5">
		<!-- Header -->
		<div class="mb-3 flex items-start justify-between gap-3">
			<div class="min-w-0 flex-1">
				<div class="mb-0.5 flex items-center gap-2">
					<img
						src={getMcpServerFaviconUrl(server.url)}
						alt=""
						class="size-4 flex-shrink-0 rounded"
					/>
					<h3 class="truncate font-semibold text-card-foreground">
						{server.name}
					</h3>
				</div>
				<p class="truncate text-sm text-muted-foreground">
					{server.url}
				</p>
			</div>

			<!-- Enable Switch (function binding per Svelte 5 docs) -->
			<Switch name={`enable-${server.id}`} bind:checked={() => isSelected, setEnabled} />
		</div>

		<!-- Status -->
		{#if server.status}
			<div class="mb-2 flex items-center gap-2">
				<span
					class="inline-flex items-center gap-1 rounded-full {statusInfo.bgColor} py-0.5 pl-1.5 pr-2 text-xs font-medium {statusInfo.color}"
				>
					{#if server.status === "connected"}
						<IconCheckmark class="size-3" />
					{:else if server.status === "connecting"}
						<IconPending class="size-3" />
					{:else if server.status === "error"}
						<IconWarning class="size-3" />
					{:else}
						<IconPending class="size-3" />
					{/if}
					{statusInfo.label}
				</span>

				{#if server.tools && server.tools.length > 0}
					<span class="inline-flex items-center gap-1 text-xs text-muted-foreground">
						<LucideHammer class="size-3" />
						{server.tools.length}
						{server.tools.length === 1 ? "tool" : "tools"}
					</span>
				{/if}
			</div>
		{/if}

		<!-- Error Message -->
		{#if server.errorMessage}
			<div class="mb-2 flex items-center gap-2">
				<div
					class="line-clamp-6 break-words rounded bg-destructive/10 px-2 py-1 text-xs text-destructive"
				>
					{server.errorMessage}
				</div>
			</div>
		{/if}

		<!-- Actions -->
		<div class="flex flex-wrap gap-1">
			<button
				onclick={handleHealthCheck}
				disabled={isLoadingHealth}
				class="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-[.29rem] text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
			>
				<IconRefresh class="size-3 {isLoadingHealth ? 'animate-spin' : ''}" />
				Health Check
			</button>

			{#if isHfMcp}
				<a
					href="https://huggingface.co/settings/mcp"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-[.29rem] text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
					aria-label="Open Hugging Face MCP settings"
				>
					<IconSettings class="size-3" />
					Settings
				</a>
			{/if}

			{#if server.type === "custom"}
				<button
					onclick={handleDelete}
					class="flex items-center gap-1.5 rounded-lg border border-destructive/15 bg-destructive/10 px-2.5 py-[.29rem] text-xs font-medium text-destructive hover:bg-destructive/20"
				>
					<IconTrash class="size-3" />
					Delete
				</button>
			{/if}
		</div>

		<!-- Tools List (Expandable) -->
		{#if server.tools && server.tools.length > 0}
			<details class="mt-3">
				<summary class="cursor-pointer text-xs font-medium text-muted-foreground">
					Available Tools ({server.tools.length})
				</summary>
				<ul class="mt-2 space-y-1 text-xs">
					{#each server.tools as tool}
						<li class="text-muted-foreground">
							<span class="font-medium text-card-foreground">{tool.name}</span>
							{#if tool.description}
								<span class="text-muted-foreground">- {tool.description}</span>
							{/if}
						</li>
					{/each}
				</ul>
			</details>
		{/if}
	</div>
</div>
