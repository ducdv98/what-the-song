# Reveal renderer

Status: ready-for-agent
Blocked by: 02

Add the Reveal renderer in `apps/web`, keyed by `people`: show the top *n*% of the Person's photo, from the hair down, growing Stage by Stage until the whole face shows at the last. The reveal is done in the browser; the full photo is sent.

## Done when
- Each of the five Stages shows the right fraction, including a per-Person override.
- No Credit is rendered for a Person.
- Tests cover the fractions at every Stage and across widths.
