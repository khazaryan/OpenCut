import type { EditorCore } from "@/core";
import type {
	MulticamClip,
	MulticamAngle,
	MulticamSwitchPoint,
	MulticamSyncMethod,
	MulticamState,
} from "@/types/multicam";
import type { VideoElement } from "@/types/timeline";
import { generateUUID } from "@/utils/id";
import { buildVideoElement } from "@/lib/timeline/element-utils";

const DEFAULT_TRANSFORM = {
	scale: 1,
	position: { x: 0, y: 0 },
	rotate: 0,
};

export class MulticamManager {
	private state: MulticamState = {
		clips: [],
		activeClipId: null,
		isLiveSwitching: false,
		showGrid: false,
	};
	private listeners = new Set<() => void>();
	private lastVisibleAngleId: string | null = null;

	constructor(private editor: EditorCore) {}

	// ─── Clip CRUD ───────────────────────────────────────────

	createClip({
		name,
		mediaIds,
		syncMethod = "manual",
	}: {
		name: string;
		mediaIds: string[];
		syncMethod?: MulticamSyncMethod;
	}): string {
		const mediaAssets = this.editor.media.getAssets();

		const angles: MulticamAngle[] = [];

		for (let index = 0; index < mediaIds.length; index++) {
			const mediaId = mediaIds[index];
			const asset = mediaAssets.find((a) => a.id === mediaId);
			const duration = asset?.duration ?? 0;
			const angleName = asset?.name ?? `Angle ${index + 1}`;

			// Add a video track + element for each angle
			const trackId = this.editor.timeline.addTrack({
				type: "video",
			});

			const element = buildVideoElement({
				mediaId,
				name: angleName,
				duration,
				startTime: 0,
			});

			this.editor.timeline.insertElement({
				element,
				placement: { mode: "explicit", trackId },
			});

			angles.push({
				id: generateUUID(),
				name: angleName,
				mediaId,
				syncOffset: 0,
				trackId,
			});
		}

		const maxDuration = Math.max(
			...mediaIds.map((mediaId) => {
				const asset = mediaAssets.find((a) => a.id === mediaId);
				return asset?.duration ?? 0;
			}),
		);

		const clip: MulticamClip = {
			id: generateUUID(),
			name,
			angles,
			switchPoints: [{ time: 0, angleId: angles[0].id }],
			duration: maxDuration,
			syncMethod,
			createdAt: new Date(),
		};

		this.state = {
			...this.state,
			clips: [...this.state.clips, clip],
		};
		this.syncClipsToProject();
		this.notify();
		return clip.id;
	}

	deleteClip({ clipId }: { clipId: string }): void {
		this.state = {
			...this.state,
			clips: this.state.clips.filter((c) => c.id !== clipId),
			activeClipId:
				this.state.activeClipId === clipId
					? null
					: this.state.activeClipId,
		};
		this.syncClipsToProject();
		this.notify();
	}

	getClip({ clipId }: { clipId: string }): MulticamClip | null {
		return this.state.clips.find((c) => c.id === clipId) ?? null;
	}

	getClips(): MulticamClip[] {
		return this.state.clips;
	}

	// ─── Angle Management ────────────────────────────────────

	addAngle({
		clipId,
		mediaId,
		name,
		syncOffset = 0,
	}: {
		clipId: string;
		mediaId: string;
		name?: string;
		syncOffset?: number;
	}): string | null {
		const clip = this.getClip({ clipId });
		if (!clip) return null;

		const asset = this.editor.media.getAssets().find((a) => a.id === mediaId);
		const angle: MulticamAngle = {
			id: generateUUID(),
			name: name ?? asset?.name ?? `Angle ${clip.angles.length + 1}`,
			mediaId,
			syncOffset,
		};

		this.updateClip({
			clipId,
			updates: {
				angles: [...clip.angles, angle],
				duration: Math.max(clip.duration, (asset?.duration ?? 0) + syncOffset),
			},
		});

		return angle.id;
	}

	removeAngle({
		clipId,
		angleId,
	}: {
		clipId: string;
		angleId: string;
	}): void {
		const clip = this.getClip({ clipId });
		if (!clip || clip.angles.length <= 1) return;

		const remainingAngles = clip.angles.filter((a) => a.id !== angleId);
		const fallbackAngleId = remainingAngles[0].id;

		const updatedSwitchPoints = clip.switchPoints.map((sp) =>
			sp.angleId === angleId ? { ...sp, angleId: fallbackAngleId } : sp,
		);

		this.updateClip({
			clipId,
			updates: {
				angles: remainingAngles,
				switchPoints: updatedSwitchPoints,
			},
		});
	}

	updateAngleSyncOffset({
		clipId,
		angleId,
		syncOffset,
	}: {
		clipId: string;
		angleId: string;
		syncOffset: number;
	}): void {
		const clip = this.getClip({ clipId });
		if (!clip) return;

		const updatedAngles = clip.angles.map((a) =>
			a.id === angleId ? { ...a, syncOffset } : a,
		);

		this.updateClip({ clipId, updates: { angles: updatedAngles } });
	}

