# We can store the 25x25 boolean matrix as bit-packed strings or run-length encoding!
# 25x25 = 625 bits = only ~78 bytes per QR code!
# 123 * 78 bytes = only 9.5 KB total (instead of 393 KB)!
import qrcode
import json

bitstrings = {}
for i in range(1, 124):
    sid = f"2451-23-737-{i:03d}"
    qr = qrcode.QRCode(box_size=1, border=2)
    qr.add_data(sid)
    qr.make(fit=True)
    m = qr.get_matrix()
    s = len(m)
    # Pack row by row
    bits = "".join("1" if m[r][c] else "0" for r in range(s) for c in range(s))
    # Convert bits to hex
    hex_str = f"{int(bits, 2):0{s*s // 4 + 1}x}"
    bitstrings[sid] = (s, hex_str)

print("Sample bitstring for 001:", bitstrings["2451-23-737-001"][1][:40])
print("Packed data size in KB:", len(json.dumps(bitstrings)) / 1024)
