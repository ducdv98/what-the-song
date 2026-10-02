# Install hint

Status: done
Blocked by: 04, 05

See `spec.md` (PWA: Install hint).

Show a small dismissible hint for installing.

Where the browser fires the install-prompt event, offer an install button; on iOS Safari show a one-line "Share → Add to Home Screen" instruction (both languages). Hide it when already standalone or after dismissal; remember dismissal with the other remembered choices in local storage. Never blocks play.

## Done when
- Hint is hidden in standalone mode and after dismissal, shown otherwise when installable or on iOS Safari.
- Dismissal is persisted and covered by the storage tests; strings exist in both languages.
