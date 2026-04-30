import { Database } from "$lib/server/database";
import { models, lastModelRefresh, modelsReady } from "$lib/server/models";
import { getMcpServers } from "$lib/server/mcp/registry";
import { logger } from "$lib/server/logger";

const serverStartTime = Date.now();

export async function GET() {
	const diagnostics: Record<string, unknown> = {
		status: "healthy",
		uptimeMs: Date.now() - serverStartTime,
	};

	// DB connectivity
	try {
		const db = await Database.getInstance();
		await db.getClient().db().admin().ping();
		diagnostics.db = "connected";
	} catch (err) {
		diagnostics.db = "disconnected";
		diagnostics.dbError = String(err);
		diagnostics.status = "degraded";
		logger.warn({ err: String(err) }, "[healthcheck] database ping failed");
	}

	// Model cache freshness
	const isModelLoadComplete = !!(await Promise.race([
		modelsReady.then(() => true),
		new Promise<false>((r) => setTimeout(() => r(false), 0)),
	]));
	diagnostics.modelCache = {
		modelCount: models.length,
		lastRefreshMs: Date.now() - lastModelRefresh.getTime(),
		ready: isModelLoadComplete,
	};
	if (!isModelLoadComplete && models.length === 0) {
		diagnostics.status = "initializing";
	}

	// MCP servers
	const mcpServers = getMcpServers();
	diagnostics.mcp = {
		serverCount: mcpServers.length,
	};

	return Response.json(diagnostics, {
		status:
			diagnostics.status === "healthy" ? 200 : diagnostics.status === "initializing" ? 200 : 503,
	});
}
