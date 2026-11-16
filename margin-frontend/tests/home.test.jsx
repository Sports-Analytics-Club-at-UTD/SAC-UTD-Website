// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Home from '../src/pages/Home';
import Login from '../src/pages/Login';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [] })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const show = (component) => render(<MemoryRouter>{component}</MemoryRouter>);

describe('club redesign', () => {
  it('keeps the homepage usable when feeds are unavailable', async () => {
    fetch.mockRejectedValue(new Error('Offline'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    show(<Home />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('A better question');
    expect(screen.getByRole('link', { name: /Find your team/ }).getAttribute('href')).toBe('/signup');
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(5));
    expect(screen.queryByText('71.4%')).toBeNull();
    consoleError.mockRestore();
  });
  it('opens and closes accessible mobile navigation', async () => {
    const user = userEvent.setup();
    show(<Home />);
    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('navigation', { name: 'Mobile navigation' })).toBeTruthy();
    await user.click(within(dialog).getByRole('link', { name: 'Our work' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
  it('preserves role links and logout', async () => {
    localStorage.setItem('sac_auth_token', 'test-token');
    fetch.mockImplementation(async url => ({ ok: true, json: async () => url.includes('whoami') ? { id: 1, role: 'exec' } : [] }));
    const user = userEvent.setup();
    show(<Home />);
    expect(await screen.findByRole('link', { name: 'Secretary' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Marketing' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'R&D portal' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Log out' }));
    expect(localStorage.getItem('sac_auth_token')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Secretary' })).toBeNull();
  });
  it('does not clear a session during a backend outage', async () => {
    localStorage.setItem('sac_auth_token', 'test-token');
    fetch.mockImplementation(async url => ({ ok: !url.includes('whoami'), status: 503, json: async () => [] }));
    show(<Home />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(6));
    expect(localStorage.getItem('sac_auth_token')).toBe('test-token');
  });
  it('keeps login fields labelled and submits the existing API payload', async () => {
    fetch.mockResolvedValue({ ok: false, json: async () => ({ detail: 'Invalid credentials' }) });
    const user = userEvent.setup();
    show(<Login />);
    await user.type(screen.getByLabelText('Username'), 'member');
    await user.type(screen.getByLabelText('Password'), 'example');
    await user.click(screen.getByRole('button', { name: 'Authenticate' }));
    expect(await screen.findByRole('status')).toBeTruthy();
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ username: 'member', password: 'example' });
  });
});
