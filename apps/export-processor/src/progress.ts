/**
 * Parse FFmpeg stderr output to extract progress information.
 *
 * FFmpeg outputs lines like:
 *   frame=  120 fps= 30 q=-1.0 size=    1024kB time=00:00:04.00 bitrate=2097.2kbits/s speed=1.5x
 *
 * We extract the `time=` value and compare it to the total duration to get progress.
 */

const TIME_REGEX = /time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/;

export function parseProgressFromStderr(
	line: string,
	totalDuration: number,
): number | null {
	const match = TIME_REGEX.exec(line);
	if (!match) return null;

	const hours = parseInt(match[1], 10);
	const minutes = parseInt(match[2], 10);
	const seconds = parseInt(match[3], 10);
	const centiseconds = parseInt(match[4], 10);

	const currentTime = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;

	if (totalDuration <= 0) return 0;
	return Math.min(currentTime / totalDuration, 1);
}
