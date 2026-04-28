<script lang="ts">
import CarbonClose from "~icons/carbon/close";
import CarbonRenew from "~icons/carbon/renew";
import CarbonWarning from "~icons/carbon/warning";

interface Props {
debugUrl?: string;
url?: string;
error?: string;
onClose: () => void;
}

const IFRAME_LOAD_ERROR_MESSAGE =
"Couldn't load the live browser. Try reloading or close the panel.";

let { debugUrl, url, error, onClose }: Props = $props();

let loaded = $state(false);
let iframeKey = $state(0);
let panelError = $state<string | undefined>();

$effect(() => {
panelError = error;
if (!debugUrl) {
loaded = false;
}
});

function handleLoad() {
loaded = true;
panelError = undefined;
}

function handleIframeError() {
loaded = false;
panelError = IFRAME_LOAD_ERROR_MESSAGE;
}

function handleReload() {
if (!debugUrl) {
return;
}

loaded = false;
panelError = undefined;
iframeKey += 1;
}

const canRetry = $derived(Boolean(debugUrl));
const headerLabel = $derived(url ?? "Live Browser");
const visibleError = $derived(panelError ?? error);
const viewerSrc = $derived(
debugUrl
? `/api/browser-viewer?url=${encodeURIComponent(debugUrl)}`
: `/api/browser-viewer`
);
</script>

<div class="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-gray-700/50 bg-gray-900 shadow-xl">
<!-- Glassmorphism header bar -->
<div class="flex items-center gap-3 border-b border-gray-700/50 bg-gray-800/60 px-4 py-2.5 backdrop-blur-md">
<div class="flex min-w-0 flex-1 items-center gap-2">
<div class="size-2.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]"></div>
<span class="truncate text-sm font-medium text-gray-100">{headerLabel}</span>
</div>
<div class="flex items-center gap-1.5">
{#if canRetry}
<button
type="button"
class="flex size-8 items-center justify-center rounded-lg bg-white/5 text-gray-300 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white"
onclick={handleReload}
aria-label="Reload browser"
title="Reload"
>
<CarbonRenew class="size-4" />
</button>
{/if}
<button
type="button"
class="flex size-8 items-center justify-center rounded-lg bg-white/5 text-gray-300 backdrop-blur-sm transition-colors hover:bg-red-500/20 hover:text-red-400"
onclick={onClose}
aria-label="Close browser panel"
title="Close"
>
<CarbonClose class="size-4" />
</button>
</div>
</div>

{#if visibleError}
<div class="flex flex-1 items-center justify-center bg-gray-900 p-6">
<div class="flex max-w-sm flex-col items-center gap-4 text-center">
<div class="flex size-12 items-center justify-center rounded-2xl bg-red-500/10">
<CarbonWarning class="size-6 text-red-400" />
</div>
<div>
<p class="text-base font-semibold text-gray-100">Browser unavailable</p>
<p class="mt-1 text-sm text-gray-400">{visibleError}</p>
</div>
<div class="flex items-center gap-2.5">
{#if canRetry}
<button
type="button"
class="inline-flex items-center gap-2 rounded-xl border border-gray-600 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-200 transition-colors hover:bg-gray-700 hover:text-white"
onclick={handleReload}
>
<CarbonRenew class="size-4" />
Retry
</button>
{/if}
<button
type="button"
class="inline-flex items-center rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100"
onclick={onClose}
>
Close panel
</button>
</div>
</div>
</div>
{:else if debugUrl}
{#if !loaded}
<div class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-gray-900">
<!-- Modern skeleton loader -->
<div class="flex w-full max-w-xs flex-col gap-3 px-4">
<div class="flex items-center gap-3">
<div class="size-8 animate-pulse rounded-lg bg-gray-700"></div>
<div class="h-4 flex-1 animate-pulse rounded-md bg-gray-700"></div>
</div>
<div class="h-32 animate-pulse rounded-xl bg-gray-700/60"></div>
<div class="flex gap-2">
<div class="h-4 flex-1 animate-pulse rounded-md bg-gray-700"></div>
<div class="h-4 w-1/3 animate-pulse rounded-md bg-gray-700"></div>
</div>
<div class="h-4 w-2/3 animate-pulse rounded-md bg-gray-700"></div>
</div>
<span class="text-xs font-medium tracking-wide text-gray-500">Loading browser…</span>
</div>
{/if}
{#key viewerSrc + iframeKey}
<iframe
src={viewerSrc}
title="Live Browser"
class="h-full w-full flex-1 bg-gray-900"
onload={handleLoad}
onerror={handleIframeError}
sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
></iframe>
{/key}
{/if}
</div>