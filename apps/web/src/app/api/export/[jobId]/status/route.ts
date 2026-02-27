import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { EXPORTS_DIR } from "@/lib/export-paths";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ jobId: string }> },
) {
	try {
		const { jobId } = await params;
		const statusPath = path.join(EXPORTS_DIR, jobId, "status.json");

		try {
			const raw = await fs.readFile(statusPath, "utf-8");
			const status = JSON.parse(raw);
			return NextResponse.json(status);
		} catch {
			return NextResponse.json(
				{ error: "Export job not found" },
				{ status: 404 },
			);
		}
	} catch (error) {
		console.error("[api/export/status] GET error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
