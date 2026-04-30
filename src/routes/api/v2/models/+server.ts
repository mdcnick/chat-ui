import type { RequestHandler } from "@sveltejs/kit";
import { logger } from "$lib/server/logger";
import { superjsonResponse } from "$lib/server/api/utils/superjsonResponse";
import type { GETModelsResponse } from "$lib/server/api/types";

export const GET: RequestHandler = async () => {
	try {
		const { models, modelsReady } = await import("$lib/server/models");
		// Wait for initial model load to complete (non-blocking import, models may be empty)
		await modelsReady;
		const response = superjsonResponse(
			models
				.filter((m) => m.unlisted == false)
				.map((model) => ({
					id: model.id,
					name: model.name,
					websiteUrl: model.websiteUrl,
					modelUrl: model.modelUrl,
					datasetName: model.datasetName,
					datasetUrl: model.datasetUrl,
					displayName: model.displayName,
					description: model.description,
					logoUrl: model.logoUrl,
					providers: model.providers as unknown as Array<
						{ provider: string } & Record<string, unknown>
					>,
					promptExamples: model.promptExamples,
					parameters: model.parameters,
					preprompt: model.preprompt,
					multimodal: model.multimodal,
					multimodalAcceptedMimetypes: model.multimodalAcceptedMimetypes,
					supportsTools: (model as unknown as { supportsTools?: boolean }).supportsTools ?? false,
					unlisted: model.unlisted,
					hasInferenceAPI: model.hasInferenceAPI,
					isRouter: model.isRouter,
				})) satisfies GETModelsResponse
		);
		response.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
		return response;
	} catch (error) {
		logger.error({ err: String(error) }, "[api] failed to load model list");
		return superjsonResponse([] as GETModelsResponse);
	}
};
