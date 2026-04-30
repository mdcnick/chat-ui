import type { RequestHandler } from "@sveltejs/kit";
import { superjsonResponse } from "$lib/server/api/utils/superjsonResponse";
import { collections } from "$lib/server/database";
import { authCondition } from "$lib/server/auth";
import { requireAuth } from "$lib/server/api/utils/requireAuth";
import { defaultModel, models, validateModel } from "$lib/server/models";
import { getDefaultSettings, type SettingsEditable } from "$lib/types/Settings";
import { resolveStreamingMode } from "$lib/utils/messageUpdates";
import { z } from "zod";

const settingsSchema = z.object({
	shareConversationsWithModelAuthors: z
		.boolean()
		.default(() => getDefaultSettings().shareConversationsWithModelAuthors),
	welcomeModalSeen: z.boolean().optional(),
	activeModel: z.string().default(() => getDefaultSettings().activeModel),
	customPrompts: z.record(z.string()).default({}),
	customPromptsEnabled: z.record(z.boolean()).default({}),
	multimodalOverrides: z.record(z.boolean()).default({}),
	toolsOverrides: z.record(z.boolean()).default({}),
	providerOverrides: z.record(z.string()).default({}),
	streamingMode: z.enum(["raw", "smooth"]).optional(),
	directPaste: z.boolean().default(false),
	hapticsEnabled: z.boolean().default(true),
	hidePromptExamples: z.record(z.boolean()).default({}),
	billingOrganization: z.string().optional(),
	opencodeApiKey: z.string().optional(),
});

export const GET: RequestHandler = async ({ locals }) => {
	requireAuth(locals);
	const settings = await collections.settings.findOne(authCondition(locals));

	if (settings && !validateModel(models).safeParse(settings?.activeModel).success) {
		settings.activeModel = defaultModel?.id ?? "";
		await collections.settings.updateOne(authCondition(locals), {
			$set: { activeModel: defaultModel?.id ?? "" },
		});
	}

	// if the model is unlisted, set the active model to the default model
	if (
		settings?.activeModel &&
		models.find((m) => m.id === settings?.activeModel)?.unlisted === true
	) {
		settings.activeModel = defaultModel?.id ?? "";
		await collections.settings.updateOne(authCondition(locals), {
			$set: { activeModel: defaultModel?.id ?? "" },
		});
	}

	const streamingMode = resolveStreamingMode(settings ?? {});

	return superjsonResponse({
		welcomeModalSeen: !!settings?.welcomeModalSeenAt,
		welcomeModalSeenAt: settings?.welcomeModalSeenAt ?? null,

		activeModel: settings?.activeModel ?? getDefaultSettings().activeModel,
		streamingMode,
		directPaste: settings?.directPaste ?? getDefaultSettings().directPaste,
		hapticsEnabled: settings?.hapticsEnabled ?? getDefaultSettings().hapticsEnabled,
		hidePromptExamples: settings?.hidePromptExamples ?? getDefaultSettings().hidePromptExamples,
		shareConversationsWithModelAuthors:
			settings?.shareConversationsWithModelAuthors ??
			getDefaultSettings().shareConversationsWithModelAuthors,

		customPrompts: settings?.customPrompts ?? {},
		customPromptsEnabled: settings?.customPromptsEnabled ?? {},
		multimodalOverrides: settings?.multimodalOverrides ?? {},
		toolsOverrides: settings?.toolsOverrides ?? {},
		providerOverrides: settings?.providerOverrides ?? {},
		billingOrganization: settings?.billingOrganization ?? undefined,
		opencodeApiKey: settings?.opencodeApiKey ?? undefined,
	});
};

export const POST: RequestHandler = async ({ locals, request }) => {
	requireAuth(locals);
	const body = await request.json();

	const { welcomeModalSeen, ...parsedSettings } = settingsSchema.parse(body);
	const streamingMode = resolveStreamingMode(parsedSettings);

	const settings = {
		...parsedSettings,
		streamingMode,
	} satisfies SettingsEditable;

	await collections.settings.updateOne(
		authCondition(locals),
		{
			$set: {
				...settings,
				...(welcomeModalSeen && { welcomeModalSeenAt: new Date() }),
				updatedAt: new Date(),
			},
			$setOnInsert: {
				createdAt: new Date(),
			},
		},
		{ upsert: true }
	);

	return new Response();
};
