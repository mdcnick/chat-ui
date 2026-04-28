import type { OpenAiTool } from "$lib/server/mcp/tools";
import { browserSessionStore } from "./sessionStore";
import { connectToSteelSession, clickInSession, typeInSession, extractFromSession } from "./steel";
import { logger } from "$lib/server/logger";

export const BROWSER_TOOL_NAMES = new Set([
	"browser_navigate",
	"browser_screenshot",
	"browser_click",
	"browser_type",
	"browser_extract",
	"browser_scroll",
]);

export const browserToolDefinitions: OpenAiTool[] = [
	{
		type: "function",
		function: {
			name: "browser_navigate",
			description:
				"Navigate the live browser to a URL or perform a Google search. Always follow with browser_screenshot to observe the result, then continue clicking or typing to complete the task.",
			parameters: {
				type: "object",
				properties: {
					url: {
						type: "string",
						description: "Full URL to navigate to (e.g. https://example.com)",
					},
					query: {
						type: "string",
						description: "Search query — navigates to Google search results if url is omitted",
					},
				},
			},
		},
	},
	{
		type: "function",
		function: {
			name: "browser_screenshot",
			description:
				"Observe the current browser page as a PNG image. Use this to see the page state, then immediately continue the task by clicking, typing, or navigating — do not stop here to summarize.",
			parameters: {
				type: "object",
				properties: {},
			},
		},
	},
	{
		type: "function",
		function: {
			name: "browser_click",
			description:
				"Click an element on the current page by CSS selector or (x, y) pixel coordinates.",
			parameters: {
				type: "object",
				properties: {
					selector: {
						type: "string",
						description: "CSS selector of the element to click (e.g. 'button#submit')",
					},
					x: { type: "number", description: "X pixel coordinate to click" },
					y: { type: "number", description: "Y pixel coordinate to click" },
				},
			},
		},
	},
	{
		type: "function",
		function: {
			name: "browser_type",
			description:
				"Type text into an input field on the current page. Optionally target a field by CSS selector.",
			parameters: {
				type: "object",
				properties: {
					text: { type: "string", description: "Text to type" },
					selector: {
						type: "string",
						description: "CSS selector of the input to fill (uses keyboard type if omitted)",
					},
				},
				required: ["text"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "browser_extract",
			description:
				"Extract visible text content from the current page (up to 10 000 characters). Optionally limit to a CSS-selected element.",
			parameters: {
				type: "object",
				properties: {
					selector: {
						type: "string",
						description: "CSS selector to extract text from (defaults to entire page body)",
					},
				},
			},
		},
	},
	{
		type: "function",
		function: {
			name: "browser_scroll",
			description:
				"Scroll the page or a specific element. Use to reveal content below the fold before clicking or extracting.",
			parameters: {
				type: "object",
				properties: {
					direction: {
						type: "string",
						enum: ["down", "up", "left", "right"],
						description: "Scroll direction (default: down)",
					},
					amount: {
						type: "number",
						description: "Pixels to scroll (default: 500)",
					},
					selector: {
						type: "string",
						description: "CSS selector of a scrollable element (defaults to window)",
					},
				},
			},
		},
	},
];

const SCREENSHOT_TIMEOUT_MS = 10_000;

export type BrowserToolResult = {
	text: string;
	imageData?: string;
};

export async function executeBrowserTool(
	toolName: string,
	args: Record<string, unknown>,
	conversationId: string
): Promise<BrowserToolResult> {
	if (toolName === "browser_navigate") {
		// Session creation is handled upstream in runMcpFlow (navCall block) before this call.
		// If no session exists here, Steel failed — return an error so the LLM can report it.
		const session = browserSessionStore.get(conversationId);
		const url = typeof args.url === "string" ? args.url : undefined;
		const query = typeof args.query === "string" ? args.query : undefined;
		const target =
			url ?? (query ? `https://www.google.com/search?q=${encodeURIComponent(query)}` : "");
		if (!session) {
			return {
				text: `Error: Could not start a browser session for "${target}". The browser service may be unavailable — please try again.`,
			};
		}
		return { text: `Navigated to: ${target}` };
	}

	const session = browserSessionStore.get(conversationId);
	if (!session) {
		return {
			text: "Error: no active browser session. Call browser_navigate first to open a page.",
		};
	}

	if (toolName === "browser_screenshot") {
		const browser = await connectToSteelSession(session.websocketUrl);
		try {
			const context = browser.contexts()[0] ?? (await browser.newContext());
			const page = context.pages()[0] ?? (await context.newPage());
			const buf = await page.screenshot({ type: "png", timeout: SCREENSHOT_TIMEOUT_MS });
			const b64 = buf.toString("base64");
			const pageUrl = page.url();
			const title = await page.title();
			// Extract visible text so the LLM can see page content even without vision.
			// Limit to 3 000 chars — enough to identify interactive elements.
			const bodyText: string = await page
				.evaluate(() => (document.body as HTMLElement).innerText ?? "")
				.catch(() => "");
			const visibleText = bodyText.replace(/\s+/g, " ").trim().slice(0, 3000);
			logger.debug({ conversationId, url: pageUrl }, "[browser] screenshot taken");
			return {
				text: `Page: "${title}" at ${pageUrl}\n\nVisible content:\n${visibleText || "(empty page)"}`,
				imageData: `data:image/png;base64,${b64}`,
			};
		} finally {
			await browser.close();
		}
	}

	if (toolName === "browser_click") {
		const selector = typeof args.selector === "string" ? args.selector : undefined;
		const x = typeof args.x === "number" ? args.x : undefined;
		const y = typeof args.y === "number" ? args.y : undefined;

		if (selector) {
			const result = await clickInSession(session.websocketUrl, selector);
			return { text: `Clicked "${selector}". Now at: ${result.url}` };
		}

		if (x !== undefined && y !== undefined) {
			const browser = await connectToSteelSession(session.websocketUrl);
			try {
				const context = browser.contexts()[0] ?? (await browser.newContext());
				const page = context.pages()[0] ?? (await context.newPage());
				await page.mouse.click(x, y);
				return { text: `Clicked at (${x}, ${y}). Page: ${page.url()}` };
			} finally {
				await browser.close();
			}
		}

		return { text: "Error: provide selector or both x and y coordinates." };
	}

	if (toolName === "browser_type") {
		const text = typeof args.text === "string" ? args.text : "";
		const selector = typeof args.selector === "string" ? args.selector : undefined;
		if (!text) return { text: "Error: text is required." };
		const result = await typeInSession(session.websocketUrl, text, selector);
		return {
			text: `Typed text${selector ? ` into "${selector}"` : ""}. Page: ${result.url}`,
		};
	}

	if (toolName === "browser_extract") {
		const selector = typeof args.selector === "string" ? args.selector : undefined;
		const result = await extractFromSession(session.websocketUrl, selector);
		return { text: result.text || "(no text content found)" };
	}

	if (toolName === "browser_scroll") {
		const direction = typeof args.direction === "string" ? args.direction : "down";
		const amount = typeof args.amount === "number" ? args.amount : 500;
		const selector = typeof args.selector === "string" ? args.selector : undefined;

		const browser = await connectToSteelSession(session.websocketUrl);
		try {
			const context = browser.contexts()[0] ?? (await browser.newContext());
			const page = context.pages()[0] ?? (await context.newPage());

			const dx = direction === "left" ? -amount : direction === "right" ? amount : 0;
			const dy = direction === "up" ? -amount : direction === "down" ? amount : 0;

			if (selector) {
				await page
					.locator(selector)
					.evaluate((el, [x, y]) => el.scrollBy(x as number, y as number), [dx, dy]);
			} else {
				await page.mouse.wheel(dx, dy);
			}
			return { text: `Scrolled ${direction} by ${amount}px. Page: ${page.url()}` };
		} finally {
			await browser.close();
		}
	}

	return { text: `Unknown browser tool: ${toolName}` };
}
