import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { EXPORTS_DIR, MEDIA_BASE_PATH } from "@/lib/export-paths";

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

		const outputPath = path.isAbsolute(config.output.filePath)
			? config.output.filePath
			: path.join(MEDIA_BASE_PATH, config.output.filePath);

		try {
			const stat = await fs.stat(outputPath);

			const mimeType =
				config.output.format === "webm" ? "video/webm" : "video/mp4";
			const extension = config.output.format === "webm" ? ".webm" : ".mp4";
			const filename = `${config.projectName}${extension}`;

			// Stream the file instead of reading into memory (files can be 10GB+)
			const stream = createReadStream(outputPath);
			const webStream = new ReadableStream({
				start(controller) {
					stream.on("data", (chunk) => controller.enqueue(new Uint8Array(Buffer.from(chunk))));
					stream.on("end", () => controller.close());
					stream.on("error", (err) => controller.error(err));
				},
			});

			return new NextResponse(webStream, {
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
