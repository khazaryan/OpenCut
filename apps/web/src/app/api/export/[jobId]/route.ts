import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { EXPORTS_DIR } from "@/lib/export-paths";

export async function DELETE(
	_request: Request,
	{ params }: { params: Promise<{ jobId: string }> },
) {
	try {
		const { jobId } = await params;
		const jobDir = path.join(EXPORTS_DIR, jobId);

		try {
			await fs.access(jobDir);
		} catch {
			return NextResponse.json(
				{ error: "Export job not found" },
				{ status: 404 },
			);
		}

		// Remove the entire job directory
		await fs.rm(jobDir, { recursive: true, force: true });

		return NextResponse.json({
			jobId,
			status: "cancelled",
			message: "Export cancelled and files cleaned up",
		});
	} catch (error) {
		console.error("[api/export/cancel] DELETE error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
