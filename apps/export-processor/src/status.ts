import fs from "node:fs/promises";
import path from "node:path";
import type { ExportStatusFile } from "@opencut/export-config";

export async function readStatus(jobDir: string): Promise<ExportStatusFile | null> {
	const statusPath = path.join(jobDir, "status.json");
	try {
		const raw = await fs.readFile(statusPath, "utf-8");
		return JSON.parse(raw) as ExportStatusFile;
	} catch {
		return null;
	}
}

export async function writeStatus(
	jobDir: string,
	status: ExportStatusFile,
): Promise<void> {
	const statusPath = path.join(jobDir, "status.json");
	await fs.writeFile(statusPath, JSON.stringify(status, null, 2), "utf-8");
}
