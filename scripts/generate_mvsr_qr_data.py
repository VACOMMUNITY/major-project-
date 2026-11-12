import qrcode
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
OUT_FILE = BASE_DIR / "ui" / "assets" / "mvsr-qr.js"

qr_map = {}
for i in range(1, 124):
    sid = f"2451-23-737-{i:03d}"
    qr = qrcode.QRCode(box_size=1, border=2)
    qr.add_data(sid)
    qr.make(fit=True)
    matrix = qr.get_matrix()
    size = len(matrix)
    rects = []
    for r in range(size):
        for c in range(size):
            if matrix[r][c]:
                rects.append(f"M{c},{r}h1v1h-1z")
    path_d = "".join(rects)
    svg = f'<svg viewBox="0 0 {size} {size}" xmlns="http://www.w3.org/2000/svg"><rect width="{size}" height="{size}" fill="#ffffff"/><path d="{path_d}" fill="#000000"/></svg>'
    qr_map[sid] = svg

js_content = "// Pre-generated authentic 2D matrix QR codes for MVSR students\n"
js_content += "export const MVSR_QR_MAP = " + json.dumps(qr_map, indent=2) + ";\n\n"
js_content += """export function getMvsrQrSvg(studentId) {
  if (MVSR_QR_MAP[studentId]) return MVSR_QR_MAP[studentId];
  return MVSR_QR_MAP["2451-23-737-001"];
}
"""

OUT_FILE.write_text(js_content, encoding="utf-8")
print(f"SUCCESS: Generated {len(qr_map)} real QR code SVGs into {OUT_FILE}")
