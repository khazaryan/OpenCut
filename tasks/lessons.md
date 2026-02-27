# Lessons Learned

Track patterns from corrections to avoid repeating mistakes.

## Multicam Export (Feb 2026)

- **Don't mutate timeline state during playback** — toggling track visibility via commands or direct state mutation during playback causes infinite loops, scene rebuild thrashing, and UI freezes. Filter in the render pipeline instead.
- **Don't pre-build multiple heavy scenes for export** — caching multiple scene trees with VideoNodes consumes too much memory. Build one scene at a time, swap lazily.
- **Check if state methods work outside their "mode"** — `getMulticamTrackIds()` originally depended on `activeClipId` which is null after exiting multicam mode. Export still needs these IDs. Methods should work regardless of mode state.
- **Browser can't handle large video file processing** — 15GB 4K files crash the browser tab. Don't try to decode/encode large files client-side. Use backend FFmpeg for heavy processing.
- **Plan before implementing architectural changes** — the backend export attempt started without a clear plan, leading to reverted code. Always plan first for non-trivial tasks.
- **Always update tasks/todo.md and tasks/lessons.md after each phase** — per workflow instructions, mark items done as you go, write the Review section when done, and capture lessons immediately. Don't wait until asked.
- **Use relative filenames in config, resolve server-side** — in a monorepo, each app has a different `cwd`. Don't put paths in the config JSON; use plain filenames and resolve them against `MEDIA_BASE_PATH` on the server. This makes the config portable across local dev, Docker, and S3.
