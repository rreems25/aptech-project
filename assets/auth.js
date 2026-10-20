/*
 * Alpine Ascents front-end demo authentication.
 * This is intentionally NOT real authentication. Never store real passwords here.
 * Registration records profile names/emails in this browser only; login accepts
 * a valid-looking email and a password of 6+ characters for demonstration.
 */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const modalEl = $('login-modal');
  const form = $('auth-form');
  if (!modalEl || !form || !window.bootstrap) return;

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  const fields = {
    nameWrap: $('auth-name-wrap'), name: $('auth-name'), email: $('auth-email'),
    passwordWrap: $('auth-password-wrap'), password: $('auth-password'),
    remember: $('auth-remember'), loginOptions: $('auth-login-options'),
    title: $('auth-modal-title'), subtitle: $('auth-subtitle'), submit: $('auth-submit-label'),
    switchPrompt: $('auth-switch-prompt'), switchButton: $('auth-switch-button'),
    switchWrap: $('auth-switch-wrap'), back: $('auth-back-button'),
    forgot: $('auth-forgot-button'), feedback: $('auth-feedback'),
    toggle: $('auth-toggle-password'), navButton: $('login-nav-button'), navLabel: $('login-nav-label')
  };
  let mode = 'login';
  const storageKey = 'alpineAscentsDemoProfiles';
  const emailKey = 'alpineAscentsRememberedEmail';
  const sessionKey = 'alpineAscentsDemoSession';

  function readProfiles() {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); }
    catch (_) { return []; }
  }
  function showFeedback(message, type = 'info') {
    fields.feedback.textContent = message;
    fields.feedback.className = `auth-feedback ${type}`;
    fields.feedback.hidden = false;
  }
  function clearFeedback() {
    fields.feedback.textContent = '';
    fields.feedback.hidden = true;
    fields.feedback.className = 'auth-feedback';
  }
  function setMode(nextMode) {
    mode = nextMode;
    clearFeedback();
    form.classList.remove('was-validated');
    form.reset();
    fields.email.value = localStorage.getItem(emailKey) || '';
    fields.password.type = 'password';
    fields.toggle.innerHTML = '<i class="bi bi-eye"></i>';
    fields.toggle.setAttribute('aria-label', 'Show password');
    fields.nameWrap.hidden = mode !== 'register';
    fields.passwordWrap.hidden = mode === 'forgot';
    fields.loginOptions.hidden = mode !== 'login';
    fields.switchWrap.hidden = mode === 'forgot';
    fields.back.hidden = mode !== 'forgot';
    fields.title.textContent = mode === 'register' ? 'Create your profile' : mode === 'forgot' ? 'Reset password' : 'Welcome back';
    fields.subtitle.textContent = mode === 'register' ? 'Join the Alpine Ascents community.' : mode === 'forgot' ? 'Sign in to your Alpine Ascents profile.';
    fields.submit.textContent = mode === 'register' ? 'Create profile' : mode === 'forgot' ? 'Send reset instructions' : 'Sign in';
    fields.switchPrompt.textContent = mode === 'register' ? 'Already have a profile?' : 'New to Alpine Ascents?';
    fields.switchButton.textContent = mode === 'register' ? 'Sign in' : 'Create an account';
    fields.password.autocomplete = mode === 'register' ? 'new-password' : 'current-password';
    fields.password.required = mode !== 'forgot';
    fields.name.required = mode === 'register';
  }
  function emailIsValid(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }

  fields.switchButton.addEventListener('click', () => setMode(mode === 'register' ? 'login' : 'register'));
  fields.forgot.addEventListener('click', () => setMode('forgot'));
  fields.back.addEventListener('click', () => setMode('login'));
  fields.toggle.addEventListener('click', () => {
    const reveal = fields.password.type === 'password';
    fields.password.type = reveal ? 'text' : 'password';
    fields.toggle.innerHTML = reveal ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
    fields.toggle.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearFeedback();
    const email = fields.email.value.trim().toLowerCase();
    const password = fields.password.value;
    let valid = emailIsValid(email);
    fields.email.classList.toggle('is-invalid', !valid);
    if (mode === 'register') {
      const nameValid = fields.name.value.trim().length > 0;
      fields.name.classList.toggle('is-invalid', !nameValid);
      valid = valid && nameValid;
    }
    if (mode !== 'forgot') {
      const passwordValid = password.length >= 6;
      fields.password.classList.toggle('is-invalid', !passwordValid);
      valid = valid && passwordValid;
    }
    if (!valid) {
      showFeedback(mode === 'forgot' ? 'Enter a valid email address.' : 'Check the highlighted fields. Use a valid email and a password with at least 6 characters.', 'error');
      return;
    }

    if (mode === 'register') {
      const profiles = readProfiles();
      if (profiles.some(profile => profile.email === email)) {
        showFeedback('A demo profile with this email already exists. Try signing in.', 'error');
        return;
      }
      profiles.push({ name: fields.name.value.trim(), email });
      try { localStorage.setItem(storageKey, JSON.stringify(profiles)); }
      catch (_) { showFeedback('Browser storage is unavailable. The demo profile cannot be saved.', 'error'); return; }
      showFeedback('Demo profile created in this browser. You can now sign in with any password of 6+ characters. No password was saved.', 'success');
      setMode('login');
      fields.email.value = email;
      showFeedback('Demo profile created! Sign in using this email and any password of at least 6 characters.', 'success');
      return;
    }

    if (mode === 'forgot') {
      const known = readProfiles().some(profile => profile.email === email);
      showFeedback(known ? 'Demo reset flow complete: in a real site, instructions would be sent by email. No email was sent.' : 'If a demo profile exists for this email, a real site would send reset instructions. No email was sent.', 'info');
      return;
    }

    if (fields.remember.checked) {
      try { localStorage.setItem(emailKey, email); } catch (_) { /* optional preference */ }
    } else {
      try { localStorage.removeItem(emailKey); } catch (_) { /* optional preference */ }
    }
    const profiles = readProfiles();
    const profile = profiles.find(item => item.email === email);
    const displayName = profile?.name || email.split('@')[0];
    try { sessionStorage.setItem(sessionKey, JSON.stringify({ name: displayName, email })); }
    catch (_) { /* session display still works */ }
    fields.navLabel.textContent = displayName.split(' ')[0] || 'Profile';
    fields.navButton.setAttribute('aria-label', `Signed in demo as ${email}. Click to sign out.`);
    showFeedback(`Demo sign-in successful. Welcome, ${displayName}! This is a local demonstration only.`, 'success');
    fields.submit.textContent = 'Signed in';
    fields.submit.disabled = true;
    window.setTimeout(() => modal.hide(), 1300);
  });

  fields.navButton.addEventListener('click', (event) => {
    const signedIn = (() => { try { return !!sessionStorage.getItem(sessionKey); } catch (_) { return false; } })();
    if (!signedIn) return;
    // Bootstrap's data API would otherwise open the modal; prevent that to sign out.
    event.preventDefault();
    event.stopPropagation();
    try { sessionStorage.removeItem(sessionKey); } catch (_) { /* ignore */ }
    fields.navLabel.textContent = 'Login';
    fields.navButton.setAttribute('aria-label', 'Open login dialog');
    fields.submit.disabled = false;
    setMode('login');
    showFeedback('You have signed out of the demo profile.', 'info');
    modal.show();
  });

  modalEl.addEventListener('show.bs.modal', () => {
    const remembered = (() => { try { return localStorage.getItem(emailKey); } catch (_) { return null; } })();
    if (mode === 'login' && remembered) { fields.email.value = remembered; fields.remember.checked = true; }
  });
  modalEl.addEventListener('hidden.bs.modal', () => {
    clearFeedback();
    fields.submit.disabled = false;
    form.classList.remove('was-validated');
  });
  setMode('login');
  try {
    const activeSession = JSON.parse(sessionStorage.getItem(sessionKey) || 'null');
    if (activeSession?.email) {
      fields.navLabel.textContent = (activeSession.name || 'Profile').split(' ')[0];
      fields.navButton.setAttribute('aria-label', `Signed in demo as ${activeSession.email}. Click to sign out.`);
    }
  } catch (_) { /* no saved session */ }
})();
