"use client";

import { useEditor } from "@/hooks/use-editor";
import { cn } from "@/utils/ui";
import type { MulticamClip, MulticamSwitchPoint } from "@/types/multicam";

const ANGLE_COLORS = [
	"bg-blue-500",
	"bg-green-500",
	"bg-amber-500",
	"bg-rose-500",
	"bg-purple-500",
	"bg-cyan-500",
	"bg-orange-500",
	"bg-pink-500",
];

function getAngleColor(index: number): string {
	return ANGLE_COLORS[index % ANGLE_COLORS.length];
}

function SwitchSegment({
	switchPoint,
	nextSwitchPoint,
	clip,
	pixelsPerSecond,
	angleIndex,
	onRemove,
}: {
	switchPoint: MulticamSwitchPoint;
	nextSwitchPoint: MulticamSwitchPoint | undefined;
	clip: MulticamClip;
	pixelsPerSecond: number;
	angleIndex: number;
	onRemove: () => void;
}) {
	const angle = clip.angles.find((a) => a.id === switchPoint.angleId);
	const endTime = nextSwitchPoint ? nextSwitchPoint.time : clip.duration;
	const duration = endTime - switchPoint.time;
	const left = switchPoint.time * pixelsPerSecond;
	const width = duration * pixelsPerSecond;

	if (width <= 0) return null;

	return (
		<div
			className={cn(
				"absolute top-0 h-full flex items-center overflow-hidden rounded-sm border border-white/10",
				getAngleColor(angleIndex),
			)}
			style={{ left: `${left}px`, width: `${width}px` }}
			title={`${angle?.name ?? "Unknown"} (${switchPoint.time.toFixed(2)}s - ${endTime.toFixed(2)}s)`}
		>
			{width > 40 && (
				<span className="truncate px-1.5 text-[10px] font-medium text-white">
					{angle?.name ?? "?"}
				</span>
			)}
		</div>
	);
}

export function MulticamTimeline({
	pixelsPerSecond,
}: {
	pixelsPerSecond: number;
}) {
	const editor = useEditor();
	const multicamState = editor.multicam.getState();
	const activeClipId = multicamState.activeClipId;

	const clip = activeClipId
		? editor.multicam.getClip({ clipId: activeClipId })
		: null;

	if (!clip) return null;

	const sortedSwitchPoints = [...clip.switchPoints].sort(
		(a, b) => a.time - b.time,
	);

	const totalWidth = clip.duration * pixelsPerSecond;

	return (
		<div className="border-t bg-muted/30 px-0 py-1">
			<div className="flex items-center gap-2 px-3 pb-1">
				<span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
					Multicam
				</span>
				<div className="flex gap-1">
					{clip.angles.map((angle, index) => (
						<div
							key={angle.id}
							className="flex items-center gap-1"
						>
							<div
								className={cn(
									"size-2 rounded-full",
									getAngleColor(index),
								)}
							/>
							<span className="text-[10px] text-muted-foreground">
								{angle.name}
							</span>
						</div>
					))}
				</div>
			</div>
			<div
				className="relative h-6 overflow-hidden"
				style={{ width: `${totalWidth}px` }}
			>
				{sortedSwitchPoints.map((sp, i) => {
					const angleIndex = clip.angles.findIndex(
						(a) => a.id === sp.angleId,
					);
					return (
						<SwitchSegment
							key={`${sp.time}-${sp.angleId}`}
							switchPoint={sp}
							nextSwitchPoint={sortedSwitchPoints[i + 1]}
							clip={clip}
							pixelsPerSecond={pixelsPerSecond}
							angleIndex={angleIndex}
							onRemove={() =>
								editor.multicam.removeSwitchPoint({
									clipId: clip.id,
									time: sp.time,
								})
							}
						/>
					);
				})}
			</div>
		</div>
	);
}
