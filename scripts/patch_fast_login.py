import re

# 1. Patch app.js to add Fast 1-Click login buttons and URL autologin parameter
with open(r'c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project\ui\assets\app.js', 'r', encoding='utf-8') as f:
    app_js = f.read().replace('\r\n', '\n')

old_empty_config = """  if (!config) {
    root.innerHTML = `<main class="auth-shell"><section class="auth-card card"><a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">IB</span><span>Intelli<span class="brand-accent">Bus</span></span></a><h1>Choose an access type</h1><p class="auth-subtitle">Select your role from the IntelliBus home page to open the matching sign-in form.</p><a class="button button-primary" href="index.html">Back to home</a></section></main>`;
    return;
  }"""

new_empty_config = """  if (!config) {
    root.innerHTML = `<main class="auth-shell"><section class="auth-card card"><a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">IB</span><span>Intelli<span class="brand-accent">Bus</span></span></a><h1>Choose your sign-in role</h1><p class="auth-subtitle">Select your role or use 1-click test sign-in below.</p><div style="display:grid;gap:0.6rem;margin-top:1rem;"><a class="button button-primary" href="login.html?role=engineering-student&autologin=2451-23-737-001">⚡ 1-Click Engineering Student (001)</a><a class="button button-primary" href="login.html?role=engineering-driver&autologin=MVSR-DRV-001">⚡ 1-Click Engineering Driver (MVSR-DRV-001)</a><a class="button button-primary" href="login.html?role=parent&autologin=MVSR-PARENT-001">⚡ 1-Click Parent (001)</a><a class="button button-secondary" href="index.html">← Back to home portal</a></div></section></main>`;
    return;
  }"""

assert old_empty_config in app_js, "old_empty_config not found"
app_js = app_js.replace(old_empty_config, new_empty_config, 1)

old_form_markup = """          <p class="form-error" id="form-error" role="alert" aria-live="polite"></p>
          <button class="button button-primary" type="submit">Continue to dashboard</button>
        </form>"""

new_form_markup = """          ${role === "engineering-student" ? `
            <div class="quick-test-bar" style="margin: 0.75rem 0; padding: 0.6rem 0.75rem; background: rgba(37,99,235,0.1); border: 1px solid rgba(59,130,246,0.3); border-radius: 6px; font-size: 0.85rem;">
              <div style="font-weight: 600; color: #93c5fd; margin-bottom: 0.4rem;">⚡ Fast 1-Click Fill & Sign-in:</div>
              <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                <button type="button" class="button button-secondary quick-fill-btn" data-id="2451-23-737-001" style="font-size: 0.78rem; padding: 0.3rem 0.6rem;">⚡ Student 001</button>
                <button type="button" class="button button-secondary quick-fill-btn" data-id="2451-23-737-050" style="font-size: 0.78rem; padding: 0.3rem 0.6rem;">⚡ Student 050</button>
                <button type="button" class="button button-secondary quick-fill-btn" data-id="2451-23-737-123" style="font-size: 0.78rem; padding: 0.3rem 0.6rem;">⚡ Student 123</button>
              </div>
            </div>` : role === "engineering-driver" ? `
            <div class="quick-test-bar" style="margin: 0.75rem 0; padding: 0.6rem 0.75rem; background: rgba(37,99,235,0.1); border: 1px solid rgba(59,130,246,0.3); border-radius: 6px; font-size: 0.85rem;">
              <div style="font-weight: 600; color: #93c5fd; margin-bottom: 0.4rem;">⚡ Fast 1-Click Fill & Sign-in:</div>
              <button type="button" class="button button-secondary quick-fill-btn" data-id="MVSR-DRV-001" data-pass="Driver@123" style="font-size: 0.78rem; padding: 0.3rem 0.6rem;">⚡ Fixed Driver (MVSR-DRV-001)</button>
            </div>` : role === "parent" ? `
            <div class="quick-test-bar" style="margin: 0.75rem 0; padding: 0.6rem 0.75rem; background: rgba(37,99,235,0.1); border: 1px solid rgba(59,130,246,0.3); border-radius: 6px; font-size: 0.85rem;">
              <div style="font-weight: 600; color: #93c5fd; margin-bottom: 0.4rem;">⚡ Fast 1-Click Fill & Sign-in:</div>
              <button type="button" class="button button-secondary quick-fill-btn" data-id="MVSR-PARENT-001" data-pass="Parent@123" style="font-size: 0.78rem; padding: 0.3rem 0.6rem;">⚡ Linked Parent (001)</button>
            </div>` : ""}
          <p class="form-error" id="form-error" role="alert" aria-live="polite"></p>
          <button class="button button-primary" type="submit">Continue to dashboard</button>
        </form>"""

assert old_form_markup in app_js, "old_form_markup not found"
app_js = app_js.replace(old_form_markup, new_form_markup, 1)

old_toggle_event = """  toggle.addEventListener("click", () => {
    const reveal = passwordInput.type === "password";
    passwordInput.type = reveal ? "text" : "password";
    toggle.textContent = reveal ? "Hide" : "Show";
    toggle.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
    toggle.setAttribute("aria-pressed", String(reveal));
    passwordInput.focus();
  });"""

new_toggle_event = """  toggle.addEventListener("click", () => {
    const reveal = passwordInput.type === "password";
    passwordInput.type = reveal ? "text" : "password";
    toggle.textContent = reveal ? "Hide" : "Show";
    toggle.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
    toggle.setAttribute("aria-pressed", String(reveal));
    passwordInput.focus();
  });

  root.querySelectorAll(".quick-fill-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      accountInput.value = btn.dataset.id;
      passwordInput.value = btn.dataset.pass || btn.dataset.id;
      form.requestSubmit();
    });
  });

  const autologin = new URLSearchParams(window.location.search).get("autologin");
  if (autologin) {
    accountInput.value = autologin;
    if (role === "engineering-student") {
      passwordInput.value = autologin;
    } else if (role === "engineering-driver") {
      passwordInput.value = "Driver@123";
    } else if (role === "parent") {
      passwordInput.value = "Parent@123";
    }
    window.setTimeout(() => form.requestSubmit(), 0);
  }"""

assert old_toggle_event in app_js, "old_toggle_event not found"
app_js = app_js.replace(old_toggle_event, new_toggle_event, 1)

with open(r'c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project\ui\assets\app.js', 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(app_js)

print("SUCCESS: app.js updated with fast test login")
