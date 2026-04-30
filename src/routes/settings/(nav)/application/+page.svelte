<script lang="ts">
	import { browser } from "$app/environment";
	import { goto } from "$app/navigation";
	import { base } from "$app/paths";
	import { page } from "$app/state";
	import { useAPIClient, handleResponse } from "$lib/APIClient";
	import Switch from "$lib/components/Switch.svelte";
	import IconPro from "$lib/components/icons/IconPro.svelte";
	import { error } from "$lib/stores/errors";
	import { useSettingsStore } from "$lib/stores/settings";
	import { getThemePreference, setTheme, type ThemePreference } from "$lib/switchTheme";
	import type { StreamingMode } from "$lib/types/Settings";
	import { supportsHaptics } from "$lib/utils/haptics";
	import { getLoginUrl } from "$lib/utils/auth";
	import { usePublicConfig } from "$lib/utils/PublicConfig.svelte";
	import { onMount } from "svelte";
	import CarbonArrowUpRight from "~icons/carbon/arrow-up-right";
	import CarbonLogoGithub from "~icons/carbon/logo-github";
	import CarbonTrashCan from "~icons/carbon/trash-can";

	const publicConfig = usePublicConfig();
	let settings = useSettingsStore();

	const sectionCardClass =
		"overflow-hidden rounded-xl border border-border/60 bg-card/70 shadow-sm backdrop-blur";
	const sectionHeaderClass = "border-b border-border/60 px-4 py-3 sm:px-5";
	const sectionBodyClass = "p-2 sm:p-3";
	const rowClass =
		"flex flex-col gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-accent/50 sm:flex-row sm:items-center sm:justify-between";
	const rowLabelClass = "min-w-0 flex-1";
	const rowTitleClass = "text-sm font-semibold text-card-foreground";
	const rowBodyClass = "mt-1 text-sm text-muted-foreground";
	const selectClass =
		"h-10 min-w-[9.5rem] rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary/50";
	const secondaryButtonClass =
		"inline-flex min-h-10 items-center justify-center rounded-xl border border-input bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground";
	const linkRowClass =
		"flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-accent-foreground";

	const authProviderLabels = {
		pin: "PIN",
		"better-auth": "Email",
		"legacy-oidc": "Legacy OIDC",
		"trusted-header": "Trusted Header",
	} as const;

	function getProviderLabel(provider?: keyof typeof authProviderLabels) {
		return provider ? authProviderLabels[provider] : "Signed in";
	}

	function getShareWithAuthors() {
		return $settings.shareConversationsWithModelAuthors;
	}

	function setShareWithAuthors(v: boolean) {
		settings.update((s) => ({ ...s, shareConversationsWithModelAuthors: v }));
	}

	function getStreamingMode() {
		return $settings.streamingMode;
	}

	function setStreamingMode(v: StreamingMode) {
		settings.update((s) => ({ ...s, streamingMode: v }));
	}

	function getDirectPaste() {
		return $settings.directPaste;
	}

	function setDirectPaste(v: boolean) {
		settings.update((s) => ({ ...s, directPaste: v }));
	}

	function getHapticsEnabled() {
		return $settings.hapticsEnabled;
	}

	function setHapticsEnabled(v: boolean) {
		settings.update((s) => ({ ...s, hapticsEnabled: v }));
	}

	function getBillingOrganization() {
		return $settings.billingOrganization ?? "";
	}

	function setBillingOrganization(v: string) {
		settings.update((s) => ({ ...s, billingOrganization: v }));
	}

	function getOpencodeApiKey() {
		return $settings.opencodeApiKey ?? "";
	}

	function setOpencodeApiKey(v: string) {
		settings.update((s) => ({ ...s, opencodeApiKey: v }));
	}

	const client = useAPIClient();

	const user = $derived(page.data.user);
	const accountDisplayName = $derived(
		user?.name || user?.username || user?.email || "Your account"
	);
	const accountSecondaryLabel = $derived(
		user?.email && user.email !== accountDisplayName
			? user.email
			: user?.username && user.username !== accountDisplayName
				? user.username
				: undefined
	);
	const accountInitial = $derived(accountDisplayName.slice(0, 1).toUpperCase());
	const providerLabel = $derived(
		getProviderLabel(user?.authProvider as keyof typeof authProviderLabels | undefined)
	);
	const providerBadgeClass = "bg-primary/6 text-muted-foreground";
	const loginHref = $derived(getLoginUrl(page.url.pathname, page.url.search));
	const billingOrganization = $derived($settings.billingOrganization ?? "");

	let OPENAI_BASE_URL = $state<string | null>(null);

	type BillingOrg = { sub: string; name: string; preferred_username: string };
	let billingOrgs = $state<BillingOrg[]>([]);
	let billingOrgsLoading = $state(false);
	let billingOrgsError = $state<string | null>(null);

	onMount(async () => {
		try {
			const cfg = await client.debug.config.get().then(handleResponse);
			OPENAI_BASE_URL = (cfg as { OPENAI_BASE_URL?: string }).OPENAI_BASE_URL || null;
		} catch {
			// Ignore if the debug endpoint is unavailable.
		}

		if (publicConfig.isHuggingChat && page.data.user) {
			billingOrgsLoading = true;

			try {
				const data = (await client.user["billing-orgs"].get().then(handleResponse)) as {
					userCanPay: boolean;
					organizations: BillingOrg[];
					currentBillingOrg?: string;
				};

				billingOrgs = data.organizations ?? [];

				if (data.currentBillingOrg !== getBillingOrganization()) {
					setBillingOrganization(data.currentBillingOrg ?? "");
				}
			} catch {
				billingOrgsError = "Failed to load billing options";
			} finally {
				billingOrgsLoading = false;
			}
		}
	});

	let themePref = $state<ThemePreference>(browser ? getThemePreference() : "system");
	let refreshing = $state(false);
	let refreshMessage = $state<string | null>(null);

	const shouldShowResources = $derived(
		Boolean(
			publicConfig.isHuggingChat ||
			publicConfig.PUBLIC_COMMIT_SHA ||
			OPENAI_BASE_URL ||
			page.data.isAdmin
		)
	);
