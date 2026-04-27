import type { ObjectId } from "mongodb";

export interface AgentSession {
	_id: ObjectId;
	userId: string;
	containerId: string;
	containerName: string;
	desktopUrl: string;
	ptyHttpUrl: string;
	ptyWsUrl: string;
	status: "spawning" | "running" | "stopped" | "error";
	createdAt: Date;
}
