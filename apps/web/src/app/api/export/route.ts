import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { ExportConfigSchema } from "@opencut/export-config";

const MEDIA_BASE_PATH = process.env.MEDIA_BASE_PATH || path.resolve(process.cwd(), "../../apps/export-processor/data");
const EXPORTS_DIR = path.join(MEDIA_BASE_PATH, "exports");

export async function POST(request: Request) {
	try {
		const body = await request.json();

		// Validate config
		const result = ExportConfigSchema.safeParse(body);
		if (!result.success) {
			return NextResponse.json(
				{ error: `Invalid config: ${result.error.message}` },
				{ status: 400 },
			);
		}

		const config = result.data;

		// Verify sources exist
		const sourcesDir = path.join(MEDIA_BASE_PATH, "sources");
		for (const source of config.sources) {
			// If filePath is absolute, use it directly; otherwise resolve against sources dir
			const absPath = path.isAbsolute(source.filePath)
				? source.filePath
				: path.join(sourcesDir, source.filePath);
			try {
				await fs.access(absPath);
			} catch {
				return NextResponse.json(
					{ error: `Source file not found: ${absPath}` },
					{ status: 400 },
				);
			}
		}

		// Create job directory
		const jobDir = path.join(EXPORTS_DIR, config.id);
		await fs.mkdir(jobDir, { recursive: true });

		// Ensure output directory exists
		const outputPath = path.isAbsolute(config.output.filePath)
			? config.output.filePath
			: path.join(MEDIA_BASE_PATH, config.output.filePath);
		await fs.mkdir(path.dirname(outputPath), { recursive: true });

		// Write config
		await fs.writeFile(
			path.join(jobDir, "config.json"),
			JSON.stringify(config, null, 2),
			"utf-8",
		);

		// Write initial status (processor will pick this up)
		await fs.writeFile(
			path.join(jobDir, "status.json"),
			JSON.stringify({
				jobId: config.id,
				status: "pending",
				progress: 0,
				message: "Export job created",
			}),
			"utf-8",
		);

		return NextResponse.json({
			jobId: config.id,
			status: "pending",
			message: "Export job created",
		});
	} catch (error) {
		console.error("[api/export] POST error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
