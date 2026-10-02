Status: ready-for-agent

# Meme shows in a dismissable popup

Parent spec: `../spec.md` (item 1)

## What to build

Remove the inline Meme from the result card and show it in a dismissable dialog over the result when a Round is won or lost, for both Songs and Food. Reuse the existing dialog styling and native dialog behaviour. Opens once per finished Round; resets when the next Round starts. Never opens when Memes are off, no Meme exists, or the image failed after its retry. Dismiss via close button, Escape or backdrop click. Initial focus on the close button; on close, focus returns to the result card's primary action (the result card's autofocus on Next must not fight the popup). Image scales to fit phone screens. Entrance animation disabled under reduced motion. Meme remains decoration only: no effect on Score, Streak, stats or pool rotation.

## Acceptance criteria

- [ ] Result card contains no inline Meme
- [ ] Popup opens for a finished Round with a Meme, in Songs and Food
- [ ] Popup absent when Memes are off, none available, or image failed
- [ ] Closes via close button, Escape and backdrop; stays closed for the rest of that Round
- [ ] Next/Try again resets it; the next finished Round can show it again
- [ ] Focus moves into the popup and returns to the result on close; Next remains reachable
- [ ] Fits at phone width without cropping or scrolling
- [ ] Tests drive the rendered game screens (RTL), asserting roles and visible behaviour
- [ ] DESIGN.md mentions the popup

## Blocked by

None.
