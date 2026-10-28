# Host audio — what this folder is waiting on

`POIMedia.hostAudio` renders a **"Hear from your host"** control on an experience. The
control is gated on the file existing: no file, no button, and the experience reads
exactly as it does without one. Nothing in the product depends on audio.

## The rule

The recording is **the host's own voice**, saying in their own words what happens in their
workshop or their kitchen. It is not narration, not a guide reading a description, and it
is **never** a synthesised voice attributed to a real person. If we cannot record the
actual host, the control stays off.

## Files this dataset would use

Drop the file, then set `media.hostAudio` on the matching entry in `src/data/experiences.ts`.

| Experience | Suggested path | Host as described today |
|---|---|---|
| `exp-cooking-mi-naima` | `/audio/cooking-mi-naima.m4a` | A local family |
| `exp-leather-bag` | `/audio/leather-bag-workshop.m4a` | A local leather artisan |
| `exp-habous-artisans` | `/audio/habous-artisan-walk.m4a` | A neighbourhood guide |

## Recording notes

- 20–40 seconds. Darija or French, whichever the host actually speaks.
- Mono, ~96 kbps, under ~500 KB — this ships in the bundle's public folder.
- Get spoken consent on the recording itself, and only then may the host be named in
  `experience.host` (see the data-honesty note at the top of `src/data/experiences.ts`).
