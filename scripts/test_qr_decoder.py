import qrcode

sid = "2451-23-737-001"
qr = qrcode.QRCode(box_size=1, border=2)
qr.add_data(sid)
qr.make(fit=True)
m = qr.get_matrix()
s = len(m)
orig_bits = "".join("1" if m[r][c] else "0" for r in range(s) for c in range(s))
hex_str = f"{int(orig_bits, 2):0{s*s // 4 + 1}x}"

# Decode test
bin_str = "".join(f"{int(h, 16):04b}" for h in hex_str)
decoded_bits = bin_str[-s*s:]

assert orig_bits == decoded_bits, "Mismatch!"
print("MATCH 100%! Tested successfully.")