</script>

<div class="flex w-full flex-col gap-6 pb-2">
	<div class="flex flex-col gap-2">
		<p class="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
			Application Settings
		</p>
		<div>
			<h1 class="text-2xl font-semibold text-card-foreground">Application Settings</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Manage the account this app uses, how chats behave, and the shared resources attached to
				your workspace.
			</p>
		</div>
	</div>

	<section class={sectionCardClass}>
		<div class="relative overflow-hidden px-4 py-4 sm:px-5 sm:py-5">
			{#if user}
				<div class="relative flex flex-col gap-5">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-start">
						{#if user.avatarUrl}
							<img
								src={user.avatarUrl}
								class="size-14 rounded-lg border border-border object-cover shadow-sm"
								alt={accountDisplayName}
							/>
						{:else}
							<div
								class="flex size-14 items-center justify-center rounded-lg bg-primary text-lg font-semibold text-primary-foreground shadow-sm"
							>
								{accountInitial}
							</div>
						{/if}

						<div class="min-w-0 flex-1">
							<p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
								Account
							</p>
							<h2 class="mt-1 truncate text-xl font-semibold text-card-foreground">
								{accountDisplayName}
							</h2>
							{#if accountSecondaryLabel}
								<p class="mt-1 truncate text-sm text-muted-foreground">
									{accountSecondaryLabel}
								</p>
							{/if}
							<p class="mt-3 max-w-2xl text-sm text-muted-foreground">
								Your chats and preferences are synced to this account.
							</p>
						</div>

						<div class="flex flex-wrap gap-2 sm:max-w-[16rem] sm:justify-end">
							<span
								class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold {providerBadgeClass}"
							>
								{providerLabel}
							</span>
							{#if page.data.isAdmin}
								<span
									class="inline-flex items-center rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300"
								>
									Admin
								</span>
							{/if}
							{#if user.billing?.plan === "pro"}
								<span
									class="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
								>
									<IconPro classNames="!mr-0 !size-3.5" />
									PRO
								</span>
							{/if}
							{#if user.isEarlyAccess}
								<span
									class="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
								>
									Early Access
								</span>
							{/if}
						</div>
					</div>

					<div
						class="flex flex-col gap-3 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between"
					>
						<div class="flex min-h-10 flex-col justify-center text-sm text-muted-foreground">
							{#if user.authProvider === "clerk"}
								<p>Signed in with Clerk-backed authentication.</p>
							{:else if user.authProvider}
								<p>Signed in with {providerLabel.toLowerCase()} authentication.</p>
							{:else}
								<p>Signed in and syncing your app state to this account.</p>
							{/if}
							{#if refreshMessage}
								<p class="mt-1 text-xs text-muted-foreground">{refreshMessage}</p>
							{/if}
						</div>

						<div class="flex flex-col gap-2 sm:flex-row">
							{#if page.data.isAdmin}
								<button
									class={secondaryButtonClass}
									type="button"
									onclick={async () => {
										try {
											refreshing = true;
											refreshMessage = null;
											const res = await client.models.refresh.post().then(handleResponse);
											const delta = `+${res.added.length} -${res.removed.length} ~${res.changed.length}`;
											refreshMessage = `Refreshed in ${res.durationMs} ms | ${delta} | total ${res.total}`;
											await goto(page.url.pathname, { invalidateAll: true });
										} catch (e) {
											console.error(e);
											$error = "Model refresh failed";
										} finally {
											refreshing = false;
										}
									}}
									disabled={refreshing}
								>
									{refreshing ? "Refreshing..." : "Refresh models"}
								</button>
							{/if}

							<a href={`${base}/logout`} class={secondaryButtonClass}>Log out</a>
						</div>
					</div>
				</div>
			{:else}
				<div class="relative flex flex-col gap-5">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-start">
						<div
							class="flex size-14 items-center justify-center rounded-lg bg-primary text-lg font-semibold text-primary-foreground shadow-sm"
						>
							?
						</div>

						<div class="min-w-0 flex-1">
							<p
								class="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground"
							>
								Account
							</p>
							<h2 class="mt-2 text-2xl font-semibold text-card-foreground">Create your account</h2>
							<p class="mt-3 max-w-2xl text-sm text-muted-foreground">
								Create a free account with just a PIN to keep your chats and settings across
								browsers and devices.
							</p>
						</div>
					</div>

					<div
						class="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between"
					>
						<p class="min-h-10 text-sm text-muted-foreground">
							{#if page.data.loginEnabled}
								Use your PIN to sign in and continue where you left off.
							{:else}
								Sign-in is not enabled on this deployment, so settings remain local to this device.
							{/if}
						</p>

						{#if page.data.loginEnabled}
							<a
								href={loginHref}
								class="inline-flex min-h-9 items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:brightness-105"
							>
								Sign in
							</a>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</section>

	<section class={sectionCardClass}>
		<div class={sectionHeaderClass}>
			<p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
				Preferences
			</p>
			<h2 class="mt-1 text-lg font-semibold text-card-foreground">How chat behaves</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				These defaults apply across conversations in this app.
			</p>
		</div>
		<div class={sectionBodyClass}>
			<div class="flex flex-col gap-1.5">
				{#if publicConfig.PUBLIC_APP_DATA_SHARING === "1"}
					<div class={rowClass}>
						<div class={rowLabelClass}>
							<div class={rowTitleClass}>Share with model authors</div>
							<p class={rowBodyClass}>Sharing your data helps improve open models over time.</p>
						</div>
						<div class="flex min-h-10 items-center">
							<Switch
								name="shareConversationsWithModelAuthors"
								bind:checked={getShareWithAuthors, setShareWithAuthors}
							/>
						</div>
					</div>
				{/if}

				<div class={rowClass}>
					<div class={rowLabelClass}>
						<div class={rowTitleClass}>Streaming mode</div>
						<p class={rowBodyClass}>Choose how assistant text appears while generating.</p>
					</div>
					<select
						class={selectClass}
						value={getStreamingMode()}
						onchange={(e) => setStreamingMode(e.currentTarget.value as StreamingMode)}
					>
						<option value="smooth">Smooth stream</option>
						<option value="raw">Raw stream</option>
					</select>
				</div>

				<div class={rowClass}>
					<div class={rowLabelClass}>
						<div class={rowTitleClass}>Paste text directly</div>
						<p class={rowBodyClass}>Paste long text directly into chat instead of a file.</p>
					</div>
					<div class="flex min-h-10 items-center">
						<Switch name="directPaste" bind:checked={getDirectPaste, setDirectPaste} />
					</div>
				</div>

				{#if supportsHaptics()}
					<div class={rowClass}>
						<div class={rowLabelClass}>
							<div class={rowTitleClass}>Haptic feedback</div>
							<p class={rowBodyClass}>Vibrate on taps and actions on supported devices.</p>
						</div>
						<div class="flex min-h-10 items-center">
							<Switch name="hapticsEnabled" bind:checked={getHapticsEnabled, setHapticsEnabled} />
						</div>
					</div>
				{/if}

				<div class={rowClass}>
					<div class={rowLabelClass}>
						<div class={rowTitleClass}>Theme</div>
						<p class={rowBodyClass}>Choose light, dark, or follow system.</p>
					</div>
					<select
						class={selectClass}
						value={themePref}
						onchange={(e) => {
							const v = e.currentTarget.value as ThemePreference;
							setTheme(v);
							themePref = v;
						}}
					>
						<option value="system">System</option>
						<option value="light">Light</option>
						<option value="dark">Dark</option>
					</select>
				</div>
			</div>
		</div>
	</section>

	{#if publicConfig.isHuggingChat && user}
		<section class={sectionCardClass}>
			<div class={sectionHeaderClass}>
				<p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
					Billing
				</p>
				<h2 class="mt-1 text-lg font-semibold text-card-foreground">Usage and organizations</h2>
				<p class="mt-1 text-sm text-muted-foreground">
					Select where provider usage is billed and review your inference provider activity.
				</p>
			</div>
			<div class={sectionBodyClass}>
				<div class="flex flex-col gap-1.5">
					<div class={rowClass}>
						<div class={rowLabelClass}>
							<div class={rowTitleClass}>Bill usage to</div>
							<p class={rowBodyClass}>
								Choose between personal and organization billing when your account is eligible.
							</p>
						</div>
						<div class="flex min-h-10 items-center">
							{#if billingOrgsLoading}
								<span class="text-sm text-muted-foreground">Loading...</span>
							{:else if billingOrgsError}
								<span class="text-sm text-red-500">{billingOrgsError}</span>
							{:else}
								<select
									class={selectClass}
									value={billingOrganization}
									onchange={(e) => setBillingOrganization(e.currentTarget.value)}
								>
									<option value="">Personal</option>
									{#each billingOrgs as org}
										<option value={org.preferred_username}>{org.name}</option>
									{/each}
								</select>
							{/if}
						</div>
					</div>

					<div class={rowClass}>
						<div class={rowLabelClass}>
							<div class={rowTitleClass}>Providers Usage</div>
							<p class={rowBodyClass}>
								See which providers you use and choose your preferred ones.
							</p>
						</div>
						<a
							href={billingOrganization
								? `https://huggingface.co/organizations/${billingOrganization}/settings/inference-providers/overview`
								: "https://huggingface.co/settings/inference-providers/overview"}
							target="_blank"
							rel="noreferrer"
							class={secondaryButtonClass}
						>
							View Usage
						</a>
					</div>
				</div>
			</div>
		</section>
	{/if}

	<section class={sectionCardClass}>
		<div class={sectionHeaderClass}>
			<p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
				API Keys
			</p>
			<h2 class="mt-1 text-lg font-semibold text-card-foreground">Provider credentials</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				Add your own API keys to override the default provider credentials.
			</p>
		</div>
		<div class={sectionBodyClass}>
			<div class="flex flex-col gap-1.5">
				<div class={rowClass}>
					<div class={rowLabelClass}>
						<div class={rowTitleClass}>Opencode Go API key</div>
						<p class={rowBodyClass}>
							Your personal API key for the Opencode Go API. Leave empty to use the server default.
						</p>
					</div>
					<div class="flex min-h-10 items-center">
						<input
							type="password"
							class="h-10 min-w-[12rem] rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary/50"
							value={getOpencodeApiKey()}
							oninput={(e) => setOpencodeApiKey(e.currentTarget.value)}
							placeholder="sk-..."
						/>
					</div>
				</div>
			</div>
		</div>
	</section>

	{#if shouldShowResources}
		<section class={sectionCardClass}>
			<div class={sectionHeaderClass}>
				<p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
					Resources
				</p>
				<h2 class="mt-1 text-lg font-semibold text-card-foreground">
					Links and environment details
				</h2>
				<p class="mt-1 text-sm text-muted-foreground">
					Reference links, deployment details, and lightweight diagnostics.
				</p>
			</div>
			<div class={sectionBodyClass}>
				<div class="flex flex-col gap-1.5">
					{#if publicConfig.isHuggingChat}
						<a
							href="https://github.com/huggingface/chat-ui"
							target="_blank"
							rel="noreferrer"
							class={linkRowClass}
						>
							<span class="flex min-w-0 items-center gap-3">
								<CarbonLogoGithub class="shrink-0 text-base" />
								<span class="font-medium text-card-foreground">GitHub repository</span>
							</span>
							<CarbonArrowUpRight class="shrink-0 text-base text-muted-foreground/80" />
						</a>
						<a
							href="https://huggingface.co/spaces/huggingchat/chat-ui/discussions/764"
							target="_blank"
							rel="noreferrer"
							class={linkRowClass}
						>
							<span class="flex min-w-0 items-center gap-3">
								<CarbonArrowUpRight class="shrink-0 text-base" />
								<span class="font-medium text-card-foreground">
									Share your feedback on HuggingChat
								</span>
							</span>
							<CarbonArrowUpRight class="shrink-0 text-base text-muted-foreground/80" />
						</a>
						<a href={`${base}/privacy`} class={linkRowClass}>
							<span class="flex min-w-0 items-center gap-3">
								<CarbonArrowUpRight class="shrink-0 text-base" />
								<span class="font-medium text-card-foreground">About & Privacy</span>
							</span>
							<CarbonArrowUpRight class="shrink-0 text-base text-muted-foreground/80" />
						</a>
					{/if}

					{#if publicConfig.PUBLIC_COMMIT_SHA}
						<a
							href={`https://github.com/huggingface/chat-ui/commit/${publicConfig.PUBLIC_COMMIT_SHA}`}
							target="_blank"
							rel="noreferrer"
							class={linkRowClass}
						>
							<span class="min-w-0">
								<span class="block font-medium text-card-foreground"> Latest deployment </span>
								<span class="mt-1 block text-xs text-muted-foreground">
									Commit <code class="font-mono">{publicConfig.PUBLIC_COMMIT_SHA.slice(0, 7)}</code>
								</span>
							</span>
							<CarbonArrowUpRight class="shrink-0 text-base text-muted-foreground/80" />
						</a>
					{/if}
					{#if OPENAI_BASE_URL !== null}
						<div class="rounded-xl px-4 py-3">
							<div class="text-sm font-medium text-card-foreground">API Base URL</div>
							<code class="mt-1 block break-all text-xs text-muted-foreground">
								{OPENAI_BASE_URL}
							</code>
						</div>
					{/if}
				</div>
			</div>
		</section>
	{/if}

	<section
		class="overflow-hidden rounded-xl border border-red-200/60 bg-red-50/40 shadow-sm dark:border-red-900/50 dark:bg-red-950/15 dark:shadow-md"
	>
		<div class="border-b border-red-200/70 px-5 py-4 dark:border-red-900/50 sm:px-6">
			<p
				class="text-[11px] font-semibold uppercase tracking-[0.24em] text-red-600 dark:text-red-400"
			>
				Danger Zone
			</p>
			<h2 class="mt-1 text-lg font-semibold text-red-900 dark:text-red-100">Destructive actions</h2>
			<p class="mt-1 text-sm text-red-700/80 dark:text-red-200/80">
				These actions affect your entire chat history and cannot be undone.
			</p>
		</div>
		<div class="p-3 sm:p-4">
			<div
				class="flex flex-col gap-3 rounded-lg px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
			>
				<div class="min-w-0 flex-1">
					<div class="text-sm font-semibold text-red-900 dark:text-red-100">
						Delete all conversations
					</div>
					<p class="mt-1 text-sm text-red-700/80 dark:text-red-200/80">
						Remove every conversation from your account and return to a clean chat list.
					</p>
				</div>
				<button
					onclick={async (e) => {
						e.preventDefault();

						confirm("Are you sure you want to delete all conversations?") &&
							client.conversations
								.delete()
								.then(async () => {
									await goto(`${base}/`, { invalidateAll: true });
								})
								.catch((err) => {
									console.error(err);
									$error = err.message;
								});
					}}
					type="button"
					class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-950/20 dark:text-red-200 dark:hover:bg-red-950/40"
				>
					<CarbonTrashCan class="text-base" />
					Delete all conversations
				</button>
			</div>
		</div>
	</section>
</div>
