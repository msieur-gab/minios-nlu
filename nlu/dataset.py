"""Parse the annotated Markdown dataset format.

## intent: create_folder
- make a folder called [reports](name) in [documents](location)
"""
import re

from .features import tokenize

SPAN_RE = re.compile(r"\[([^\]]+)\]\(([a-z_]+)\)")
HEADER_RE = re.compile(r"^##\s*intent:\s*([a-z_]+)\s*$")


def parse_line(line):
    text, spans, pos = "", [], 0
    for m in SPAN_RE.finditer(line):
        text += line[pos:m.start()]
        start = len(text)
        text += m.group(1)
        spans.append((start, len(text), m.group(2)))
        pos = m.end()
    text += line[pos:]
    return text, spans


def bio(text, spans):
    toks = tokenize(text)
    labels = []
    for _, s, e in toks:
        lab = "O"
        for ss, se, name in spans:
            if s >= ss and e <= se:
                lab = ("B-" if s == ss else "I-") + name
                break
        labels.append(lab)
    return toks, labels


def load(path):
    examples, intent = [], None
    with open(path, encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            m = HEADER_RE.match(line)
            if m:
                intent = m.group(1)
                continue
            if line.startswith("- ") and intent:
                text, spans = parse_line(line[2:].strip())
                examples.append({"intent": intent, "text": text, "spans": spans})
    return examples


def spans_from_labels(text, toks, labels):
    out, cur = [], None
    for (tok, s, e), lab in zip(toks, labels):
        if lab.startswith("B-") or (lab.startswith("I-") and (cur is None or cur[2] != lab[2:])):
            if cur:
                out.append(cur)
            cur = [s, e, lab[2:]]
        elif lab.startswith("I-") and cur:
            cur[1] = e
        else:
            if cur:
                out.append(cur)
            cur = None
    if cur:
        out.append(cur)
    return [(s, e, n, text[s:e]) for s, e, n in out]
