import { Command } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type { MulticamClip } from "@/types/multicam";

export class RemoveMulticamSwitchCommand extends Command {
	private savedClips: MulticamClip[] | null = null;

	constructor(
		private clipId: string,
		private time: number,
	) {
		super();
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedClips = [...editor.multicam.getClips()];
		editor.multicam.removeSwitchPoint({
			clipId: this.clipId,
			time: this.time,
		});
	}

	undo(): void {
		if (this.savedClips) {
			const editor = EditorCore.getInstance();
			editor.multicam.loadClips({ clips: this.savedClips });
		}
	}
}
