#!/usr/bin/env python3
"""Decode PAY by square QR codes back to their fields (independent of paybysquare_qr.py).

Usage:  python3 _tools/paybysquare_verify.py image.png [...]      (needs zbarimg from zbar)
        python3 _tools/paybysquare_verify.py --text 0406...         (raw QR text)
Steps: zbar -> base32hex -> header + length -> raw LZMA1 -> CRC32 check -> tab-separated fields.
"""
import binascii, json, lzma, subprocess, sys

FIELDS = ["invoice_id", "payments", "type", "amount", "currency", "due_date", "vs", "ks", "ss",
          "reference", "note", "accounts", "iban", "bic", "standing_order", "direct_debit",
          "beneficiary_name", "beneficiary_street", "beneficiary_city"]

def decode(text):
    alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUV"
    bits = "".join(f"{alphabet.index(c):05b}" for c in text.strip())
    bits = bits[:len(bits) - len(bits) % 8]
    blob = bytes(int(bits[i:i + 8], 2) for i in range(0, len(bits), 8))
    hdr = {"bysquare_type": blob[0] >> 4, "version": blob[0] & 15,
           "document_type": blob[1] >> 4, "reserved": blob[1] & 15}
    length = int.from_bytes(blob[2:4], "little")
    dec = lzma.LZMADecompressor(format=lzma.FORMAT_RAW, filters=[{
        "id": lzma.FILTER_LZMA1, "lc": 3, "lp": 0, "pb": 2, "dict_size": 128 * 1024}])
    total = dec.decompress(blob[4:], max_length=length)
    if len(total) != length:
        raise ValueError(f"length mismatch {len(total)} != {length}")
    crc, raw = total[:4], total[4:]
    if binascii.crc32(raw).to_bytes(4, "little") != crc:
        raise ValueError("CRC32 mismatch")
    vals = raw.decode("utf-8").split("\t")
    out = dict(zip(FIELDS, vals))
    if len(vals) != len(FIELDS):
        out["_extra"] = vals[len(FIELDS):]
    return hdr, out

def main():
    args = sys.argv[1:]
    texts = []
    if args[:1] == ["--text"]:
        texts = [(t, t) for t in args[1:]]
    else:
        for path in args:
            r = subprocess.run(["zbarimg", "-q", "--raw", path], capture_output=True, text=True)
            lines = r.stdout.split()
            if len(lines) != 1:
                print(json.dumps({"file": path, "error": f"zbar found {len(lines)} codes"})); continue
            texts.append((path, lines[0]))
    for src, t in texts:
        hdr, f = decode(t)
        print(json.dumps({"source": src, "header": hdr, "fields": f}, ensure_ascii=False))

if __name__ == "__main__":
    main()
