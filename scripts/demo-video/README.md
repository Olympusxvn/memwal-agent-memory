# MemWal++ demo video — voiceover + B-roll

Generate **AI voice narration** (English + Vietnamese) and assemble a **~2:30** Devpost demo.

## Quick start

```bash
# 1. TTS (free — Microsoft Edge voices, no API key)
pip install edge-tts
python scripts/demo-video/generate-voiceover.py              # English
python scripts/demo-video/generate-voiceover.py --locale vi  # Tiếng Việt
python scripts/demo-video/generate-voiceover.py --locale en --locale vi

# 2. Optional: ffmpeg for single full MP3
winget install Gyan.FFmpeg
```

**Output:** `docs/demo-video-output/en/` and `docs/demo-video-output/vi/`

| File | Purpose |
|------|---------|
| `01-title.mp3` … `10-cta.mp3` | One clip per slide — drag into editor |
| `full-voiceover.mp3` | Full narration (needs ffmpeg) |
| `manifest.json` | Timeline + B-roll cues |
| `subtitles.srt` | Import to CapCut / DaVinci for captions |

## Record visuals

### A. Slides (primary)

1. Open `docs/memwalpp-slides.html` in Chrome full-screen (F11).
2. OBS → 1920×1080, 30fps, capture window.
3. Advance slides with **→** timed to `manifest.json` segment durations (or play `full-voiceover.mp3` in headphones and advance live).

### B. B-roll clips (trim guide)

Record **35–40s** raw, then trim to manifest `brollTrim`:

| Clip | Command / URL | Trim | Keep on screen |
|------|---------------|------|----------------|
| Offline demo | `pnpm agent:demo` | 3s → 28s | `[hook]` lines + `── RESULT ──` + exit 0 |
| Bounty hunt | `pnpm agent:bounty-hunt` | 5s → 30s | poster + hunter + blob id |
| MCP E2E | `pnpm mcp:e2e` | 0s → 12s | PASS / stdio |
| Dashboard | https://memwalpp-dashboard.vercel.app/ | 0s → 10s | hero, wallet, kiosk |
| Bootstrap tx | [Suiscan tx](https://suiscan.xyz/mainnet/tx/BjV2Q8mCarkmtENT1T3SPncKAFP3qNHQKVJ2DgptUnkW) | 0s → 8s | Config + MarketplaceV2 |

Overlay B-roll **picture-in-picture** on slides 5–7 and 9 (bottom-right terminal, 40% width).

## Storyboard addendum — Tier A (Phase 11+)

When **`pnpm agent:shared-memory`** ships, extend B-roll and `voiceover.json` with this chapter (~45 s total):

| Segment | Visual | Narration hook | Verify on screen |
|---------|--------|----------------|------------------|
| **Multi-agent** | `pnpm agent:shared-memory` terminal | “Three agents — Research, Analyst, Executor — share one Walrus namespace.” | Summary table: `agentId` · `walrusBlobId` · `hitSource` |
| **Shared recall** | Hunter/Analyst step log | “Agent B recalls context Agent A promoted — hybrid pull from Walrus.” | `Injected N chars from hybrid memory` |
| **Verify** | MCP or CLI `verify` | “Layered proof — local hash matches durable blob.” | `valid: true` / PASS |
| **Long-running** | [special-one-agent.vercel.app/chat](https://special-one-agent.vercel.app/chat) | “Production ledger survives refresh — mainnet MemWal LIVE.” | Walrus Memory Ledger sidebar |

**Portable memory (Phase 12):** optional clip — export proof JSON → fresh DB → `recall forceDurable` → verify PASS (`JUDGE_GUIDE.md` Path D when added).

Re-run `pnpm demo:publish` after updating `scripts/demo-video/voiceover.json`.

## Assemble in CapCut (recommended)

1. **Import** slide screen recording + `full-voiceover.mp3` + B-roll MP4s.
2. **Align** slide cuts to `manifest.json` → `timelineStartSec` per segment.
3. **Import** `subtitles.srt` → Style: white, Syne/Inter, bottom safe zone.
4. **Music** (optional): low ambient −18dB under voice.
5. **Export** 1080p H.264, ≤100MB for Devpost.

## Assemble with ffmpeg (CLI)

After recording `slides.mp4` and B-roll:

```bash
ffmpeg -i slides.mp4 -i docs/demo-video-output/en/full-voiceover.mp3 \
  -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest demo-final.mp4
```

## Script source of truth

- **Structured JSON:** `scripts/demo-video/voiceover.json`
- **Slide deck copy:** `docs/demo-video-slides.md`
- **HTML speaker notes:** `docs/memwalpp-slides.html` → `VOICEOVERS[]`

Re-run `generate-voiceover.py` after editing `voiceover.json`.

## npm shortcuts

```bash
pnpm demo:voiceover        # English TTS
pnpm demo:voiceover:vi     # Vietnamese TTS
pnpm demo:export           # slides + B-roll PiP + audio → memwalpp-demo.mp4
pnpm demo:export:vi
pnpm demo:export:fast      # slides only (no B-roll)
pnpm demo:publish          # voiceover + full export (English)
```

**Published file:** `docs/demo-video-output/en/memwalpp-demo.mp4` (~2.5 MB, ~2:26)  
Copy for Devpost: `docs/memwalpp-demo.mp4`
