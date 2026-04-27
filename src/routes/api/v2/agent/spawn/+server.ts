import { json } from "@sveltejs/kit";
import { spawnAgent } from "$lib/server/agent/spawn";
import {
	createAgentSession,
	getAgentSession,
	updateAgentSession,
} from "$lib/server/agent/store";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ locals }) => {
	const userId = locals.user?._id.toString();
	if (!userId) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	const existing = await getAgentSession(userId);
	if (existing?.status === "running") {
		return json(existing);
	}

	await updateAgentSession(userId, { status: "spawning" }).catch(() => {});

	const spawned = await spawnAgent(userId);

	const session = await createAgentSession({
		userId,
		containerId: spawned.containerId,
		containerName: spawned.containerName,
		desktopUrl: `http://localhost:${spawned.hostPorts.desktop}`,
		ptyHttpUrl: `http://localhost:${spawned.hostPorts.ptyHttp}`,
		ptyWsUrl: `ws://localhost:${spawned.hostPorts.ptyWs}`,
		status: "running",
		createdAt: new Date(),
	});

	return json(session);
};
