// @vitest-environment jsdom
import assert from 'node:assert/strict';
import { afterEach, describe, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GuessBar } from './GuessBar';
import { I18nProvider } from './I18nProvider';

afterEach(() => { cleanup(); localStorage.clear(); });

describe.each(['songs', 'food', 'people'] as const)('%s GuessBar', (topic) => {
  function setup(lastStage = false) {
    const onGuess = vi.fn();
    const onRevealMore = vi.fn();
    const onGiveUp = vi.fn();
    render(<I18nProvider><GuessBar
      topic={topic}
      lastStage={lastStage}
      revealCost="Next clue · 100 points left"
      onGuess={onGuess}
      onRevealMore={onRevealMore}
      onGiveUp={onGiveUp}
    /></I18nProvider>);
    return { onGuess, onRevealMore, onGiveUp };
  }

  test('Reveal more and Give up are separate actions even with a typed Guess', () => {
    const handlers = setup();
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Test' } });
    const reveal = screen.getByRole('button', { name: /gợi ý thêm|reveal more/i });
    assert.match(reveal.textContent ?? '', /100 points left/);
    fireEvent.click(reveal);
    assert.equal(handlers.onRevealMore.mock.calls.length, 1);
    assert.equal(handlers.onGiveUp.mock.calls.length, 0);
    assert.equal(handlers.onGuess.mock.calls.length, 0);
    fireEvent.click(screen.getByRole('button', { name: /bỏ qua|give up/i }));
    assert.equal(handlers.onGiveUp.mock.calls.length, 1);
    assert.equal(handlers.onGuess.mock.calls.length, 0);
  });

  test('Enter on empty or whitespace does nothing; Guess requires text', () => {
    const handlers = setup();
    const input = screen.getByRole('textbox');
    const guess = screen.getByRole('button', { name: /đoán|guess/i });
    assert.equal(guess.hasAttribute('disabled'), true);
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    assert.equal(handlers.onGuess.mock.calls.length, 0);
    assert.equal(handlers.onRevealMore.mock.calls.length, 0);
    assert.equal(handlers.onGiveUp.mock.calls.length, 0);
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    assert.deepEqual(handlers.onGuess.mock.calls[0], ['Test']);
  });

  test('last Stage hides Reveal more but keeps Give up', () => {
    setup(true);
    assert.equal(screen.queryByRole('button', { name: /gợi ý thêm|reveal more/i }), null);
    assert.ok(screen.getByRole('button', { name: /bỏ qua|give up/i }));
  });
});
