import re
from pathlib import Path

APP_JS = Path(r"c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project\ui\assets\app.js")
code = APP_JS.read_text(encoding="utf-8").replace("\r\n", "\n")

# 1. Update syncTransitUi in loadStudentTransportDashboard
old_sync_start = """    const syncTransitUi = () => {
      const savedData = JSON.parse(localStorage.getItem("intellibus.live_transit." + studentAcc) || "null");"""

new_sync_start = """    const syncTransitUi = () => {
      const savedData = JSON.parse(localStorage.getItem("intellibus.live_transit." + studentAcc) || "null");
      const enteringPlaceEl = root.querySelector("#entering-place-display");
      const exitPlaceEl = root.querySelector("#exit-place-display");
      if (enteringPlaceEl && savedData?.pickupPlace) {
        enteringPlaceEl.textContent = savedData.pickupPlace;
      }
      if (exitPlaceEl && savedData?.dropPlace) {
        exitPlaceEl.textContent = savedData.dropPlace;
      }"""

assert old_sync_start in code, "old_sync_start not found"
code = code.replace(old_sync_start, new_sync_start, 1)

# Wire live listener in loadStudentTransportDashboard
old_sync_call = """    syncTransitUi();"""

new_sync_call = """    syncTransitUi();
    // Live update listeners across tabs/driver actions
    window.addEventListener("storage", syncTransitUi);
    window.addEventListener("intellibus:transit-updated", syncTransitUi);
    const liveTransitTimer = window.setInterval(syncTransitUi, 1000);
    window.addEventListener("pagehide", () => window.clearInterval(liveTransitTimer), { once: true });"""

assert old_sync_call in code, "old_sync_call not found"
code = code.replace(old_sync_call, new_sync_call, 1)

# 2. Add listener to loadParentTransportDashboard
old_parent_timer = """    const refreshTimer = window.setInterval(() => {
      if (!document.hidden) refreshParentTransport();
    }, 30000);"""

new_parent_timer = """    const refreshTimer = window.setInterval(() => {
      if (!document.hidden) refreshParentTransport();
    }, 2000);
    window.addEventListener("storage", refreshParentTransport);
    window.addEventListener("intellibus:transit-updated", refreshParentTransport);"""

assert old_parent_timer in code, "old_parent_timer not found"
code = code.replace(old_parent_timer, new_parent_timer, 1)

APP_JS.write_text(code, encoding="utf-8", newline="\r\n")
print("SUCCESS: Student & Parent live listeners updated")
