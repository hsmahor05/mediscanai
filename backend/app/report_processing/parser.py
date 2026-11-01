"""Parse text lines from a lab report into candidate test rows."""
from __future__ import annotations
import re
from dataclasses import dataclass
from .catalog import CATALOG

HOUR = r"(?:hours|hour|hrs|hr|h)"


def _alias_regex(alias: str) -> str:
    alias = alias.replace("{h}", "\x00")
    parts = [re.escape(p) if p != "\x00" else HOUR for p in re.split(r"[\s,]+", alias) if p]
    return r"[\s,\-]+".join(parts)


def _build_alias_table():
    rows = []
    for key, t in CATALOG.items():
        for a in t.aliases:
            rows.append((a, key))
    rows.sort(key=lambda r: -len(r[0]))
    return [(re.compile(r"^\s*(?:\d{1,2}[.)]\s+)?(" + _alias_regex(a) + r")(?![A-Za-z])", re.I), k) for a, k in rows]


ALIASES = _build_alias_table()
NUM = r"\d+(?:\.\d+)?"
VALUE_RE = re.compile(rf"^[\s:|]*(?P<op><=|>=|<|>|≤|≥)?\s*(?P<val>{NUM})(?![\d.]*[A-Za-z]{{3,}})")
RANGE_RE = re.compile(rf"(?P<lo>{NUM})\s*(?:-|–|—|to)\s*(?P<hi>{NUM})")
LT_RE = re.compile(rf"(?:<=|<|≤|up to|less than|upto)\s*(?P<hi>{NUM})", re.I)
GT_RE = re.compile(rf"(?:>=|>|≥|greater than|more than)\s*(?P<lo>{NUM})", re.I)

UNIT_NORMAL = {
    "µ": "u", "μ": "u", "³": "3", "⁹": "9", "⁶": "6", "¹²": "12",
}
KNOWN_UNITS = {
    "g/dl", "mg/dl", "mmol/l", "umol/l", "u/l", "iu/l", "ng/ml", "pg/ml", "miu/l", "uiu/ml", "miu/ml", "%", "fl", "pg", "meq/l", "nmol/l", "mg/l", "g/l",
    "/cumm", "cells/cumm", "/mm3", "cells/mm3", "/ul", "cells/ul", "lakhs/cumm", "lakh/cumm", "lakhs/ul", "10^3/ul", "10^6/ul", "10^9/l", "10^12/l",
    "k/ul", "m/ul", "thou/ul", "thou/mm3", "million/cumm", "mill/cumm", "million/ul",
}


def normalize_unit(u: str | None) -> str | None:
    if not u:
        return None
    s = u.strip().lower()
    for a, b in UNIT_NORMAL.items():
        s = s.replace(a, b)
    s = re.sub(r"\s+", "", s)
    s = s.replace("x10", "10").replace("×10", "10").replace("10e", "10^")
    s = re.sub(r"^10(\d+)/", r"10^\1/", s)
    s = s.replace("cu.mm", "cumm").replace("cu/mm", "cumm").replace("/cu.mm", "/cumm").replace("lakh/cu", "lakh/cumm")
    s = s.replace("thousand/ul", "thou/ul").replace("thousand/mm3", "thou/mm3")
    return s


@dataclass
class ParsedRow:
    key: str
    raw_name: str
    value: float
    operator: str | None
    unit_raw: str | None
    unit: str | None
    ref_low: float | None
    ref_high: float | None
    line: str


def _find_unit(rest: str) -> tuple[str | None, str]:
    rest = rest.lstrip(" :|*")
    m = re.match(r"([A-Za-zµμ%/^×x0-9³⁹⁶.\-]+(?:\s*/\s*[A-Za-zµμ0-9^³.]+)?)", rest)
    if not m:
        return None, rest
    tok = m.group(1)
    # try progressively shorter combos: "10^3/uL", "x10^3 / uL", "/cumm"
    cand = re.match(r"((?:x|×)?\s*10\s*[\^]?\s*[0-9³⁹⁶]+\s*/\s*[A-Za-zµμ]+|[A-Za-zµμ%]*\s*/\s*[A-Za-zµμ0-9]+|%|[A-Za-z]{1,4})", rest, re.I)
    if cand:
        tok = cand.group(1)
    n = normalize_unit(tok)
    if n in KNOWN_UNITS:
        return tok.strip(), rest[cand.end() if cand else m.end():]
    return None, rest


def parse_line(line: str) -> ParsedRow | None:
    for rx, key in ALIASES:
        m = rx.match(line)
        if not m:
            continue
        rest = line[m.end():]
        rest = re.sub(r"^\s*\([^)]*\)", "", rest)          # drop e.g. "(Hb)" / "(ogtt)"
        rest = re.sub(r"^\s*(?:serum|plasma|blood|method.*?:)\b", "", rest, flags=re.I)
        v = VALUE_RE.match(rest)
        if not v:
            return None
        try:
            value = float(v.group("val"))
        except ValueError:
            return None
        op = v.group("op")
        op = {"≤": "<=", "≥": ">="}.get(op, op)
        after = rest[v.end():]
        unit_raw, after2 = _find_unit(after)
        low = high = None
        rm = RANGE_RE.search(after2)
        if rm:
            low, high = float(rm.group("lo")), float(rm.group("hi"))
            if low > high:
                low = high = None
        else:
            lt, gt = LT_RE.search(after2), GT_RE.search(after2)
            if lt: high = float(lt.group("hi"))
            elif gt: low = float(gt.group("lo"))
        return ParsedRow(key=key, raw_name=m.group(1).strip(), value=value, operator=op, unit_raw=unit_raw,
                         unit=normalize_unit(unit_raw), ref_low=low, ref_high=high, line=line.strip())
    return None


def parse_text(text: str) -> tuple[list[ParsedRow], int]:
    rows, seen, unmatched = [], set(), 0
    for line in text.splitlines():
        if not line.strip():
            continue
        r = parse_line(line)
        if r is None:
            unmatched += 1
            continue
        rows.append(r)
    return rows, unmatched
