// Task-Mate auth — login, register and the session guard for the app.
// Load in <head> with data-page="login" | "register" | "app".
//
// NOTE: this is front-end only. Accounts live in this browser's localStorage, so it is
// fine for a demo or school project but is NOT real security. Swap the user/session
// functions below for calls to a real backend when you have one.
(function () {
  "use strict";

  const PAGE = document.currentScript && document.currentScript.dataset.page;
  const USERS_KEY = "tm_users";
  const SESSION_KEY = "tm_session";
  const APP_URL = "app.html";

  /* ---------- storage helpers ---------- */
  function readJSON(store, key, fallback) {
    try {
      const v = JSON.parse(store.getItem(key));
      return v == null ? fallback : v;
    } catch (_) { return fallback; }
  }
  const getUsers  = () => readJSON(localStorage, USERS_KEY, []);
  const saveUsers = list => localStorage.setItem(USERS_KEY, JSON.stringify(list));

  function getSession() {
    return readJSON(sessionStorage, SESSION_KEY, null) || readJSON(localStorage, SESSION_KEY, null);
  }
  function clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
  }
  function setSession(user, remember) {
    clearSession();
    const store = remember ? localStorage : sessionStorage;
    store.setItem(SESSION_KEY, JSON.stringify({ id: user.id, name: user.name, email: user.email }));
  }

  /* ---------- password hashing ---------- */
  const toHex = bytes => Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  const makeSalt = () => toHex(crypto.getRandomValues(new Uint8Array(8)));

  async function hashPassword(password, salt) {
    const data = new TextEncoder().encode(salt + ":" + password);
    if (window.crypto && crypto.subtle) {
      return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", data)));
    }
    // Fallback for non-secure contexts (e.g. plain http on a LAN address): weak, demo only.
    let h = 5381;
    for (const b of data) h = ((h << 5) + h + b) >>> 0;
    return "x" + h.toString(16);
  }

  /* =====================================================
     APP PAGE — guard + profile + logout
     ===================================================== */
  if (PAGE === "app") {
    const session = getSession();
    if (!session) { location.replace("login.html"); return; }

    document.addEventListener("DOMContentLoaded", () => {
      const parts = session.name.trim().split(/\s+/);
      const short = parts.length > 1 ? parts[0] + " " + parts[parts.length - 1][0] + "." : parts[0];
      const initials = (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();

      const nameEl = document.querySelector(".profile-name");
      const avatarEl = document.querySelector(".avatar");
      if (nameEl) nameEl.textContent = short;
      if (avatarEl) avatarEl.textContent = initials;

      const logout = document.getElementById("logoutBtn");
      if (logout) logout.addEventListener("click", e => {
        e.preventDefault();
        clearSession();
        location.href = "index.html";
      });
    });
    return;
  }

  /* =====================================================
     LOGIN + REGISTER
     ===================================================== */
  if (getSession()) { location.replace(APP_URL); return; }

  const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  function setError(input, message) {
    const field = input.closest(".field");
    const out = field.querySelector(".field-error");
    field.classList.toggle("invalid", !!message);
    input.setAttribute("aria-invalid", message ? "true" : "false");
    out.textContent = message || "";
  }

  function wireCommon(form) {
    const formErr = document.getElementById("formErr");
    const submitBtn = document.getElementById("submitBtn");
    const label = submitBtn.textContent;

    // clear a field's error as soon as the user edits it
    form.querySelectorAll(".field input").forEach(input => {
      input.addEventListener("input", () => { setError(input, ""); formErr.textContent = ""; });
    });

    // show / hide password
    form.querySelectorAll(".pw-toggle").forEach(btn => {
      btn.addEventListener("click", () => {
        const input = document.getElementById(btn.dataset.target);
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.textContent = show ? "Hide" : "Show";
        btn.setAttribute("aria-pressed", String(show));
      });
    });

    return {
      formError: msg => { formErr.textContent = msg; },
      busy: on => { submitBtn.disabled = on; submitBtn.textContent = on ? "Processing…" : label; },
      clearFormError: () => { formErr.textContent = ""; }
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    /* ---------- login ---------- */
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      const ui = wireCommon(loginForm);
      const email = document.getElementById("email");
      const password = document.getElementById("password");
      const remember = document.getElementById("remember");

      loginForm.addEventListener("submit", async e => {
        e.preventDefault();
        ui.clearFormError();

        const emailVal = email.value.trim().toLowerCase();
        let firstBad = null;
        if (!isEmail(emailVal)) { setError(email, "Enter a valid email address"); firstBad = firstBad || email; }
        if (!password.value)    { setError(password, "Password is required");     firstBad = firstBad || password; }
        if (firstBad) { firstBad.focus(); return; }

        ui.busy(true);
        try {
          const user = getUsers().find(u => u.email === emailVal);
          const hash = user ? await hashPassword(password.value, user.salt) : null;
          if (!user || hash !== user.hash) {
            ui.formError("Credentials not recognised — check and retry");
            ui.busy(false);
            return;
          }
          setSession(user, remember.checked);
          location.href = APP_URL;
        } catch (_) {
          ui.formError("Something went wrong — is browser storage blocked?");
          ui.busy(false);
        }
      });
    }

    /* ---------- register ---------- */
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
      const ui = wireCommon(registerForm);
      const name = document.getElementById("name");
      const email = document.getElementById("email");
      const password = document.getElementById("password");
      const confirm = document.getElementById("confirm");
      const meter = document.getElementById("meter");
      const meterLabel = document.getElementById("meterLabel");
      const LABELS = ["", "Weak", "Fair", "Good", "Strong"];

      function strength(pw) {
        if (!pw) return 0;
        if (pw.length < 8) return 1;
        let s = 1;
        if (pw.length >= 12) s++;
        if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
        if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
        return Math.min(4, s);
      }
      password.addEventListener("input", () => {
        const level = strength(password.value);
        meter.dataset.level = level;
        meterLabel.textContent = level ? "Strength: " + LABELS[level] : "";
      });

      registerForm.addEventListener("submit", async e => {
        e.preventDefault();
        ui.clearFormError();

        const nameVal = name.value.trim().replace(/\s+/g, " ");
        const emailVal = email.value.trim().toLowerCase();
        let firstBad = null;
        const bad = (input, msg) => { setError(input, msg); firstBad = firstBad || input; };

        if (nameVal.length < 2)          bad(name, "Enter your full name");
        if (!isEmail(emailVal))          bad(email, "Enter a valid email address");
        if (password.value.length < 8)   bad(password, "Use at least 8 characters");
        if (confirm.value !== password.value || !confirm.value) bad(confirm, "Passwords do not match");
        if (firstBad) { firstBad.focus(); return; }

        ui.busy(true);
        try {
          const users = getUsers();
          if (users.some(u => u.email === emailVal)) {
            bad(email, "A record with this email already exists");
            email.focus();
            ui.busy(false);
            return;
          }
          const salt = makeSalt();
          const user = {
            id: Date.now(),
            name: nameVal,
            email: emailVal,
            salt,
            hash: await hashPassword(password.value, salt),
            created: new Date().toISOString()
          };
          users.push(user);
          saveUsers(users);
          setSession(user, true);
          location.href = APP_URL;
        } catch (_) {
          ui.formError("Could not save — is browser storage blocked?");
          ui.busy(false);
        }
      });
    }
  });
})();