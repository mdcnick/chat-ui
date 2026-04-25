export function sanitizeGeneratedTitle(rawTitle: string, prompt: string): string {
	const fallback = fallbackTitle(prompt);
	const withoutThinking = rawTitle.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "");
	const candidate =
		withoutThinking
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter(Boolean)
			.at(-1) ?? "";
	const title = candidate
		.replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, "")
		.replace(/^(?:title|topic|subject|summary)\s*:\s*/i, "")
		.replace(/[.!?。！？]+$/g, "")
		.trim();

	if (!title || isMetaTitle(title, prompt)) {
		return fallback;
	}

	return title.split(/\s+/).slice(0, 8).join(" ");
}

function fallbackTitle(prompt: string): string {
	return (
		prompt
			.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "")
			.replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, "")
			.trim()
			.split(/\s+/g)
			.slice(0, 5)
			.join(" ")
			.replace(/[.!?:;,。！？：；，]+$/g, "")
			.trim() || "New Chat"
	);
}

function isMetaTitle(title: string, prompt: string): boolean {
	const normalized = title.toLowerCase();
	const promptSnippet = prompt.trim().slice(0, 40).toLowerCase();
	return (
		normalized.length > 80 ||
		/\b(user|assistant)\s+(wants|asked|asks|request|requested|message)\b/.test(normalized) ||
		/\b(title|topic|subject|summary)\s+for\b/.test(normalized) ||
		(promptSnippet.length > 12 && normalized.includes(promptSnippet))
	);
}
