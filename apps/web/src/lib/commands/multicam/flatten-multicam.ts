import { Command } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type { TimelineTrack } from "@/types/timeline";

export class FlattenMulticamCommand extends Command {
	private savedTracks: TimelineTrack[] | null = null;

	constructor(private clipId: string) {
		super();
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedTracks = editor.timeline.getTracks();
		editor.multicam.flattenToTimeline({ clipId: this.clipId });
	}

	undo(): void {
		if (this.savedTracks) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedTracks);
		}
	}
}
