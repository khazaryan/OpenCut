export type MulticamSyncMethod = "audio" | "manual" | "timecode";

export interface MulticamAngle {
	id: string;
	name: string;
	mediaId: string;
	/** Offset in seconds relative to the sync point (0 = perfectly synced) */
	syncOffset: number;
	/** The timeline track ID this angle's video element lives on */
	trackId?: string;
}

export interface MulticamSwitchPoint {
	/** Time in seconds on the multicam timeline where this switch occurs */
	time: number;
	/** The angle to switch to at this time */
	angleId: string;
}

export interface MulticamClip {
	id: string;
	name: string;
	angles: MulticamAngle[];
	switchPoints: MulticamSwitchPoint[];
	/** Total duration of the multicam clip (longest angle after sync offsets) */
	duration: number;
	/** The sync method used to align angles */
	syncMethod: MulticamSyncMethod;
	createdAt: Date;
}

export interface MulticamState {
	/** All multicam clips in the project */
	clips: MulticamClip[];
	/** The currently active multicam clip being edited (null if not in multicam mode) */
	activeClipId: string | null;
	/** Whether the user is in live switching mode */
	isLiveSwitching: boolean;
	/** Whether to show the multicam grid (false = show normal preview for result playback) */
	showGrid: boolean;
}
