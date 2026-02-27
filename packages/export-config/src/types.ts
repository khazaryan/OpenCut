import type { z } from "zod";
import type {
	ExportConfigSchema,
	ExportSourceSchema,
	ExportSegmentSchema,
	ExportOutputSchema,
	ExportStatusSchema,
	ExportStatusFileSchema,
} from "./schema";

export type ExportSource = z.infer<typeof ExportSourceSchema>;
export type ExportSegment = z.infer<typeof ExportSegmentSchema>;
export type ExportOutput = z.infer<typeof ExportOutputSchema>;
export type ExportStatus = z.infer<typeof ExportStatusSchema>;
export type ExportConfig = z.infer<typeof ExportConfigSchema>;
export type ExportStatusFile = z.infer<typeof ExportStatusFileSchema>;
