"use client";

import { useState, useMemo } from "react";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useEditor } from "@/hooks/use-editor";
import type { MediaAsset } from "@/types/assets";
import type { MulticamSyncMethod } from "@/types/multicam";
import { cn } from "@/utils/ui";

function MediaThumbnail({ asset }: { asset: MediaAsset }) {
	return (
		<div className="relative size-10 shrink-0 overflow-hidden rounded border bg-muted">
			{asset.thumbnailUrl ? (
				<img
					src={asset.thumbnailUrl}
					alt={asset.name}
					className="size-full object-cover"
				/>
			) : (
				<div className="flex size-full items-center justify-center text-xs text-muted-foreground">
					{asset.type === "video" ? "VID" : "IMG"}
				</div>
			)}
		</div>
	);
}

function formatDuration(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function MulticamSetupDialog({
	isOpen,
	onOpenChange,
}: {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const editor = useEditor();
	const mediaAssets = editor.media.getAssets();

	const [clipName, setClipName] = useState("Multicam Clip");
	const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(
		new Set(),
	);
	const [syncMethod, setSyncMethod] = useState<MulticamSyncMethod>("manual");

	const videoAssets = useMemo(
		() => mediaAssets.filter((a) => a.type === "video"),
		[mediaAssets],
	);

	const toggleMedia = (mediaId: string) => {
		setSelectedMediaIds((prev) => {
			const next = new Set(prev);
			if (next.has(mediaId)) {
				next.delete(mediaId);
			} else {
				next.add(mediaId);
			}
			return next;
		});
	};

	const handleCreate = () => {
		if (selectedMediaIds.size < 2) return;

		const clipId = editor.multicam.createClip({
			name: clipName,
			mediaIds: Array.from(selectedMediaIds),
			syncMethod,
		});

		editor.multicam.enterMulticamMode({ clipId });
		onOpenChange(false);

		setClipName("Multicam Clip");
		setSelectedMediaIds(new Set());
		setSyncMethod("manual");
	};

	const canCreate = selectedMediaIds.size >= 2 && clipName.trim().length > 0;

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Create Multicam Clip</DialogTitle>
				</DialogHeader>

				<DialogBody className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="multicam-name">Clip Name</Label>
						<Input
							id="multicam-name"
							value={clipName}
							onChange={(e) => setClipName(e.target.value)}
							placeholder="Multicam Clip"
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label>Sync Method</Label>
						<div className="flex gap-2">
							{(
								[
									{ value: "manual", label: "Manual" },
									{ value: "audio", label: "Audio Waveform" },
								] as const
							).map((method) => (
								<button
									key={method.value}
									type="button"
									onClick={() => setSyncMethod(method.value)}
									className={cn(
										"rounded-md border px-3 py-1.5 text-sm transition-colors",
										syncMethod === method.value
											? "border-primary bg-primary/10 text-primary"
											: "border-border bg-background text-muted-foreground hover:bg-muted",
									)}
								>
									{method.label}
								</button>
							))}
						</div>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label>
							Select Camera Angles ({selectedMediaIds.size} selected)
						</Label>
						<p className="text-xs text-muted-foreground">
							Select at least 2 video clips to create a multicam clip.
						</p>

						{videoAssets.length === 0 ? (
							<div className="flex items-center justify-center rounded-md border border-dashed py-8">
								<p className="text-sm text-muted-foreground">
									No video assets. Import video files first.
								</p>
							</div>
						) : (
							<div className="max-h-60 overflow-y-auto rounded-md border">
								{videoAssets.map((asset) => {
									const isSelected = selectedMediaIds.has(asset.id);
									return (
										<button
											key={asset.id}
											type="button"
											onClick={() => toggleMedia(asset.id)}
											className={cn(
												"flex w-full items-center gap-3 border-b px-3 py-2 text-left transition-colors last:border-b-0",
												isSelected
													? "bg-primary/5"
													: "hover:bg-muted/50",
											)}
										>
											<Checkbox
												checked={isSelected}
												onClick={(e) => e.stopPropagation()}
												onCheckedChange={() => toggleMedia(asset.id)}
											/>
											<MediaThumbnail asset={asset} />
											<div className="flex min-w-0 flex-1 flex-col">
												<span className="truncate text-sm font-medium">
													{asset.name}
												</span>
												<span className="text-xs text-muted-foreground">
													{asset.width && asset.height
														? `${asset.width}×${asset.height}`
														: ""}
													{asset.duration
														? ` · ${formatDuration(asset.duration)}`
														: ""}
												</span>
											</div>
											{isSelected && (
												<span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
													Angle{" "}
													{Array.from(selectedMediaIds).indexOf(asset.id) + 1}
												</span>
											)}
										</button>
									);
								})}
							</div>
						)}
					</div>
				</DialogBody>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleCreate} disabled={!canCreate}>
						Create Multicam
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
