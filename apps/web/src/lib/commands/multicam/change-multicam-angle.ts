import { Command } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type { MulticamClip } from "@/types/multicam";

export class ChangeMulticamAngleCommand extends Command {
	private savedClips: MulticamClip[] | null = null;

	constructor(
		private clipId: string,
		private time: number,
		private newAngleId: string,
	) {
		super();
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedClips = [...editor.multicam.getClips()];
		editor.multicam.addSwitchPoint({
			clipId: this.clipId,
			time: this.time,
			angleId: this.newAngleId,
		});
	}

	undo(): void {
		if (this.savedClips) {
			const editor = EditorCore.getInstance();
			editor.multicam.loadClips({ clips: this.savedClips });
		}
	}
}
