# FFmpeg Processing

How the backend processor uses FFmpeg to produce the final video from the export config.

## Strategy: Stream Copy

For Phase 1, we use **stream copy** (`-c copy`) which remuxes video/audio without re-encoding. This is:
- **Fast** — processes 15GB 4K files in minutes, not hours
- **Lossless** — no quality degradation
- **Low CPU** — no encoding overhead

The tradeoff: cuts are only precise to the nearest keyframe (~0.5–2 seconds depending on GOP size). For podcast editing this is usually acceptable.

## Processing Steps

### Step 1: Cut segments from source files

For each segment in the config, extract the portion from the source file:

```bash
ffmpeg -y \
  -ss {startTime} \
  -to {endTime} \
  -i {source.filePath} \
  -c copy \
  -avoid_negative_ts make_zero \
  /data/media/exports/{jobId}/segment_{index}.mp4
```

**Flags:**
- `-ss` before `-i` = fast seek using keyframes
- `-to` = end time in source
- `-c copy` = stream copy, no re-encoding
- `-avoid_negative_ts make_zero` = fix timestamp issues at segment boundaries

### Step 2: Create concat file list

Write a temporary text file listing all segments in order:

```
file '/data/media/exports/job-123/segment_0.mp4'
file '/data/media/exports/job-123/segment_1.mp4'
file '/data/media/exports/job-123/segment_2.mp4'
```

### Step 3: Concatenate segments

```bash
ffmpeg -y \
  -f concat \
  -safe 0 \
  -i /data/media/exports/{jobId}/concat_list.txt \
  -c copy \
  /data/media/exports/{jobId}/output.mp4
```

### Step 4: Cleanup

Remove temporary segment files, keep only the final output.

## Handling Audio

Audio is handled per-segment:
- When `audioFromSource: true` — FFmpeg copies both video and audio streams from the source (`-c copy` copies all streams by default)
- When `audioFromSource: false` — FFmpeg copies only the video stream (`-an` flag to disable audio)

Since all cameras in a podcast typically record from the same room mic, the audio transitions between angles are usually seamless.

## Edge Cases

### Different codecs across sources
If source files have different codecs (e.g., one H.264, one H.265), `concat` with `-c copy` will fail. In this case, fall back to re-encoding:

```bash
ffmpeg -y \
  -f concat -safe 0 -i concat_list.txt \
  -c:v libx264 -preset fast -crf 18 \
  -c:a aac -b:a 192k \
  output.mp4
```

### Different resolutions
If sources have different resolutions, we need to scale. Add a filter:

```bash
-vf "scale={output.width}:{output.height}:force_original_aspect_ratio=decrease,pad={output.width}:{output.height}:(ow-iw)/2:(oh-ih)/2"
```

### Keyframe precision
For podcast editing, keyframe-level precision (~0.5–2s) is fine. If frame-accurate cuts are needed later, we can re-encode just the segment boundaries:

```bash
# Re-encode only the first/last few seconds of each segment
ffmpeg -ss {startTime} -to {endTime} -i input.mp4 \
  -c:v libx264 -preset fast -crf 18 \
  -force_key_frames "expr:eq(t,0)" \
  segment.mp4
```

## Phase 2: S3 Integration

FFmpeg can read directly from S3 presigned URLs:

```bash
ffmpeg -i "https://bucket.s3.amazonaws.com/camera1.mp4?X-Amz-..." \
  -ss 12.5 -to 28.0 -c copy segment.mp4
```

No need to download the entire file first — FFmpeg will do HTTP range requests to seek to the right position.

## Performance Estimates

For 4K H.264 podcast files with stream copy:

| Operation | Time (approx) |
|-----------|---------------|
| Cut 1 segment (any length) | 2–10 seconds |
| Concat 10 segments | 5–15 seconds |
| Total export (1 hour podcast, 20 switches) | 30–60 seconds |

Re-encoding (if needed) would take 10–30x longer depending on hardware.
