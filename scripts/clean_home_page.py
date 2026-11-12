import re
from pathlib import Path

INDEX_FILE = Path(r"c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project\ui\index.html")
code = INDEX_FILE.read_text(encoding="utf-8").replace("\r\n", "\n")

# Remove fast-test-section completely
pattern = r"\n\s*<section class=\"fast-test-section card\"[\s\S]*?</section>\n"
assert re.search(pattern, code), "fast-test-section not found"
code = re.sub(pattern, "\n", code)

INDEX_FILE.write_text(code, encoding="utf-8", newline="\r\n")
print("SUCCESS: Removed fast-test-section, home page now displays only the 6 portals.")
