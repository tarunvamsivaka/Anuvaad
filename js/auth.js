/**
 * Authentication: Supabase init, login/signup/signout, Stripe checkout.
 */

import { appState, API_BASE } from './state.js';
import { showToast } from './ui.js';

/**
 * Initialize Supabase authentication with retry logic.
 */
export function initAuth() {
    const signInBtn = document.getElementById('sign-in-btn');
    const overlay = document.getElementById('overlay');
    const closeModal = document.getElementById('close-modal');
    const accountWrap = document.getElementById('account-wrap');
    const accountBtn = document.getElementById('account-btn');
    const accountMenu = document.getElementById('account-menu');
    const menuEmail = document.getElementById('menu-email');
    const signOutBtn = document.getElementById('sign-out-btn');
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const authForm = document.getElementById('auth-form');
    const authError = document.getElementById('auth-error');
    const authSubmit = document.getElementById('auth-submit');
    const googleBtn = document.getElementById('google-btn');
    const stripeBtn = document.getElementById('stripe-btn');

    // === CRASH-PROOF SUPABASE INITIALIZATION ===
    // NOTE: The anon key below is PUBLIC by design (Supabase architecture).
    // It is safe to expose in client-side code. Row Level Security (RLS)
    // policies on the Supabase project enforce data access control.
    function initSupabase() {
        try {
            if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
                const supabaseUrl = 'https://lbqgvehjtbfkxawbznwd.supabase.co';
                const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxicWd2ZWhqdGJma3hhd2J6bndkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNTA5ODAsImV4cCI6MjA5MTgyNjk4MH0.Qz8n3jrmnSFfhkLdyAqaQJVR-Yw1Mnr8Y_4QbaZy8vY';
                appState.supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

                appState.supabase.auth.onAuthStateChange((event, session) => {
                    if (session) {
                        appState.currentUserEmail = session.user.email;
                        menuEmail.textContent = appState.currentUserEmail;
                        signInBtn.classList.add('hidden');
                        accountWrap.classList.remove('hidden');
                        overlay.classList.add('hidden');
                    } else {
                        appState.currentUserEmail = null;
                        signInBtn.classList.remove('hidden');
                        accountWrap.classList.add('hidden');
                    }
                });
                return true;
            }
        } catch (e) {
            console.error("Supabase initialization error:", e);
        }
        return false;
    }

    if (!initSupabase()) {
        let retries = 0;
        const retryInterval = setInterval(() => {
            retries++;
            if (initSupabase() || retries >= 10) {
                clearInterval(retryInterval);
                if (retries >= 10 && !appState.supabase) {
                    console.warn("Supabase CDN not available. Core translator will still work!");
                }
            }
        }, 500);
    }

    // === AUTH CLICK EVENTS ===
    googleBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!appState.supabase) return showToast("Authentication requires Supabase. Check your connection.", 'warning');
        const { error } = await appState.supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
        if (error) { authError.textContent = error.message; authError.style.display = 'block'; }
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!appState.supabase) return showToast("Authentication requires Supabase. Check your connection.", 'warning');
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const isSignup = tabSignup.classList.contains('active');
        authError.style.display = 'none';
        authSubmit.disabled = true;
        authSubmit.textContent = 'Processing…';
        try {
            let error;
            if (isSignup) { error = (await appState.supabase.auth.signUp({ email, password })).error; }
            else { error = (await appState.supabase.auth.signInWithPassword({ email, password })).error; }
            if (error) throw error;
            authForm.reset();
            showToast(isSignup ? 'Account created! Check your email.' : 'Signed in successfully.', 'success');
        } catch (err) {
            authError.textContent = err.message;
            authError.style.display = 'block';
        } finally {
            authSubmit.disabled = false;
            authSubmit.textContent = isSignup ? 'Create Account' : 'Log In';
        }
    });

    signOutBtn.addEventListener('click', async e => {
        e.preventDefault();
        if (appState.supabase) await appState.supabase.auth.signOut();
        appState.accountMenuOpen = false;
        accountMenu.classList.add('hidden');
        showToast('Signed out.', 'info');
    });

    // === STRIPE CHECKOUT ===
    stripeBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!appState.currentUserEmail || !appState.supabase) return;
        const originalText = stripeBtn.textContent;
        stripeBtn.textContent = "Connecting...";
        try {
            // Get the current session token for server-side auth verification
            const { data: { session } } = await appState.supabase.auth.getSession();
            if (!session) {
                showToast('Please sign in again to upgrade.', 'warning');
                return;
            }
            const response = await fetch(`${API_BASE}/api/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_email: appState.currentUserEmail,
                    access_token: session.access_token
                })
            });
            const data = await response.json();
            if (data.url) window.location.href = data.url;
            else if (data.detail) showToast(data.detail, 'error');
        } catch (err) {
            showToast('Payment failed to initialize. Ensure the backend is running.', 'error');
        } finally {
            stripeBtn.textContent = originalText;
        }
    });

    // === MODAL DROPDOWN UI ===
    signInBtn.addEventListener('click', () => { overlay.classList.remove('hidden'); });
    closeModal.addEventListener('click', () => { overlay.classList.add('hidden'); });
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.add('hidden'); });
    tabLogin.addEventListener('click', () => { tabLogin.classList.add('active'); tabSignup.classList.remove('active'); authSubmit.textContent = 'Log In'; });
    tabSignup.addEventListener('click', () => { tabSignup.classList.add('active'); tabLogin.classList.remove('active'); authSubmit.textContent = 'Create Account'; });
    accountBtn.addEventListener('click', e => { e.stopPropagation(); appState.accountMenuOpen = !appState.accountMenuOpen; accountMenu.classList.toggle('hidden', !appState.accountMenuOpen); });
    document.addEventListener('click', () => { appState.accountMenuOpen = false; accountMenu.classList.add('hidden'); });
}
