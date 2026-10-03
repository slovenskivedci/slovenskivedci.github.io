#!/usr/bin/env python3
"""Generate the PAY by square QR codes for /podporte/ (not published: folders starting with "_" are skipped by Jekyll).

Usage:  pip install segno
        python3 _tools/paybysquare_qr.py SK8511000000002937308257 [--bic XXXXSKBX]
Writes podporte/paybysquare-<amount>.svg for each preset amount (5, 10, 20, 50, 100 EUR)
and podporte/paybysquare.svg without an amount (button "vlastná suma": the payer types it).
Due date is left empty (= pay now), so the codes never go stale.

Encoding follows the PAY by square spec (as in the `pay-by-square` PyPI package and the
`bysquare` npm package): tab-separated fields, CRC32 prefix, raw LZMA1, base32hex.
Header version 1.1.0 (the first version with the beneficiary name field). Like the `bysquare`
npm package, text fields are stripped of diacritics by default, because some banking apps
garble them. Check the result with  python3 _tools/paybysquare_verify.py podporte/paybysquare*.svg
"""
import argparse, binascii, lzma, pathlib, re, sys, unicodedata

VERSIONS = {"1.0.0": 0, "1.1.0": 1, "1.2.0": 2}

def deburr(s):
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))

def paybysquare(iban, bic="", name="Peter Richtárik", note="Dar slovenskivedci.sk",
                amount="", vs="7272", version="1.1.0", keep_diacritics=False):
    if not keep_diacritics:
        name, note = deburr(name), deburr(note)
    data = "\t".join([
        "",          # invoice id
        "1",         # number of payments
        "1",         # payment type: payment order
        amount,      # amount ("" = payer enters it)
        "EUR",
        "",          # due date ("" = pay now)
        vs, "", "",  # VS, KS, SS
        "",          # SEPA reference
        note,        # message for recipient
        "1",         # number of bank accounts
        iban, bic,
        "0", "0",    # no standing order / direct debit extension
        name, "", "",  # beneficiary name, street, city (version >= 1.1.0)
    ])
    raw = data.encode("utf-8")
    total = binascii.crc32(raw).to_bytes(4, "little") + raw
    comp = lzma.compress(total, format=lzma.FORMAT_RAW, filters=[{
        "id": lzma.FILTER_LZMA1, "lc": 3, "lp": 0, "pb": 2, "dict_size": 128 * 1024}])
    # header nibbles: by square type 0 (PAY), version, document type 0, reserved 0
    blob = bytes([VERSIONS[version], 0x00]) + len(total).to_bytes(2, "little") + comp
    bits = "".join(f"{b:08b}" for b in blob)
    bits += "0" * (-len(bits) % 5)
    alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUV"
    return "".join(alphabet[int(bits[i:i + 5], 2)] for i in range(0, len(bits), 5))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("iban")
    ap.add_argument("--bic", default="")
    ap.add_argument("--amounts", default="5,10,20,50,100", help="preset amounts in EUR, comma separated")
    ap.add_argument("--vs", default="7272", help="variable symbol")
    ap.add_argument("--note", default="Dar slovenskivedci.sk")
    ap.add_argument("--name", default="Peter Richtárik")
    ap.add_argument("--version", default="1.1.0", choices=sorted(VERSIONS))
    ap.add_argument("--keep-diacritics", action="store_true")
    ap.add_argument("--outdir", default=str(pathlib.Path(__file__).resolve().parent.parent / "podporte"))
    a = ap.parse_args()
    iban = re.sub(r"\s+", "", a.iban).upper()
    if not re.fullmatch(r"SK\d{22}", iban):
        sys.exit(f"Not a Slovak IBAN: {iban}")
    import segno
    amounts = [""] + [x.strip() for x in a.amounts.split(",") if x.strip()]
    for amt in amounts:
        if amt and not re.fullmatch(r"\d+(\.\d{1,2})?", amt):
            sys.exit(f"Bad amount: {amt}")
        code = paybysquare(iban, a.bic.upper(), a.name, a.note, amt, a.vs, a.version, a.keep_diacritics)
        qr = segno.make(code, error="m", micro=False)
        out = pathlib.Path(a.outdir) / (f"paybysquare-{amt}.svg" if amt else "paybysquare.svg")
        # omitsize: viewBox instead of fixed width/height, so <img width="..."> scales it cleanly
        qr.save(str(out), kind="svg", scale=4, border=2, dark="#222", omitsize=True)
        print(f"{out.name}\tQR version {qr.version}\t{code}")

if __name__ == "__main__":
    main()
