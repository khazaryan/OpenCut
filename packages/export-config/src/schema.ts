import { z } from "zod";

export const ExportSourceSchema = z.object({
	id: z.string(),
	name: z.string(),
	filePath: z.string(),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),
	duration: z.number().nonnegative().optional(),
	fps: z.number().positive().optional(),
	hasAudio: z.boolean().default(true),
});

export const ExportSegmentSchema = z.object({
	sourceIndex: z.number().int().nonnegative(),
	startTime: z.number().nonnegative(),
	endTime: z.number().nonnegative(),
	audioFromSource: z.boolean().default(true),
});

export const ExportOutputSchema = z.object({
	filePath: z.string(),
	format: z.enum(["mp4", "webm"]).default("mp4"),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),
	fps: z.number().positive().optional(),
	codec: z.enum(["copy", "h264", "h265"]).default("copy"),
	includeAudio: z.boolean().default(true),
});

export const ExportStatusSchema = z.enum([
	"pending",
	"processing",
	"completed",
	"failed",
]);

export const ExportConfigSchema = z.object({
	version: z.literal(1),
	id: z.string(),
	projectId: z.string(),
	projectName: z.string(),
	createdAt: z.string().datetime(),
	sources: z.array(ExportSourceSchema).min(1),
	segments: z.array(ExportSegmentSchema).min(1),
	output: ExportOutputSchema,
	status: ExportStatusSchema.default("pending"),
});

export const ExportStatusFileSchema = z.object({
	jobId: z.string(),
	status: ExportStatusSchema,
	progress: z.number().min(0).max(1).default(0),
	message: z.string().optional(),
	error: z.string().optional(),
	downloadUrl: z.string().optional(),
});