	// ─── Switch Points ───────────────────────────────────────

	addSwitchPoint({
		clipId,
		time,
		angleId,
	}: {
		clipId: string;
		time: number;
		angleId: string;
	}): void {
		const clip = this.getClip({ clipId });
		if (!clip) return;

		const existingIndex = clip.switchPoints.findIndex(
			(sp) => Math.abs(sp.time - time) < 0.001,
		);

		let updatedSwitchPoints: MulticamSwitchPoint[];

		if (existingIndex >= 0) {
			updatedSwitchPoints = clip.switchPoints.map((sp, i) =>
				i === existingIndex ? { ...sp, angleId } : sp,
			);
		} else {
			updatedSwitchPoints = [...clip.switchPoints, { time, angleId }].sort(
				(a, b) => a.time - b.time,
			);
		}

		this.updateClip({ clipId, updates: { switchPoints: updatedSwitchPoints } });
	}

	removeSwitchPoint({
		clipId,
		time,
	}: {
		clipId: string;
		time: number;
	}): void {
		const clip = this.getClip({ clipId });
		if (!clip) return;

		const filtered = clip.switchPoints.filter(
			(sp) => Math.abs(sp.time - time) >= 0.001,
		);

		if (filtered.length === 0) return;

		this.updateClip({ clipId, updates: { switchPoints: filtered } });
	}

	getActiveAngleAtTime({
		clipId,
		time,
	}: {
		clipId: string;
		time: number;
	}): MulticamAngle | null {
		const clip = this.getClip({ clipId });
		if (!clip || clip.switchPoints.length === 0) return null;

		let activeSwitch = clip.switchPoints[0];
		for (const sp of clip.switchPoints) {
			if (sp.time <= time) {
				activeSwitch = sp;
			} else {
				break;
			}
		}

		return clip.angles.find((a) => a.id === activeSwitch.angleId) ?? null;
	}

	// ─── Multicam Mode ───────────────────────────────────────

	enterMulticamMode({ clipId }: { clipId: string }): void {
		const clip = this.getClip({ clipId });
		if (!clip) return;

		this.lastVisibleAngleId = clip.angles[0]?.id ?? null;
		this.state = {
			...this.state,
			activeClipId: clipId,
			showGrid: true,
		};
		this.notify();
	}

	exitMulticamMode(): void {
		this.lastVisibleAngleId = null;
		this.state = {
			...this.state,
			activeClipId: null,
			isLiveSwitching: false,
			showGrid: false,
		};
		this.notify();
	}

	startLiveSwitching(): void {
		if (!this.state.activeClipId) return;

		this.state = {
			...this.state,
			isLiveSwitching: true,
		};
		this.editor.playback.play();
		this.notify();
	}

	stopLiveSwitching(): void {
		this.editor.playback.pause();
		this.editor.playback.seek({ time: 0 });
		this.state = {
			...this.state,
			isLiveSwitching: false,
			showGrid: false,
		};
		this.notify();
	}

	switchToAngle({ angleId }: { angleId: string }): void {
		const clipId = this.state.activeClipId;
		if (!clipId) return;

		const time = this.editor.playback.getCurrentTime();
		this.lastVisibleAngleId = angleId;
		this.addSwitchPoint({ clipId, time, angleId });
		this.notify();
	}

	getActiveClipId(): string | null {
		return this.state.activeClipId;
	}

	isInMulticamMode(): boolean {
		return this.state.activeClipId !== null;
	}

	getActiveTrackId({ time }: { time: number }): string | null {
		// Check active clip first, then fall back to first clip with trackIds
		const clipId = this.state.activeClipId ?? this.state.clips[0]?.id ?? null;
		if (!clipId) return null;

		const angle = this.getActiveAngleAtTime({ clipId, time });
		return angle?.trackId ?? null;
	}

	getMulticamTrackIds(): Set<string> {
		const ids = new Set<string>();
		for (const clip of this.state.clips) {
			for (const angle of clip.angles) {
				if (angle.trackId) ids.add(angle.trackId);
			}
		}
		return ids;
	}

	isGridVisible(): boolean {
		return this.state.showGrid;
	}

	showGridView(): void {
		this.state = { ...this.state, showGrid: true };
		this.notify();
	}

	hideGridView(): void {
		this.state = { ...this.state, showGrid: false };
		this.notify();
	}

	isLiveSwitching(): boolean {
		return this.state.isLiveSwitching;
	}

	getState(): MulticamState {
		return this.state;
	}

	// ─── Backend Export Config ───────────────────────────────

