import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { Client, handle_file } from "@gradio/client";

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

type GenerateSongInput = {
	lyrics: string;
	textPrompt?: string;
	audioPromptUrl?: string;
	genre?: SongGenre;
	cfgCoefficient?: number;
	temperature?: number;
};

type GeneratedSong = {
	audioUrl: string;
	chatUiMarkdown: string;
	mimeType: string;
	fileName: string;
	lyrics: string;
	textPrompt?: string;
	audioPromptUrl?: string;
	genre: SongGenre;
	cfgCoefficient: number;
	temperature: number;
	spaceId: string;
	generatedInfo?: unknown;
};

type HfErrorPayload = {
	error?: string;
	estimated_time?: number;
};

type GradioFileLike =
	| string
	| {
			url?: string;
			path?: string;
			orig_name?: string;
			mime_type?: string;
	  };

const MIME_TO_EXTENSION: Record<string, string> = {
	"audio/flac": "flac",
	"audio/mpeg": "mp3",
	"audio/mp3": "mp3",
	"audio/ogg": "ogg",
	"audio/wav": "wav",
	"audio/x-wav": "wav",
};

const SONG_GENRES = [
	"Auto",
	"Pop",
	"Latin",
	"Rock",
	"Electronic",
	"Metal",
	"Country",
	"R&B/Soul",
	"Ballad",
	"Jazz",
	"World",
	"Hip-Hop",
	"Funk",
	"Soundtrack",
] as const;

type SongGenre = (typeof SONG_GENRES)[number];

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

async function storeAudioBuffer(
	config: AppConfig,
	buffer: ArrayBuffer,
	mimeType: string,
	suggestedName?: string
) {
	const extension = inferExtension(mimeType);
	const baseName = suggestedName?.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.[^.]+$/, "");
	const fileName = `${baseName || randomUUID()}.${extension}`;

	await mkdir(config.storageDir, { recursive: true });
	await writeFile(path.join(config.storageDir, fileName), Buffer.from(buffer));

	const audioUrl = `${config.publicBaseUrl}/media/${fileName}`;
	return {
		audioUrl,
		fileName,
		mimeType,
		chatUiMarkdown: `![Generated music](${audioUrl})`,
	};
}

function asAbsoluteUrl(value: string, baseUrl: string): string {
	if (/^https?:\/\//i.test(value)) return value;
	return new URL(
		value.replace(/^\//, ""),
		baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
	).toString();
}

function getGradioFileUrl(file: GradioFileLike, rootUrl: string): string | null {
	if (typeof file === "string") {
		return asAbsoluteUrl(file, rootUrl);
	}
	if (file?.url) return asAbsoluteUrl(file.url, rootUrl);
	if (file?.path) return asAbsoluteUrl(file.path, rootUrl);
	return null;
}

async function downloadRemoteAudio(config: AppConfig, file: GradioFileLike, rootUrl: string) {
	const remoteUrl = getGradioFileUrl(file, rootUrl);
	if (!remoteUrl) {
		throw new Error("Song generation failed: Space did not return an audio file URL.");
	}

	const response = await fetch(remoteUrl, {
		signal: AbortSignal.timeout(120_000),
	});
	if (!response.ok) {
		throw new Error(
			`Song generation failed: could not download generated audio (${response.status}).`
		);
	}

	const mimeType =
		response.headers.get("content-type") ||
		(typeof file === "object" && file?.mime_type) ||
		"audio/flac";

	return storeAudioBuffer(
		config,
		await response.arrayBuffer(),
		mimeType,
		typeof file === "object" ? file.orig_name : undefined
	);
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
				...(typeof input.durationSeconds === "number" ? { duration: input.durationSeconds } : {}),
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
	const stored = await storeAudioBuffer(config, arrayBuffer, mimeType);
	return {
		audioUrl: stored.audioUrl,
		chatUiMarkdown: stored.chatUiMarkdown,
		mimeType: stored.mimeType,
		model,
		fileName: stored.fileName,
		prompt: input.prompt,
		durationSeconds: input.durationSeconds,
		seed: input.seed,
	};
}

function extractSongError(info: unknown): string | null {
	if (typeof info === "string" && info.trim()) return info;
	if (info && typeof info === "object") {
		const maybeError = (info as Record<string, unknown>).error;
		if (typeof maybeError === "string" && maybeError.trim()) return maybeError;
	}
	return null;
}

export async function generateSong(
	config: AppConfig,
	input: GenerateSongInput
): Promise<GeneratedSong> {
	const app = await Client.connect(config.songGenerationSpaceId, {
		hf_token: config.huggingFaceApiKey.startsWith("hf_")
			? (config.huggingFaceApiKey as `hf_${string}`)
			: undefined,
	});

	const result = await app.predict("/generate_song", [
		input.lyrics,
		input.textPrompt?.trim() || null,
		input.audioPromptUrl?.trim() ? handle_file(input.audioPromptUrl.trim()) : null,
		input.genre ?? "Auto",
		input.cfgCoefficient ?? 1.8,
		input.temperature ?? 0.8,
	]);

	const payload = Array.isArray(result.data) ? result.data : [];
	const audioRef = (payload[0] ?? null) as GradioFileLike | null;
	const generatedInfo = payload[1];
	const explicitError = extractSongError(generatedInfo);

	if (!audioRef) {
		throw new Error(explicitError || "Song generation failed: no audio file was returned.");
	}

	const stored = await downloadRemoteAudio(
		config,
		audioRef,
		app.config?.root ||
			app.config?.root_url ||
			"https://huggingface.co/spaces/tencent/SongGeneration"
	);

	return {
		audioUrl: stored.audioUrl,
		chatUiMarkdown: stored.chatUiMarkdown,
		mimeType: stored.mimeType,
		fileName: stored.fileName,
		lyrics: input.lyrics,
		textPrompt: input.textPrompt,
		audioPromptUrl: input.audioPromptUrl,
		genre: input.genre ?? "Auto",
		cfgCoefficient: input.cfgCoefficient ?? 1.8,
		temperature: input.temperature ?? 0.8,
		spaceId: config.songGenerationSpaceId,
		generatedInfo,
	};
}

export { SONG_GENRES };
export type { GenerateMusicInput, GeneratedMusic, GenerateSongInput, GeneratedSong, SongGenre };
