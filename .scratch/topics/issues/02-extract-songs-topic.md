# Extract Songs into @wts/topic-songs

Status: resolved
Blocked by: 01

Move Song, clip lookups, Song matching rules and Genre data out of core into `@wts/topic-songs`, exporting one `Topic` value. Core keeps only Topic-neutral code; the Vietnamese accent folding stays in core as a shared utility.

## Done when
- Core has no Song, clip or genre code.
- The Songs Topic value satisfies the contract; existing tests moved with their code and pass.
- Game behavior is identical in the browser.