	generateExportConfig({
		clipId,
		format = "mp4",
		includeAudio = true,
		mediaBasePath = "",
	}: {
		clipId?: string;
		format?: "mp4" | "webm";
		includeAudio?: boolean;
		mediaBasePath?: string;
	} = {}): object | null {
		const resolvedClipId =
			clipId ?? this.state.activeClipId ?? this.state.clips[0]?.id;
		if (!resolvedClipId) return null;

		const clip = this.getClip({ clipId: resolvedClipId });
		if (!clip || clip.switchPoints.length === 0) return null;

		const activeProject = this.editor.project.getActive();
		const mediaAssets = this.editor.media.getAssets();

		// Build sources from angles
		const sources = clip.angles.map((angle) => {
			const asset = mediaAssets.find((a) => a.id === angle.mediaId);
			return {
				id: angle.mediaId,
				name: angle.name,
				filePath: mediaBasePath
				? `${mediaBasePath}/${asset?.name ?? angle.mediaId}`
				: asset?.name ?? angle.mediaId,
				width: asset?.width,
				height: asset?.height,
				duration: asset?.duration,
				fps: asset?.fps,
				hasAudio: true,
			};
		});

		// Build angle ID → source index map
		const angleToSourceIndex = new Map<string, number>();
		clip.angles.forEach((angle, index) => {
			angleToSourceIndex.set(angle.id, index);
		});

		// Convert switch points to segments
		const sortedSwitchPoints = [...clip.switchPoints].sort(
			(a, b) => a.time - b.time,
		);

		const segments = [];
		for (let i = 0; i < sortedSwitchPoints.length; i++) {
			const sp = sortedSwitchPoints[i];
			const nextSp = sortedSwitchPoints[i + 1];
			const angle = clip.angles.find((a) => a.id === sp.angleId);
			if (!angle) continue;

			const startTime = sp.time;
			const endTime = nextSp ? nextSp.time : clip.duration;
			if (endTime - startTime <= 0) continue;

			const sourceIndex = angleToSourceIndex.get(sp.angleId) ?? 0;
			segments.push({
				sourceIndex,
				startTime: startTime + angle.syncOffset,
				endTime: endTime + angle.syncOffset,
				audioFromSource: includeAudio,
			});
		}

		if (segments.length === 0) return null;

		const exportId = `export-${generateUUID()}`;
		const outputWidth = activeProject?.settings.canvasSize.width ?? 1920;
		const outputHeight = activeProject?.settings.canvasSize.height ?? 1080;
		const outputFps = activeProject?.settings.fps ?? 30;

		return {
			version: 1,
			id: exportId,
			projectId: activeProject?.metadata.id ?? "",
			projectName: activeProject?.metadata.name ?? "Untitled",
			createdAt: new Date().toISOString(),
			sources,
			segments,
			output: {
				filePath: `exports/${exportId}/output.${format}`,
				format,
				width: outputWidth,
				height: outputHeight,
				fps: outputFps,
				codec: "copy",
				includeAudio,
			},
			status: "pending",
		};
	}

	// ─── Flatten to Timeline ─────────────────────────────────

	flattenToTimeline({ clipId }: { clipId: string }): void {
		const clip = this.getClip({ clipId });
		if (!clip || clip.switchPoints.length === 0) return;

		const sortedSwitchPoints = [...clip.switchPoints].sort(
			(a, b) => a.time - b.time,
		);

		const elements: VideoElement[] = [];

		for (let i = 0; i < sortedSwitchPoints.length; i++) {
			const sp = sortedSwitchPoints[i];
			const nextSp = sortedSwitchPoints[i + 1];
			const angle = clip.angles.find((a) => a.id === sp.angleId);
			if (!angle) continue;

			const startTime = sp.time;
			const endTime = nextSp ? nextSp.time : clip.duration;
			const duration = endTime - startTime;

			if (duration <= 0) continue;

			elements.push({
				id: generateUUID(),
				name: `${angle.name}`,
				type: "video",
				mediaId: angle.mediaId,
				startTime,
				duration,
				trimStart: startTime + angle.syncOffset,
				trimEnd: 0,
				transform: { ...DEFAULT_TRANSFORM },
				opacity: 1,
				multicamClipId: clipId,
				multicamAngleId: angle.id,
			});
		}

		for (const element of elements) {
			this.editor.timeline.insertElement({
				element: {
					...element,
				},
				placement: { mode: "auto", trackType: "video" },
			});
		}
	}

	// ─── Persistence ─────────────────────────────────────────

	loadClips({ clips }: { clips: MulticamClip[] }): void {
		this.state = {
			...this.state,
			clips,
		};
		this.notify();
	}

	// ─── Internal ────────────────────────────────────────────

	private updateClip({
		clipId,
		updates,
	}: {
		clipId: string;
		updates: Partial<MulticamClip>;
	}): void {
		this.state = {
			...this.state,
			clips: this.state.clips.map((c) =>
				c.id === clipId ? { ...c, ...updates } : c,
			),
		};
		this.syncClipsToProject();
		this.notify();
	}

	private syncClipsToProject(): void {
		const activeProject = this.editor.project.getActive();
		if (!activeProject) return;

		this.editor.project.setActiveProject({
			project: {
				...activeProject,
				multicamClips: this.state.clips,
				metadata: {
					...activeProject.metadata,
					updatedAt: new Date(),
				},
			},
		});
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	notify(): void {
		this.listeners.forEach((fn) => fn());
	}
}
