"use client";

import { useTimelineStore } from "@/stores/timeline-store";
import { useActionHandler } from "@/hooks/actions/use-action-handler";
import { useEditor } from "../use-editor";
import { useElementSelection } from "../timeline/element/use-element-selection";
import { getElementsAtTime } from "@/lib/timeline";

export function useEditorActions() {
	const editor = useEditor();
	const activeProject = editor.project.getActive();
	const { selectedElements, setElementSelection } = useElementSelection();
	const { clipboard, setClipboard, toggleSnapping } = useTimelineStore();

	useActionHandler(
		"toggle-play",
		() => {
			editor.playback.toggle();
		},
		undefined,
	);

	useActionHandler(
		"stop-playback",
		() => {
			if (editor.playback.getIsPlaying()) {
				editor.playback.toggle();
			}
			editor.playback.seek({ time: 0 });
		},
		undefined,
	);

	useActionHandler(
		"seek-forward",
		(args) => {
			const seconds = args?.seconds ?? 1;
			editor.playback.seek({
				time: Math.min(
					editor.timeline.getTotalDuration(),
					editor.playback.getCurrentTime() + seconds,
				),
			});
		},
		undefined,
	);

	useActionHandler(
		"seek-backward",
		(args) => {
			const seconds = args?.seconds ?? 1;
			editor.playback.seek({
				time: Math.max(0, editor.playback.getCurrentTime() - seconds),
			});
		},
		undefined,
	);

	useActionHandler(
		"frame-step-forward",
		() => {
			const fps = activeProject.settings.fps;
			editor.playback.seek({
				time: Math.min(
					editor.timeline.getTotalDuration(),
					editor.playback.getCurrentTime() + 1 / fps,
				),
			});
		},
		undefined,
	);

	useActionHandler(
		"frame-step-backward",
		() => {
			const fps = activeProject.settings.fps;
			editor.playback.seek({
				time: Math.max(0, editor.playback.getCurrentTime() - 1 / fps),
			});
		},
		undefined,
	);

	useActionHandler(
		"jump-forward",
		(args) => {
			const seconds = args?.seconds ?? 5;
			editor.playback.seek({
				time: Math.min(
					editor.timeline.getTotalDuration(),
					editor.playback.getCurrentTime() + seconds,
				),
			});
		},
		undefined,
	);

	useActionHandler(
		"jump-backward",
		(args) => {
			const seconds = args?.seconds ?? 5;
			editor.playback.seek({
				time: Math.max(0, editor.playback.getCurrentTime() - seconds),
			});
		},
		undefined,
	);

	useActionHandler(
		"goto-start",
		() => {
			editor.playback.seek({ time: 0 });
		},
		undefined,
	);

	useActionHandler(
		"goto-end",
		() => {
			editor.playback.seek({ time: editor.timeline.getTotalDuration() });
		},
		undefined,
	);

	useActionHandler(
		"split",
		() => {
			const currentTime = editor.playback.getCurrentTime();
			const elementsToSplit =
				selectedElements.length > 0
					? selectedElements
					: getElementsAtTime({
							tracks: editor.timeline.getTracks(),
							time: currentTime,
						});

			if (elementsToSplit.length === 0) return;

			editor.timeline.splitElements({
				elements: elementsToSplit,
				splitTime: currentTime,
			});
		},
		undefined,
	);

	useActionHandler(
		"split-left",
		() => {
			const currentTime = editor.playback.getCurrentTime();
			const elementsToSplit =
				selectedElements.length > 0
					? selectedElements
					: getElementsAtTime({
							tracks: editor.timeline.getTracks(),
							time: currentTime,
						});

			if (elementsToSplit.length === 0) return;

			editor.timeline.splitElements({
				elements: elementsToSplit,
				splitTime: currentTime,
				retainSide: "right",
			});
		},
		undefined,
	);

	useActionHandler(
		"split-right",
		() => {
			const currentTime = editor.playback.getCurrentTime();
			const elementsToSplit =
				selectedElements.length > 0
					? selectedElements
					: getElementsAtTime({
							tracks: editor.timeline.getTracks(),
							time: currentTime,
						});

			if (elementsToSplit.length === 0) return;

			editor.timeline.splitElements({
				elements: elementsToSplit,
				splitTime: currentTime,
				retainSide: "left",
			});
		},
		undefined,
	);

	useActionHandler(
		"delete-selected",
		() => {
			if (selectedElements.length === 0) {
				return;
			}
			editor.timeline.deleteElements({
				elements: selectedElements,
			});
			editor.selection.clearSelection();
		},
		undefined,
	);

	useActionHandler(
		"select-all",
		() => {
			const allElements = editor.timeline.getTracks().flatMap((track) =>
				track.elements.map((element) => ({
					trackId: track.id,
					elementId: element.id,
				})),
			);
			setElementSelection({ elements: allElements });
		},
		undefined,
	);

	useActionHandler(
		"duplicate-selected",
		() => {
			editor.timeline.duplicateElements({
				elements: selectedElements,
			});
		},
		undefined,
	);

	useActionHandler(
		"toggle-elements-muted-selected",
		() => {
			editor.timeline.toggleElementsMuted({ elements: selectedElements });
		},
		undefined,
	);

	useActionHandler(
		"toggle-elements-visibility-selected",
		() => {
			editor.timeline.toggleElementsVisibility({ elements: selectedElements });
		},
		undefined,
	);

	useActionHandler(
		"toggle-bookmark",
		() => {
			editor.scenes.toggleBookmark({ time: editor.playback.getCurrentTime() });
		},
		undefined,
	);

	useActionHandler(
		"copy-selected",
		() => {
			if (selectedElements.length === 0) return;

			const results = editor.timeline.getElementsWithTracks({
				elements: selectedElements,
			});
			const items = results.map(({ track, element }) => {
				const { ...elementWithoutId } = element;
				return {
					trackId: track.id,
					trackType: track.type,
					element: elementWithoutId,
				};
			});

			setClipboard({ items });
		},
		undefined,
	);

	useActionHandler(
		"paste-copied",
		() => {
			if (!clipboard?.items.length) return;

			editor.timeline.pasteAtTime({
				time: editor.playback.getCurrentTime(),
				clipboardItems: clipboard.items,
			});
		},
		undefined,
	);

	useActionHandler(
		"toggle-snapping",
		() => {
			toggleSnapping();
		},
		undefined,
	);

	useActionHandler(
		"undo",
		() => {
			editor.command.undo();
		},
		undefined,
	);

	useActionHandler(
		"redo",
		() => {
			editor.command.redo();
		},
		undefined,
	);

	// ─── Multicam Actions ────────────────────────────────────

	useActionHandler(
		"enter-multicam-mode",
		() => {
			const clipId = editor.multicam.getActiveClipId();
			if (!clipId) {
				const clips = editor.multicam.getClips();
				if (clips.length > 0) {
					editor.multicam.enterMulticamMode({ clipId: clips[0].id });
				}
			}
		},
		undefined,
	);

	useActionHandler(
		"exit-multicam-mode",
		() => {
			if (editor.multicam.isInMulticamMode()) {
				editor.multicam.exitMulticamMode();
			}
		},
		undefined,
	);

	useActionHandler(
		"multicam-switch-angle-1",
		() => {
			if (!editor.multicam.isInMulticamMode()) return;
			const clip = editor.multicam.getClip({ clipId: editor.multicam.getActiveClipId()! });
			if (clip && clip.angles[0]) {
				editor.multicam.switchToAngle({ angleId: clip.angles[0].id });
			}
		},
		undefined,
	);

	useActionHandler(
		"multicam-switch-angle-2",
		() => {
			if (!editor.multicam.isInMulticamMode()) return;
			const clip = editor.multicam.getClip({ clipId: editor.multicam.getActiveClipId()! });
			if (clip && clip.angles[1]) {
				editor.multicam.switchToAngle({ angleId: clip.angles[1].id });
			}
		},
		undefined,
	);

	useActionHandler(
		"multicam-switch-angle-3",
		() => {
			if (!editor.multicam.isInMulticamMode()) return;
			const clip = editor.multicam.getClip({ clipId: editor.multicam.getActiveClipId()! });
			if (clip && clip.angles[2]) {
				editor.multicam.switchToAngle({ angleId: clip.angles[2].id });
			}
		},
		undefined,
	);

	useActionHandler(
		"multicam-switch-angle-4",
		() => {
			if (!editor.multicam.isInMulticamMode()) return;
			const clip = editor.multicam.getClip({ clipId: editor.multicam.getActiveClipId()! });
			if (clip && clip.angles[3]) {
				editor.multicam.switchToAngle({ angleId: clip.angles[3].id });
			}
		},
		undefined,
	);

	useActionHandler(
		"multicam-start-live-switch",
		() => {
			if (editor.multicam.isInMulticamMode()) {
				editor.multicam.startLiveSwitching();
			}
		},
		undefined,
	);

	useActionHandler(
		"multicam-stop-live-switch",
		() => {
			if (editor.multicam.isLiveSwitching()) {
				editor.multicam.stopLiveSwitching();
			}
		},
		undefined,
	);

	useActionHandler(
		"multicam-flatten",
		() => {
			const clipId = editor.multicam.getActiveClipId();
			if (clipId) {
				editor.multicam.flattenToTimeline({ clipId });
				editor.multicam.exitMulticamMode();
			}
		},
		undefined,
	);
}
