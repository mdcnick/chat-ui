import { describe, expect, it } from "vitest";
import {
	applyBrowserPanelUpdate,
	applyBrowserUpdateState,
	type BrowserPanelState,
} from "./browserPanelState";
import {
	MessageUpdateStatus,
	MessageUpdateType,
	type MessageBrowserUpdate,
} from "$lib/types/MessageUpdate";

function browserUpdate<T extends MessageBrowserUpdate["status"]>(
	update: Omit<Extract<MessageBrowserUpdate, { status: T }>, "type">
): Extract<MessageBrowserUpdate, { status: T }> {
	return {
		type: MessageUpdateType.Browser,
		...update,
	} as Extract<MessageBrowserUpdate, { status: T }>;
}

describe("browserPanelState", () => {
	it("keeps the live debugUrl stable across navigate updates", () => {
		const initial: BrowserPanelState = {
			debugUrl: "https://steel.example/live/session-1",
			url: "https://www.google.com/search?q=weather",
			error: "Old error",
		};

		const next = applyBrowserUpdateState(
			initial,
			browserUpdate({
				status: "navigate",
				sessionId: "steel-session-1",
				debugUrl: "https://steel.example/live/session-1",
				url: "https://example.com/result",
			})
		);

		expect(next).toEqual({
			debugUrl: "https://steel.example/live/session-1",
			url: "https://example.com/result",
			error: undefined,
		});
	});

	it("preserves a browser error state until close and ignores unrelated updates", () => {
		const errorState = applyBrowserPanelUpdate(
			{},
			browserUpdate({
				status: "error",
				url: "https://www.google.com/search?q=chat-ui",
				message: "Couldn’t open the browser panel. Try again.",
			})
		);

		const afterNonBrowser = applyBrowserPanelUpdate(errorState, {
			type: MessageUpdateType.Status,
			status: MessageUpdateStatus.Started,
		});
		const afterClose = applyBrowserPanelUpdate(
			afterNonBrowser,
			browserUpdate({
				status: "close",
				sessionId: "steel-session-2",
				debugUrl: "https://steel.example/live/session-2",
			})
		);

		expect(afterNonBrowser).toEqual(errorState);
		expect(afterClose).toEqual({ debugUrl: undefined, url: undefined, error: undefined });
	});

	it("preserves the debugUrl on browser errors so iframe retries can reuse the live session", () => {
		const initial: BrowserPanelState = {
			debugUrl: "https://steel.example/live/session-3",
			url: "https://example.com/loaded",
		};

		const next = applyBrowserUpdateState(
			initial,
			browserUpdate({
				status: "error",
				debugUrl: "https://steel.example/live/session-3",
				url: "https://example.com/loaded",
				message: "Couldn’t load the live browser. Try reloading or close the panel.",
			})
		);

		expect(next).toEqual({
			debugUrl: "https://steel.example/live/session-3",
			url: "https://example.com/loaded",
			error: "Couldn’t load the live browser. Try reloading or close the panel.",
		});
	});

	it("clears a browser error when a fresh open arrives", () => {
		const initial: BrowserPanelState = {
			url: "https://www.google.com/search?q=chat-ui",
			error: "Couldn’t open the browser panel. Try again.",
		};

		const next = applyBrowserUpdateState(
			initial,
			browserUpdate({
				status: "open",
				sessionId: "steel-session-2",
				debugUrl: "https://steel.example/live/session-2",
				url: "https://www.google.com/search?q=chat-ui",
			})
		);

		expect(next).toEqual({
			debugUrl: "https://steel.example/live/session-2",
			url: "https://www.google.com/search?q=chat-ui",
			error: undefined,
		});
	});
});
