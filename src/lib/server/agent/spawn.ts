import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const AGENT_IMAGE = process.env.AGENT_IMAGE || "mdcnick/docker-webtop-tribe:agent";
const NETWORK = process.env.AGENT_NETWORK || "tribe";

export interface SpawnResult {
	containerId: string;
	containerName: string;
	hostPorts: {
		desktop: string;
		ptyHttp: string;
		ptyWs: string;
	};
}

export async function spawnAgent(userId: string): Promise<SpawnResult> {
	const name = `tribe-agent-${userId}`;

	// Remove old container if exists
	try {
		await execAsync(`docker rm -f ${name}`);
	} catch {
		/* ignore if not exists */
	}

	const cmd = [
		`docker run -d`,
		`--name ${name}`,
		`--network ${NETWORK}`,
		`-p 0:3001`,
		`-p 0:8081`,
		`-p 0:8082`,
		`-v ${name}-config:/config`,
		`-e TITLE="Tribe Agent"`,
		`-e PTY_PORT=8081`,
		`-e PTY_CWD=/config/workspace`,
		`--shm-size=1gb`,
		AGENT_IMAGE,
	].join(" ");

	const { stdout } = await execAsync(cmd);
	const containerId = stdout.trim();

	// Give Docker a moment to assign ports
	await new Promise((r) => setTimeout(r, 500));

	// Read assigned host ports
	const { stdout: portOut } = await execAsync(`docker port ${containerId}`);
	const ports = parseDockerPorts(portOut);

	return {
		containerId,
		containerName: name,
		hostPorts: {
			desktop: ports["3001/tcp"],
			ptyHttp: ports["8081/tcp"],
			ptyWs: ports["8082/tcp"],
		},
	};
}

export async function stopAgent(userId: string): Promise<void> {
	const name = `tribe-agent-${userId}`;
	await execAsync(`docker rm -f ${name}`).catch(() => {});
}

function parseDockerPorts(output: string): Record<string, string> {
	const map: Record<string, string> = {};
	for (const line of output.split("\n")) {
		const match = line.match(/(\d+\/\w+)\s+->\s+.*?:(\d+)/);
		if (match) {
			map[match[1]] = match[2];
		}
	}
	return map;
}
