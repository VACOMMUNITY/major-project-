with open(r'c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project\ui\index.html', 'r', encoding='utf-8') as f:
    content = f.read().replace('\r\n', '\n')

old_part = """          </div>
        </aside>
      </section>

      <section class="access-section" aria-labelledby="access-heading">"""

new_part = """          </div>
        </aside>
      </section>

      <section class="fast-test-section card" style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 2rem; border-color: rgba(59, 130, 246, 0.4); background: linear-gradient(135deg, rgba(30, 58, 138, 0.35), rgba(15, 23, 42, 0.6));">
        <div>
          <p class="eyebrow" style="color: #60a5fa; margin-bottom: 0.25rem;">⚡ FAST 1-CLICK TEST LOGIN</p>
          <h2 style="font-size: 1.15rem; margin: 0; color: #f8fafc;">MVSR Engineering College Dataset</h2>
          <p class="muted" style="margin: 0.2rem 0 0; font-size: 0.85rem;">Instantly sign in and open test dashboards in one click without manual typing.</p>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
          <a class="button button-primary" href="login.html?role=engineering-student&autologin=2451-23-737-001" style="font-size: 0.85rem; padding: 0.5rem 0.9rem;">⚡ Student 001</a>
          <a class="button button-primary" href="login.html?role=engineering-driver&autologin=MVSR-DRV-001" style="font-size: 0.85rem; padding: 0.5rem 0.9rem;">⚡ Driver MVSR-DRV-001</a>
          <a class="button button-primary" href="login.html?role=parent&autologin=MVSR-PARENT-001" style="font-size: 0.85rem; padding: 0.5rem 0.9rem;">⚡ Parent 001</a>
        </div>
      </section>

      <section class="access-section" aria-labelledby="access-heading">"""

assert old_part in content, "old_part not found"
content = content.replace(old_part, new_part, 1)

with open(r'c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project\ui\index.html', 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(content)

print("SUCCESS: index.html updated")
