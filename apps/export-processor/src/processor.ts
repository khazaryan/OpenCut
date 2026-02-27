import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import type { ExportConfig } from "@opencut/export-config";
import { parseProgressFromStderr } from "./progress";
import { writeStatus } from "./status";

export async function processExportJob(
	config: ExportConfig,
	jobDir: string,
): Promise<void> {
	const { sources, segments, output } = config;

	await writeStatus(jobDir, {
		jobId: config.id,
		status: "processing",
		progress: 0,
		message: "Starting export",
	});

	try {
		// Step 1: Cut segments
		const segmentFiles: string[] = [];

		for (let i = 0; i < segments.length; i++) {
			const seg = segments[i];
			const source = sources[seg.sourceIndex];
			if (!source) {
				throw new Error(
					`Segment ${i} references invalid sourceIndex ${seg.sourceIndex}`,
				);
			}

			const segmentFile = path.join(jobDir, `segment_${i}.mp4`);
			segmentFiles.push(segmentFile);

			await writeStatus(jobDir, {
				jobId: config.id,
				status: "processing",
				progress: (i / segments.length) * 0.8,
				message: `Cutting segment ${i + 1} of ${segments.length}`,
			});

			const args = [
				"-y",
				"-ss", String(seg.startTime),
				"-to", String(seg.endTime),
				"-i", source.filePath,
				"-c", "copy",
				...(seg.audioFromSource ? [] : ["-an"]),
				"-avoid_negative_ts", "make_zero",
				segmentFile,
			];

			await runFFmpeg(args);
		}

		// Step 2: Create concat list
		const concatListPath = path.join(jobDir, "concat_list.txt");
		const concatContent = segmentFiles
			.map((f) => `file '${f}'`)
			.join("\n");
		await fs.writeFile(concatListPath, concatContent, "utf-8");

		await writeStatus(jobDir, {
			jobId: config.id,
			status: "processing",
			progress: 0.85,
			message: "Concatenating segments",
		});

		// Step 3: Concatenate
		const concatArgs = [
			"-y",
			"-f", "concat",
			"-safe", "0",
			"-i", concatListPath,
			"-c", "copy",
			output.filePath,
		];

		await runFFmpeg(concatArgs);

		// Step 4: Cleanup temp files
		for (const f of segmentFiles) {
			await fs.unlink(f).catch(() => {});
		}
		await fs.unlink(concatListPath).catch(() => {});

		await writeStatus(jobDir, {
			jobId: config.id,
			status: "completed",
			progress: 1,
			message: "Export completed",
			downloadUrl: `/api/export/${config.id}/download`,
		});

		console.log(`[export] Job ${config.id} completed: ${output.filePath}`);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		console.error(`[export] Job ${config.id} failed:`, errorMessage);

		await writeStatus(jobDir, {
			jobId: config.id,
			status: "failed",
			progress: 0,
			error: errorMessage,
		});
	}
}

function runFFmpeg(args: string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		console.log(`[ffmpeg] ffmpeg ${args.join(" ")}`);

		const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });

		let stderr = "";

		proc.stderr.on("data", (data: Buffer) => {
			const chunk = data.toString();
			stderr += chunk;
			// Log progress lines for debugging
			if (chunk.includes("time=")) {
				process.stdout.write(`[ffmpeg] ${chunk.trim()}\r`);
			}
		});

		proc.on("close", (code) => {
			if (code === 0) {
				console.log("\n[ffmpeg] Done");
				resolve();
			} else {
				// Extract the last few lines for error context
				const lines = stderr.trim().split("\n");
				const lastLines = lines.slice(-5).join("\n");
				reject(new Error(`FFmpeg exited with code ${code}:\n${lastLines}`));
			}
		});

		proc.on("error", (err) => {
			reject(new Error(`Failed to spawn FFmpeg: ${err.message}`));
		});
	});
}
