import { describe, expect, it } from "vitest";
import { normalizeClerkUrl } from "./clerk";

describe("normalizeClerkUrl", () => {
	it("returns undefined for blank or placeholder values", () => {
		expect(normalizeClerkUrl("")).toBeUndefined();
		expect(normalizeClerkUrl("   ")).toBeUndefined();
		expect(normalizeClerkUrl('"')).toBeUndefined();
		expect(normalizeClerkUrl("'")).toBeUndefined();
	});

	it("accepts valid URLs, including quoted Railway values", () => {
		expect(normalizeClerkUrl("https://accounts.example.com/sign-in")).toBe(
			"https://accounts.example.com/sign-in"
		);
		expect(normalizeClerkUrl('"https://accounts.example.com/sign-in"')).toBe(
			"https://accounts.example.com/sign-in"
		);
		expect(normalizeClerkUrl("'https://accounts.example.com/sign-in'")).toBe(
			"https://accounts.example.com/sign-in"
		);
	});

	it("returns undefined for invalid URLs", () => {
		expect(normalizeClerkUrl("not-a-url")).toBeUndefined();
		expect(normalizeClerkUrl('"not-a-url"')).toBeUndefined();
	});
});
