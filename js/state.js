/**
 * Shared mutable state and constants for Anuvaad.
 *
 * Every module imports this to read/write app-wide state
 * without tight coupling.
 */

export const API_BASE = window.location.port === '5500' ? 'http://127.0.0.1:8000' : '';
export const MAX_CHARS = 10000;
export const WARN_CHARS = 5000;
export const FREE_TIER_LIMIT = 10;
export const HISTORY_KEY = 'anuvaad-history';
export const USAGE_KEY = 'anuvaad-usage';

/**
 * Mutable application state.
 * Modules mutate properties directly (e.g., `appState.mode = 'en-to-code'`).
 */
export const appState = {
    /** @type {Array} Current translation blocks */
    state: [],
    /** @type {string|null} Logged-in user email */
    currentUserEmail: null,
    /** @type {boolean} Whether the account dropdown is open */
    accountMenuOpen: false,
    /** @type {'code-to-en'|'en-to-code'|'code-to-code'} Current translation mode */
    mode: 'code-to-en',
    /** @type {boolean} Whether the user is on the Pro tier */
    isPro: false,
    /** @type {object|null} Supabase client instance */
    supabase: null,
};
