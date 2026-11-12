import qrcode
import json
from pathlib import Path

BASE_DIR = Path(r"c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project")
OUT_FILE = BASE_DIR / "ui" / "assets" / "junior-qr.js"

packed = {}
for i in range(1, 124):
    sid = f"INT-2026-{i:03d}"
    qr = qrcode.QRCode(box_size=1, border=2)
    qr.add_data(sid)
    qr.make(fit=True)
    m = qr.get_matrix()
    s = len(m)
    orig_bits = "".join("1" if m[r][c] else "0" for r in range(s) for c in range(s))
    hex_str = f"{int(orig_bits, 2):0{s*s // 4 + 1}x}"
    packed[sid] = [s, hex_str]

js = "// Packed 2D QR matrix data for Intermediate College student IDs\n"
js += "const JUNIOR_QR_PACKED = " + json.dumps(packed) + ";\n\n"
js += """export function getJuniorQrSvg(studentId) {
  const entry = JUNIOR_QR_PACKED[studentId] || JUNIOR_QR_PACKED["INT-2026-001"];
  const size = entry[0];
  const hex = entry[1];
  let bin = "";
  for (let i = 0; i < hex.length; i++) {
    bin += parseInt(hex[i], 16).toString(2).padStart(4, "0");
  }
  const bits = bin.slice(bin.length - size * size);
  let path = "";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (bits[r * size + c] === "1") {
        path += `M${c},${r}h1v1h-1z`;
      }
    }
  }
  return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" fill="#ffffff"/><path d="${path}" fill="#000000"/></svg>`;
}
"""

OUT_FILE.write_text(js, encoding="utf-8")
print(f"SUCCESS: Written optimized junior-qr.js ({len(js)} bytes)")
