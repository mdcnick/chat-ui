import { describe, expect, it } from "vitest";
import { sanitizeGeneratedTitle } from "./titleSanitizer";

describe("sanitizeGeneratedTitle", () => {
	it("falls back when a model returns title-generation meta text", () => {
		expect(
			sanitizeGeneratedTitle(
				'The user wants a title for the first message: "OpenCode smoke test after deploy: reply with exactly OK."',
				"OpenCode smoke test after deploy: reply with exactly OK."
			)
		).toBe("OpenCode smoke test after deploy");
	});

	it("strips hidden reasoning before using the generated title", () => {
		expect(
			sanitizeGeneratedTitle(
				"<think>I should produce a short title.</think>\nOpenCode smoke test",
				"OpenCode smoke test after deploy: reply with exactly OK."
			)
		).toBe("OpenCode smoke test");
	});

	it("keeps a short clean generated title", () => {
		expect(sanitizeGeneratedTitle("Browser search debugging", "Why is web search broken?")).toBe(
			"Browser search debugging"
		);
	});
});
