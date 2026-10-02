# "Memes on/off" setting

Status: ready-for-agent
Blocked by: 03

See `spec.md` decision 5.

Add a Memes toggle to the game menu, default on, remembered in localStorage with the same try/catch handling as the other remembered choices, with en/vi labels. When off, no Meme is shown or signed.

## Done when
- The toggle appears in the menu and survives a reload.
- Off means `ResultCard` shows no Meme and the Round-start call does not sign Meme keys.
- localStorage being blocked falls back to on without throwing.
- en and vi strings exist.
