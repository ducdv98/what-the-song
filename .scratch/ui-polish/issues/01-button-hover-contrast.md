Status: ready-for-agent

# Button hover keeps text readable

Parent spec: `../spec.md` (item 4)

## What to build

Fix hover (and focus, active, disabled) on every button-like control so text is always readable. Root cause: generic hover rules (pill, action button) have higher selector specificity than the dark variants (accent pill, Guess), so hover turns the background light while the text stays light. Each variant must own its hover/focus/active/disabled colours explicitly; hover styling applies only on devices that can hover. Audit all button-like classes (action button and variants, pill and variants, icon button, tier chip, Next button, play control, topic card). New shades become named tokens. Update DESIGN.md with the hover rule.

## Acceptance criteria

- [ ] Dark accent pills, the Guess button and the Next button stay readable on hover, focus and active
- [ ] Light buttons shift to a clearly different but readable shade on hover
- [ ] Disabled buttons have no hover effect and remain legible
- [ ] No sticky hover colour after a tap on touch devices
- [ ] A check asserts text/background contrast >= 4.5:1 for every button-like class and state (stylesheet parse, or computed-style check in a browser)
- [ ] No new hard-coded hex values; DESIGN.md updated

## Blocked by

None.
