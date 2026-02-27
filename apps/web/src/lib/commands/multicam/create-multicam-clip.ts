import { Command } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type { MulticamClip, MulticamSyncMethod } from "@/types/multicam";

export class CreateMulticamClipCommand extends Command {
	private clipId: string | null = null;
	private savedClips: MulticamClip[] | null = null;

	constructor(
		private name: string,
		private mediaIds: string[],
		private syncMethod: MulticamSyncMethod = "manual",
	) {
		super();
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedClips = [...editor.multicam.getClips()];
		this.clipId = editor.multicam.createClip({
			name: this.name,
			mediaIds: this.mediaIds,
			syncMethod: this.syncMethod,
		});
	}

	undo(): void {
		if (this.savedClips) {
			const editor = EditorCore.getInstance();
			editor.multicam.loadClips({ clips: this.savedClips });
		}
	}

	getClipId(): string | null {
		return this.clipId;
	}
}
