#!/usr/bin/env python3
"""Generate the PAY by square QR code for /podporte/ (not published: folders starting with "_" are skipped by Jekyll).

Usage:  pip install segno
        python3 _tools/paybysquare_qr.py SK1234567890123456789012 [--bic XXXXSKBX]
Writes podporte/paybysquare.svg. Amount and due date are left empty, so the payer
enters the amount in the banking app and the code never goes stale.

Encoding follows the PAY by square spec (as in the `pay-by-square` PyPI package and the
`bysquare` npm package): tab-separated fields, CRC32 prefix, raw LZMA1, base32hex.
"""
import argparse, binascii, lzma, pathlib, re, sys

def paybysquare(iban, bic="", name="Peter Richtárik", note="Dar slovenskivedci", amount=""):
    data = "\t".join([
        "",          # invoice id
        "1",         # number of payments
        "1",         # payment type: payment order
        amount,      # amount ("" = payer enters it)
        "EUR",
        "",          # due date ("" = today)
        "", "", "",  # VS, KS, SS
        "",          # SEPA reference
        note,        # message for recipient
        "1",         # number of bank accounts
        iban, bic,
        "0", "0",    # no standing order / direct debit extension
        name, "", "",
    ])
    raw = data.encode("utf-8")
    total = binascii.crc32(raw).to_bytes(4, "little") + raw
    comp = lzma.compress(total, format=lzma.FORMAT_RAW, filters=[{
        "id": lzma.FILTER_LZMA1, "lc": 3, "lp": 0, "pb": 2, "dict_size": 128 * 1024}])
    blob = b"\x00\x00" + len(total).to_bytes(2, "little") + comp
    bits = "".join(f"{b:08b}" for b in blob)
    bits += "0" * (-len(bits) % 5)
    alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUV"
    return "".join(alphabet[int(bits[i:i + 5], 2)] for i in range(0, len(bits), 5))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("iban")
    ap.add_argument("--bic", default="")
    ap.add_argument("--png", default="", help="optional PNG copy")
    ap.add_argument("--out", default=str(pathlib.Path(__file__).resolve().parent.parent / "podporte" / "paybysquare.svg"))
    a = ap.parse_args()
    iban = re.sub(r"\s+", "", a.iban).upper()
    if not re.fullmatch(r"SK\d{22}", iban):
        sys.exit(f"Not a Slovak IBAN: {iban}")
    code = paybysquare(iban, a.bic.upper())
    import segno
    qr = segno.make(code, error="m", micro=False)
    # omitsize: viewBox instead of fixed width/height, so <img width="128"> scales it cleanly
    qr.save(a.out, kind="svg", scale=4, border=2, dark="#222", omitsize=True)
    if a.png:
        qr.save(a.png, kind="png", scale=8, border=4, dark="#222")
        print("wrote", a.png)
    print(code)
    print("wrote", a.out)

if __name__ == "__main__":
    main()
