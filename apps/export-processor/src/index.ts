import fs from "node:fs/promises";
import path from "node:path";
import { ExportConfigSchema } from "@opencut/export-config";
import { processExportJob } from "./processor";
import { readStatus } from "./status";

const MEDIA_BASE_PATH = process.env.MEDIA_BASE_PATH || path.resolve("apps/export-processor/data");
const EXPORTS_DIR = path.join(MEDIA_BASE_PATH, "exports");
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || "3000", 10);

async function ensureExportsDir(): Promise<void> {
	await fs.mkdir(EXPORTS_DIR, { recursive: true });
}

async function findPendingJobs(): Promise<string[]> {
	try {
		const entries = await fs.readdir(EXPORTS_DIR, { withFileTypes: true });
		const pendingJobs: string[] = [];

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;

			const jobDir = path.join(EXPORTS_DIR, entry.name);
			const status = await readStatus(jobDir);

			if (status && status.status === "pending") {
				pendingJobs.push(jobDir);
			}
		}

		return pendingJobs;
	} catch {
		return [];
	}
}

async function processJob(jobDir: string): Promise<void> {
	const configPath = path.join(jobDir, "config.json");

	try {
		const raw = await fs.readFile(configPath, "utf-8");
		const parsed = JSON.parse(raw);
		const config = ExportConfigSchema.parse(parsed);

		console.log(`[export] Processing job ${config.id}: ${config.projectName}`);
		await processExportJob(config, jobDir, MEDIA_BASE_PATH);
	} catch (error) {
		console.error(`[export] Failed to process job in ${jobDir}:`, error);
	}
}

async function pollLoop(): Promise<void> {
	console.log(`[export] Processor started`);
	console.log(`[export] Media path: ${MEDIA_BASE_PATH}`);
	console.log(`[export] Exports dir: ${EXPORTS_DIR}`);
	console.log(`[export] Poll interval: ${POLL_INTERVAL_MS}ms`);

	await ensureExportsDir();

	while (true) {
		const pendingJobs = await findPendingJobs();

		if (pendingJobs.length > 0) {
			console.log(`[export] Found ${pendingJobs.length} pending job(s)`);

			// Process one job at a time (Phase 1: no concurrency)
			for (const jobDir of pendingJobs) {
				await processJob(jobDir);
			}
		}

		await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
	}
}

pollLoop().catch((error) => {
	console.error("[export] Fatal error:", error);
	process.exit(1);
});
