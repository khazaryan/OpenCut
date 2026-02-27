import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

const MEDIA_BASE_PATH = process.env.MEDIA_BASE_PATH || path.resolve(process.cwd(), "../../apps/export-processor/data");
const EXPORTS_DIR = path.join(MEDIA_BASE_PATH, "exports");

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ jobId: string }> },
) {
	try {
		const { jobId } = await params;
		const jobDir = path.join(EXPORTS_DIR, jobId);

		// Read status to check if completed
		const statusPath = path.join(jobDir, "status.json");
		let status: { status: string; jobId: string };
		try {
			const raw = await fs.readFile(statusPath, "utf-8");
			status = JSON.parse(raw);
		} catch {
			return NextResponse.json(
				{ error: "Export not found" },
				{ status: 404 },
			);
		}

		if (status.status !== "completed") {
			return NextResponse.json(
				{ error: "Export not completed yet" },
				{ status: 400 },
			);
		}

		// Read the config to get the output file path and project name
		const configPath = path.join(jobDir, "config.json");
		let config: { output: { filePath: string; format: string }; projectName: string };
		try {
			const raw = await fs.readFile(configPath, "utf-8");
			config = JSON.parse(raw);
		} catch {
			return NextResponse.json(
				{ error: "Export config not found" },
				{ status: 404 },
			);
		}

		const outputPath = config.output.filePath;

		try {
			const stat = await fs.stat(outputPath);
			const fileBuffer = new Uint8Array(await fs.readFile(outputPath));

			const mimeType =
				config.output.format === "webm" ? "video/webm" : "video/mp4";
			const extension = config.output.format === "webm" ? ".webm" : ".mp4";
			const filename = `${config.projectName}${extension}`;

			return new NextResponse(fileBuffer, {
				headers: {
					"Content-Type": mimeType,
					"Content-Disposition": `attachment; filename="${filename}"`,
					"Content-Length": String(stat.size),
				},
			});
		} catch {
			return NextResponse.json(
				{ error: "Output file not found" },
				{ status: 404 },
			);
		}
	} catch (error) {
		console.error("[api/export/download] GET error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
