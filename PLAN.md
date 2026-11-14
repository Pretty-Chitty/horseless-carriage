# Finishing plan (2026-11-02)

State found: RULES.md / LAYOUT.md / ASSETS.md written, every phase coded, `tsc` clean, the
random simulator finishes games — but every seat ends with $0 and two tiles, so selling,
windows, cards and pricing have never been exercised by a bot. Art is cut from the creased
board photo and the scans. No AI rules, no audit, scaffold player aid, no tutorial, stub box
art and screenshot, engine two majors behind.

| # | Step | Status (2026-11-14) |
|---|---|---|
| 1 | Engine | ✅ core 2.3.1 (from the registry, no longer a local tarball), CLI 2.1.0; tsc clean |
| 2 | Look like the box: TTS art, on-the-fly faces, table, panels, cars, mat, card backs | ✅ two rounds; wealth track, drawn cards matched to the print, centred office pieces |
| 3 | AI: tags, `src/ai.ts`, factory planner `src/aiPlanner.ts`, soak | ✅ 0 stalls/stuck/rule errors at 3–5 players; winners ~$60–150 |
| 4 | Playtest captures | partly: seeded mid-game captures and the tutorial tour; a capture of every prompt shape still to do |
| 5 | Rules audit → AUDIT.md | ✅ 0 missing; F1–F4 fixed, readings recorded as Q17–Q19 |
| 6 | Player aid | ✅ live sheet, desktop and phone captured |
| 7 | AI improvement by A/B (`AI_AB=1 node scripts/ai-soak.mjs`) | ✅ two rounds kept (research weighting, fix-before-expanding) |
| 8 | Tutorial | ✅ two full years, 174 steps, coverage 203/203, `tutorial:check` passes 4/4; plain-English rewrite 2026-11-14 |
| 9 | Box art, screenshot, theme | ✅ BGG cover, seeded mid-game screenshot, charcoal/cream/teal theme |
| 10 | Voice + publish | ✅ Voicebox/Kokoro `am_michael` narration (~29 min, WhisperX-aligned); published v1.0.1 on 2026-11-13 |
| 11 | Open rules questions | ✅ all answered 2026-11-14 (Q4, Q5, Q6 from the TTS mod, Q10, Q13, Q15, Q16, Q19) |
| 12 | README, LICENSE | ✅ README modelled on Food Chain Magnate's; FCM's custom LICENSE |
