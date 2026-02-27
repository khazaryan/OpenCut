"use client";

import { useCallback, useRef } from "react";
import { useEditor } from "@/hooks/use-editor";
import { useRafLoop } from "@/hooks/use-raf-loop";
import { cn } from "@/utils/ui";
import type { MulticamAngle } from "@/types/multicam";
import type { MediaAsset } from "@/types/assets";
import { Button } from "@/components/ui/button";
import { invokeAction } from "@/lib/actions";
import { videoCache } from "@/services/video-cache/service";

function getGridLayout(count: number): { cols: number; rows: number } {
	if (count <= 1) return { cols: 1, rows: 1 };
	if (count <= 2) return { cols: 2, rows: 1 };
	if (count <= 4) return { cols: 2, rows: 2 };
	if (count <= 6) return { cols: 3, rows: 2 };
	if (count <= 9) return { cols: 3, rows: 3 };
	return { cols: 4, rows: Math.ceil(count / 4) };
}

function AngleCanvas({
	angle,
	mediaAsset,
	isActive,
	angleIndex,
	onClick,
}: {
	angle: MulticamAngle;
	mediaAsset: MediaAsset | undefined;
	isActive: boolean;
	angleIndex: number;
	onClick: () => void;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const renderingRef = useRef(false);
	const editor = useEditor();

	const renderFrame = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas || !mediaAsset?.file || renderingRef.current) return;

		const currentTime = editor.playback.getCurrentTime();
		const videoTime = Math.max(0, currentTime + angle.syncOffset);

		renderingRef.current = true;
		videoCache
			.getFrameAt({
				mediaId: mediaAsset.id,
				file: mediaAsset.file,
				time: videoTime,
			})
			.then((frame) => {
				renderingRef.current = false;
				if (!frame || !canvasRef.current) return;

				const ctx = canvasRef.current.getContext("2d");
				if (!ctx) return;

				ctx.fillStyle = "#000";
				ctx.fillRect(0, 0, canvas.width, canvas.height);

				const srcW = frame.canvas.width;
				const srcH = frame.canvas.height;
				const videoAspect = srcW / srcH;
				const canvasAspect = canvas.width / canvas.height;

				let drawW: number;
				let drawH: number;
				let drawX: number;
				let drawY: number;

				if (videoAspect > canvasAspect) {
					drawW = canvas.width;
					drawH = canvas.width / videoAspect;
					drawX = 0;
					drawY = (canvas.height - drawH) / 2;
				} else {
					drawH = canvas.height;
					drawW = canvas.height * videoAspect;
					drawX = (canvas.width - drawW) / 2;
					drawY = 0;
				}

				ctx.drawImage(frame.canvas, drawX, drawY, drawW, drawH);
			})
			.catch(() => {
				renderingRef.current = false;
			});
	}, [editor.playback, angle.syncOffset, mediaAsset]);

	useRafLoop(renderFrame);

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"relative overflow-hidden rounded-sm border-2 transition-all",
				isActive
					? "border-primary shadow-lg shadow-primary/20"
					: "border-transparent hover:border-muted-foreground/40",
			)}
		>
			<canvas
				ref={canvasRef}
				width={480}
				height={270}
				className="block size-full bg-black"
			/>
			<div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent px-2 py-1">
				<span className="text-xs font-medium text-white">
					{angle.name}
				</span>
				<kbd className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-mono text-white/80">
					{angleIndex + 1}
				</kbd>
			</div>
			{isActive && (
				<div className="absolute top-1 right-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
					ACTIVE
				</div>
			)}
		</button>
	);
}

export function MulticamPreview() {
	const containerRef = useRef<HTMLDivElement>(null);
	const editor = useEditor();
	const multicamState = editor.multicam.getState();
	const activeClipId = multicamState.activeClipId;

	const clip = activeClipId
		? editor.multicam.getClip({ clipId: activeClipId })
		: null;

	const mediaAssets = editor.media.getAssets();
	const currentTime = editor.playback.getCurrentTime();

	const activeAngle = clip
		? editor.multicam.getActiveAngleAtTime({
				clipId: clip.id,
				time: currentTime,
			})
		: null;

	if (!clip) return null;

	const { cols, rows } = getGridLayout(clip.angles.length);

	return (
		<div className="flex size-full flex-col">
			<div className="flex items-center justify-between border-b px-3 py-1.5">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium">{clip.name}</span>
					<span className="text-xs text-muted-foreground">
						{clip.angles.length} angles
					</span>
					{multicamState.isLiveSwitching && (
						<span className="animate-pulse rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
							REC
						</span>
					)}
				</div>
				<div className="flex items-center gap-1.5">
					{!multicamState.isLiveSwitching ? (
						<Button
							size="sm"
							variant="default"
							className="h-7 text-xs"
							onClick={() => invokeAction("multicam-start-live-switch")}
						>
							Start Live Switch
						</Button>
					) : (
						<Button
							size="sm"
							variant="destructive"
							className="h-7 text-xs"
							onClick={() => invokeAction("multicam-stop-live-switch")}
						>
							Stop
						</Button>
					)}
					<Button
						size="sm"
						variant="outline"
						className="h-7 text-xs"
						onClick={() => invokeAction("multicam-flatten")}
					>
						Flatten
					</Button>
					<Button
						size="sm"
						variant="ghost"
						className="h-7 text-xs"
						onClick={() => invokeAction("exit-multicam-mode")}
					>
						Exit
					</Button>
				</div>
			</div>

			<div
				ref={containerRef}
				className="flex-1 p-2"
				style={{
					display: "grid",
					gridTemplateColumns: `repeat(${cols}, 1fr)`,
					gridTemplateRows: `repeat(${rows}, 1fr)`,
					gap: "4px",
				}}
			>
				{clip.angles.map((angle, index) => {
					const asset = mediaAssets.find((a) => a.id === angle.mediaId);
					const isActive = activeAngle?.id === angle.id;
					return (
						<AngleCanvas
							key={angle.id}
							angle={angle}
							mediaAsset={asset}
							isActive={isActive}
							angleIndex={index}
							onClick={() =>
								editor.multicam.switchToAngle({ angleId: angle.id })
							}
						/>
					);
				})}
			</div>
		</div>
	);
}
