import express, { type Request, type Response } from "express";
import { mkdir } from "node:fs/promises";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import * as z from "zod/v4";

import { loadConfig } from "./config.js";
import { generateMusic } from "./music.js";

const config = loadConfig();

function createServer() {
	const server = new McpServer(
		{
			name: "music-gen-mcp",
			version: "0.1.0",
		},
		{ capabilities: { logging: {} } }
	);

	server.registerTool(
		"generate_music",
		{
			description:
				"Generate a short music clip from a text prompt using a Hugging Face music model. Use this when the user wants background music, ambience, a jingle, soundtrack, or instrumental texture. After calling this tool, include the returned chat_ui_markdown in the final answer so Chat UI renders an audio player. Do not use it for speech transcription or factual lookup tasks.",
			inputSchema: {
				prompt: z
					.string()
					.min(8)
					.max(600)
					.describe("Detailed music prompt, including mood, genre, tempo, instruments, and texture."),
				duration_seconds: z
					.number()
					.int()
					.min(1)
					.max(60)
					.optional()
					.describe("Optional target duration in seconds. Some models may ignore or approximate it."),
				seed: z
					.number()
					.int()
					.min(0)
					.max(2_147_483_647)
					.optional()
					.describe("Optional deterministic seed if the selected model supports it."),
				model: z
					.string()
					.min(3)
					.optional()
					.describe(
						"Optional Hugging Face model ID override. Leave unset to use the server default model."
					),
			},
			outputSchema: {
				audio_url: z.string().url(),
				chat_ui_markdown: z.string(),
				mime_type: z.string(),
				model: z.string(),
				file_name: z.string(),
				prompt: z.string(),
				duration_seconds: z.number().int().optional(),
				seed: z.number().int().optional(),
			},
		},
		async ({ prompt, duration_seconds, seed, model }) => {
			const result = await generateMusic(config, {
				prompt,
				durationSeconds: duration_seconds,
				seed,
				model,
			});

			return {
				content: [
					{
						type: "text",
						text: [
							"Music generated successfully.",
							`audio_url: ${result.audioUrl}`,
							`mime_type: ${result.mimeType}`,
							`model: ${result.model}`,
							"",
							"To render an inline audio player in Chat UI, include this markdown exactly:",
							result.chatUiMarkdown,
						].join("\n"),
					},
				],
				structuredContent: {
					audio_url: result.audioUrl,
					chat_ui_markdown: result.chatUiMarkdown,
					mime_type: result.mimeType,
					model: result.model,
					file_name: result.fileName,
					prompt: result.prompt,
					duration_seconds: result.durationSeconds,
					seed: result.seed,
				},
			};
		}
	);

	return server;
}

async function main() {
	await mkdir(config.storageDir, { recursive: true });

	const app = createMcpExpressApp({ host: "0.0.0.0" });
	app.use("/media", express.static(config.storageDir, { fallthrough: false, index: false, maxAge: "1h" }));

	app.get("/", (_req: Request, res: Response) => {
		res.json({
			name: "music-gen-mcp",
			mcpPath: "/mcp",
			healthcheck: "/healthcheck",
			defaultModel: config.defaultModelId,
		});
	});

	app.get("/healthcheck", (_req: Request, res: Response) => {
		res.json({
			ok: true,
			service: "music-gen-mcp",
			defaultModel: config.defaultModelId,
			publicBaseUrl: config.publicBaseUrl,
			storageDir: config.storageDir,
		});
	});

	app.post("/mcp", async (req: Request, res: Response) => {
		const server = createServer();

		try {
			const transport = new StreamableHTTPServerTransport({
				sessionIdGenerator: undefined,
			});

			await server.connect(transport);
			await transport.handleRequest(req, res, req.body);

			res.on("close", () => {
				void transport.close();
				void server.close();
			});
		} catch (error) {
			console.error("Error handling MCP request:", error);
			if (!res.headersSent) {
				res.status(500).json({
					jsonrpc: "2.0",
					error: {
						code: -32603,
						message:
							error instanceof Error ? error.message : "Internal server error",
					},
					id: null,
				});
			}
		}
	});

	app.get("/mcp", (_req: Request, res: Response) => {
		res
			.status(405)
			.set("Allow", "POST")
			.json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null });
	});

	app.delete("/mcp", (_req: Request, res: Response) => {
		res
			.status(405)
			.set("Allow", "POST")
			.json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null });
	});

	app.listen(config.port, "0.0.0.0", () => {
		console.log(`music-gen-mcp listening on port ${config.port}`);
		console.log(`MCP endpoint: ${config.publicBaseUrl}/mcp`);
	});
}

main().catch((error) => {
	console.error("Failed to start music-gen-mcp:", error);
	process.exit(1);
});
