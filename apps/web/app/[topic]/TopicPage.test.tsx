// @vitest-environment jsdom
import assert from 'node:assert/strict';
import { afterEach, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '../components/I18nProvider';
import { TopicPage } from './TopicPage';

const fetchCatalogue = vi.hoisted(() => vi.fn());
vi.mock('@/lib/assets/urls', () => ({ assetUrls: { fetch: fetchCatalogue } }));
vi.mock('../components/PeopleGame', () => ({ PeopleGame: ({ catalogue }: { catalogue: { name: string }[] }) =>
  <p data-testid="people-game">{catalogue.map((person) => person.name).join(', ')}</p> }));
vi.mock('../components/AccountBar', () => ({ AccountBar: () => null }));
vi.mock('../components/GuestNotice', () => ({ GuestNotice: () => null }));
vi.mock('../components/SiteFooter', () => ({ SiteFooter: () => null }));
vi.mock('../components/InstallHint', () => ({ InstallHint: () => null }));

afterEach(() => { cleanup(); fetchCatalogue.mockReset(); localStorage.clear(); });

test('/people loads and validates the People catalogue, then renders its copy and game', async () => {
  localStorage.setItem('what-the-song:lang:v1', 'vi');
  fetchCatalogue.mockResolvedValue({ ok: true, json: async () => [{
    id: 'hoa-minzy', name: 'Hòa Minzy', field: 'Ca sĩ', tier: 'easy',
    photo: '0123456789abcdef01234567.jpg', sourceUrl: 'https://example.com/photo',
  }] });
  render(<I18nProvider><TopicPage topicId="people" /></I18nProvider>);
  await waitFor(() => assert.equal(screen.getByTestId('people-game').textContent, 'Hòa Minzy'));
  assert.equal(fetchCatalogue.mock.calls[0]?.[0], '/assets/people/catalogue.json');
  assert.match(screen.getByRole('heading', { level: 1 }).textContent ?? '', /Đoán người/);
  assert.match(document.body.textContent ?? '', /Gương mặt Việt/);
});

test('/people rejects an invalid catalogue before rendering a Round', async () => {
  localStorage.setItem('what-the-song:lang:v1', 'vi');
  fetchCatalogue.mockResolvedValue({ ok: true, json: async () => [{ id: 'bad' }] });
  render(<I18nProvider><TopicPage topicId="people" /></I18nProvider>);
  await waitFor(() => assert.match(document.body.textContent ?? '', /Không tải được thư viện người/));
  assert.equal(screen.queryByTestId('people-game'), null);
});
