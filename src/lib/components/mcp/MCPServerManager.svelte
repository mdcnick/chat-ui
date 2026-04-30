<script lang="ts">
	import { usePublicConfig } from "$lib/utils/PublicConfig.svelte";
	import Modal from "$lib/components/Modal.svelte";
	import ServerCard from "./ServerCard.svelte";
	import AddServerForm from "./AddServerForm.svelte";
	import {
		allMcpServers,
		selectedServerIds,
		enabledServersCount,
		addCustomServer,
		refreshMcpServers,
		healthCheckServer,
	} from "$lib/stores/mcpServers";
	import type { KeyValuePair } from "$lib/types/Tool";
	import IconAddLarge from "~icons/carbon/add-large";
	import IconRefresh from "~icons/carbon/renew";
	import LucideHammer from "~icons/lucide/hammer";
	import IconMCP from "$lib/components/icons/IconMCP.svelte";

	const publicConfig = usePublicConfig();

	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();

	type View = "list" | "add";
	let currentView = $state<View>("list");
	let isRefreshing = $state(false);

	const baseServers = $derived($allMcpServers.filter((s) => s.type === "base"));
	const customServers = $derived($allMcpServers.filter((s) => s.type === "custom"));
	const enabledCount = $derived($enabledServersCount);

	function handleAddServer(serverData: { name: string; url: string; headers?: KeyValuePair[] }) {
		addCustomServer(serverData);
		currentView = "list";
	}

	function handleCancel() {
		currentView = "list";
	}

	async function handleRefresh() {
		if (isRefreshing) return;
		isRefreshing = true;
		try {
			await refreshMcpServers();
			// After refreshing the list, re-run health checks for all known servers
			const servers = $allMcpServers;
			await Promise.allSettled(servers.map((s) => healthCheckServer(s)));
		} finally {
			isRefreshing = false;
		}
	}
</script>

<Modal width={currentView === "list" ? "w-[800px]" : "w-[600px]"} {onclose} closeButton>
	<div class="p-6">
		<!-- Header -->
		<div class="mb-6">
			<h2 class="mb-1 text-xl font-semibold text-card-foreground">
				{#if currentView === "list"}
					MCP Servers
				{:else}
					Add MCP server
				{/if}
			</h2>
			<p class="text-sm text-muted-foreground">
				{#if currentView === "list"}
					Manage MCP servers to extend {publicConfig.PUBLIC_APP_NAME} with external tools.
				{:else}
					Add a custom MCP server to {publicConfig.PUBLIC_APP_NAME}.
				{/if}
			</p>
		</div>

		<!-- Content -->
		{#if currentView === "list"}
			<div
				class="mb-6 flex justify-between rounded-lg p-4 max-sm:flex-col max-sm:gap-4 sm:items-center {!enabledCount
					? 'bg-muted'
					: 'bg-primary/10'}"
			>
				<div class="flex items-center gap-3">
					<div
						class="flex size-10 items-center justify-center rounded-xl bg-primary/10"
						class:grayscale={!enabledCount}
					>
						<IconMCP classNames="size-8 text-primary" />
					</div>
					<div>
						<p class="text-sm font-semibold text-card-foreground">
							{$allMcpServers.length}
							{$allMcpServers.length === 1 ? "server" : "servers"} configured
						</p>
						<p class="text-xs text-muted-foreground">
							{enabledCount} enabled
						</p>
					</div>
				</div>

				<div class="flex gap-2">
					<button
						onclick={handleRefresh}
						disabled={isRefreshing}
						class="btn gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
					>
						<IconRefresh class="size-4 {isRefreshing ? 'animate-spin' : ''}" />
						{isRefreshing ? "Refreshing…" : "Refresh"}
					</button>
					<button
						onclick={() => (currentView = "add")}
						class="btn flex items-center gap-0.5 rounded-lg bg-primary py-1.5 pl-2 pr-3 text-sm font-medium text-primary-foreground shadow-glow-pink hover:brightness-105"
					>
						<IconAddLarge class="size-4" />
						Add Server
					</button>
				</div>
			</div>
			<div class="space-y-5">
				<!-- Base Servers -->
				{#if baseServers.length > 0}
					<div>
						<h3 class="mb-3 text-sm font-medium text-muted-foreground">
							Base Servers ({baseServers.length})
						</h3>
						<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
							{#each baseServers as server (server.id)}
								<ServerCard {server} isSelected={$selectedServerIds.has(server.id)} />
							{/each}
						</div>
					</div>
				{/if}

				<!-- Custom Servers -->
				<div>
					<h3 class="mb-3 text-sm font-medium text-muted-foreground">
						Custom Servers ({customServers.length})
					</h3>
					{#if customServers.length === 0}
						<div
							class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8"
						>
							<LucideHammer class="mb-3 size-12 text-muted-foreground/80" />
							<p class="mb-1 text-sm font-medium text-card-foreground">No custom servers yet</p>
							<p class="mb-4 text-xs text-muted-foreground">
								Add your own MCP servers with custom tools
							</p>
							<button
								onclick={() => (currentView = "add")}
								class="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow-pink hover:brightness-105"
							>
								<IconAddLarge class="size-4" />
								Add Your First Server
							</button>
						</div>
					{:else}
						<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
							{#each customServers as server (server.id)}
								<ServerCard {server} isSelected={$selectedServerIds.has(server.id)} />
							{/each}
						</div>
					{/if}
				</div>

				<!-- Help Text -->
				<div class="rounded-lg bg-muted/40 p-4 dark:bg-muted">
					<h4 class="mb-2 text-sm font-medium text-card-foreground">💡 Quick Tips</h4>
					<ul class="space-y-1 text-xs text-muted-foreground">
						<li>• Only connect to servers you trust</li>
						<li>• Enable servers to make their tools available in chat</li>
						<li>• Use the Health Check button to verify server connectivity</li>
						<li>• You can add HTTP headers for authentication when required</li>
					</ul>
				</div>
			</div>
		{:else if currentView === "add"}
			<AddServerForm onsubmit={handleAddServer} oncancel={handleCancel} />
		{/if}
	</div>
</Modal>
