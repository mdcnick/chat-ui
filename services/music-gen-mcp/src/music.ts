import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { AppConfig } from "./config.js";

type GenerateMusicInput = {
	prompt: string;
	durationSeconds?: number;
	seed?: number;
	model?: string;
};

type GeneratedMusic = {
	audioUrl: string;
	chatUiMarkdown: string;
	mimeType: string;
	model: string;
	fileName: string;
	prompt: string;
	durationSeconds?: number;
	seed?: number;
};

type HfErrorPayload = {
	error?: string;
	estimated_time?: number;
};

const MIME_TO_EXTENSION: Record<string, string> = {
	"audio/flac": "flac",
	"audio/mpeg": "mp3",
	"audio/mp3": "mp3",
	"audio/ogg": "ogg",
	"audio/wav": "wav",
	"audio/x-wav": "wav",
};

function inferExtension(mimeType: string): string {
	return MIME_TO_EXTENSION[mimeType.toLowerCase()] ?? "wav";
}

function buildInferenceUrl(config: AppConfig, model: string): string {
	if (config.hfEndpointUrl) {
		return config.hfEndpointUrl;
	}

	return `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(model)}`;
}

async function parseErrorMessage(response: Response): Promise<string> {
	const contentType = response.headers.get("content-type") ?? "";
	if (contentType.includes("application/json")) {
		const body = (await response.json().catch(() => null)) as HfErrorPayload | null;
		if (body?.error) return body.error;
		if (typeof body?.estimated_time === "number") {
			return `Model is loading. Estimated wait: ${Math.ceil(body.estimated_time)} seconds.`;
		}
	}

	const text = await response.text().catch(() => "");
	return text || `Hugging Face request failed with status ${response.status}.`;
}

export async function generateMusic(
	config: AppConfig,
	input: GenerateMusicInput
): Promise<GeneratedMusic> {
	const model = input.model?.trim() || config.defaultModelId;
	const response = await fetch(buildInferenceUrl(config, model), {
		method: "POST",
		headers: {
			Authorization: `Bearer ${config.huggingFaceApiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			inputs: input.prompt,
			parameters: {
				...(typeof input.durationSeconds === "number"
					? { duration: input.durationSeconds }
					: {}),
				...(typeof input.seed === "number" ? { seed: input.seed } : {}),
			},
		}),
		signal: AbortSignal.timeout(120_000),
	});

	if (!response.ok) {
		const message = await parseErrorMessage(response);
		throw new Error(`Music generation failed: ${message}`);
	}

	const arrayBuffer = await response.arrayBuffer();
	if (arrayBuffer.byteLength === 0) {
		throw new Error("Music generation failed: Hugging Face returned an empty audio file.");
	}

	const mimeType = response.headers.get("content-type") || "audio/wav";
	const extension = inferExtension(mimeType);
	const fileName = `${randomUUID()}.${extension}`;

	await mkdir(config.storageDir, { recursive: true });
	await writeFile(path.join(config.storageDir, fileName), Buffer.from(arrayBuffer));

	const audioUrl = `${config.publicBaseUrl}/media/${fileName}`;
	return {
		audioUrl,
		chatUiMarkdown: `![Generated music](${audioUrl})`,
		mimeType,
		model,
		fileName,
		prompt: input.prompt,
		durationSeconds: input.durationSeconds,
		seed: input.seed,
	};
}

export type { GenerateMusicInput, GeneratedMusic };
