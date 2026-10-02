# 03: Consistent blur across crop and width, plus reduced motion

**What to build:** The blur looks the same on screen whatever the Stage's crop and whatever the displayed width. The crop works by scaling the photo up, which also scales any blur on it, so the renderer compensates for the Stage's zoom and the photo's displayed width. Players who prefer reduced motion get the Stage change without a long animation. The shared levels are tuned by playing so Stage 1 is hard but Stage 4 is fair. See `spec.md`.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] At phone width and desktop width, a given level looks about equally blurry at every crop
- [ ] With the system reduced-motion setting on, the Stage change is skipped or shortened
- [ ] Zoom component tests check that the applied blur is compensated for the Stage's zoom, while still asserting only observable behaviour (effect present, absent, or stronger than the previous Stage)
- [ ] The shared levels are tuned by playing in the browser, and the chosen numbers are noted in the ticket's Comments
- [ ] The photo stays smooth while Stages change on a low-end phone, or the strength is lowered until it does
- [ ] The last Stage is still exactly clear
- [ ] Root typecheck, lint, test and build pass
