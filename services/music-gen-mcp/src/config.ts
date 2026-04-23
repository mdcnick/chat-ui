import path from "node:path";

type AppConfig = {
	port: number;
	publicBaseUrl: string;
	huggingFaceApiKey: string;
	defaultModelId: string;
	hfEndpointUrl?: string;
	storageDir: string;
};

function required(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

function getPublicBaseUrl(port: number): string {
	const explicit = process.env.PUBLIC_BASE_URL?.trim();
	if (explicit) return explicit.replace(/\/+$/, "");

	const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
	if (railwayDomain) return `https://${railwayDomain.replace(/\/+$/, "")}`;

	return `http://localhost:${port}`;
}

export function loadConfig(): AppConfig {
	const port = Number.parseInt(process.env.PORT ?? "3000", 10);
	if (!Number.isFinite(port) || port <= 0) {
		throw new Error(`Invalid PORT: ${process.env.PORT}`);
	}

	return {
		port,
		publicBaseUrl: getPublicBaseUrl(port),
		huggingFaceApiKey: required("HUGGINGFACE_API_KEY"),
		defaultModelId: process.env.MUSIC_MODEL_ID?.trim() || "facebook/musicgen-small",
		hfEndpointUrl: process.env.HF_ENDPOINT_URL?.trim() || undefined,
		storageDir: path.resolve(process.cwd(), "storage/generated"),
	};
}

export type { AppConfig };
