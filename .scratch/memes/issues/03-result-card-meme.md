# Show the Meme on the result card

Status: done
Blocked by: 02

See `spec.md` decisions 1, 3, 4, 10.

In `ResultCard`, render the picked Meme between the stamp and the cover/title, chosen by `round.status`. Empty `alt`. If the image fails to load, remove it (retry once with a fresh signed URL, as the cover does) and leave no empty box. It must not shift the layout in a way that pushes the Next button off screen on a phone. Follow `DESIGN.md` for styling and add a `data-testid` for tests. Works for any Topic's Round, not only Songs.

## Done when
- A won Round shows a won Meme and a lost Round a lost Meme.
- No Meme, a failed image or an off setting leaves the card exactly as it is today.
- Layout check at phone width: title, artist, history and the Next button remain reachable without horizontal scroll.
- Score, share text and `shareSquares` are unchanged.
- Component tests cover won, lost, empty pool and image-error.
