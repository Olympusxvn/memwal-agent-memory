import { spawnSync } from "node:child_process";

/**
 * Render one segment: slide + voiceover + optional PiP B-roll.
 * @param {object} p
 * @param {string} p.FFMPEG
 * @param {string} p.png
 * @param {string} p.audio
 * @param {number} p.dur
 * @param {string} p.segOut
 * @param {string | null} p.brollPath
 * @param {boolean} [p.kenBurns]
 */
export function renderSegment({ FFMPEG, png, audio, dur, segOut, brollPath, kenBurns = true }) {
  const frames = Math.ceil(dur * 30);
  const fadeOutStart = Math.max(0.2, dur - 0.55);

  if (!brollPath) {
    const vf = kenBurns
      ? `zoompan=z='min(zoom+0.00015,1.035)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1920x1080:fps=30,format=yuv420p`
      : "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p";

    run(FFMPEG, [
      "-y",
      "-loop",
      "1",
      "-framerate",
      "30",
      "-i",
      png,
      "-i",
      audio,
      "-vf",
      vf,
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "19",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-t",
      String(dur + 0.05),
      "-shortest",
      segOut,
    ]);
    return;
  }

  // Slide base + PiP B-roll (Walrus cyan border, fade, bottom-right)
  const filter = [
    `[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,` +
      `eq=brightness=-0.03:saturation=1.05[vbg]`,
    `[1:v]scale=840:-2:force_original_aspect_ratio=decrease,` +
      `pad=856:ih+16:8:8:color=0x613DFF@0.85,` +
      `pad=872:ih+32:8:8:color=0x00f5ff@0.35,` +
      `fps=30,setpts=PTS-STARTPTS,` +
      `fade=t=in:st=0:d=0.5,fade=t=out:st=${fadeOutStart.toFixed(2)}:d=0.5[pip]`,
    `[vbg][pip]overlay=x=main_w-overlay_w-52:y=main_h-overlay_h-52:format=auto[vout]`,
  ].join(";");

  run(FFMPEG, [
    "-y",
    "-loop",
    "1",
    "-framerate",
    "30",
    "-t",
    String(dur + 0.1),
    "-i",
    png,
    "-stream_loop",
    "-1",
    "-i",
    brollPath,
    "-i",
    audio,
    "-filter_complex",
    filter,
    "-map",
    "[vout]",
    "-map",
    "2:a",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "19",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
      "192k",
    "-t",
    String(dur + 0.05),
    "-shortest",
    segOut,
  ]);
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`${cmd} failed`);
}
