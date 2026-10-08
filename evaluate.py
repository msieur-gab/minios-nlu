"""Evaluate the exported model on a held-out annotated set (pure Python, runs anywhere).

    python evaluate.py data/test.md models/model.json
"""
import sys
import time
from collections import Counter

from nlu.dataset import load
from nlu.runtime import NLU

THRESHOLD = 0.45


def main(test_path, model_path, quiet=False, examples=None):
    nlu = NLU(model_path)
    ex = examples if examples is not None else load(test_path)
    ok = 0
    tp = fp = fn = 0
    times, errors = [], []
    per = Counter()
    per_ok = Counter()
    for e in ex:
        t0 = time.perf_counter()
        r = nlu.parse(e["text"])
        times.append((time.perf_counter() - t0) * 1000)
        pred = r["intent"] if r["confidence"] >= THRESHOLD else "out_of_scope"
        per[e["intent"]] += 1
        if pred == e["intent"]:
            ok += 1
            per_ok[e["intent"]] += 1
        else:
            errors.append("INTENT  %-60s want=%s got=%s (%.2f)" % (e["text"], e["intent"], r["intent"], r["confidence"]))
        gold = {(n, e["text"][s:t]) for s, t, n in e["spans"]}
        got = set(r["slots"].items()) if e["intent"] not in ("out_of_scope",) else set()
        tp += len(gold & got)
        fp += len(got - gold)
        fn += len(gold - got)
        if gold != got:
            errors.append("SLOTS   %-60s want=%s got=%s" % (e["text"], sorted(gold), sorted(got)))
    prec = tp / (tp + fp) if tp + fp else 0
    rec = tp / (tp + fn) if tp + fn else 0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0
    times.sort()
    if quiet:
        return ok, len(ex), tp, fp, fn
    print("intent accuracy: %d/%d = %.1f%%" % (ok, len(ex), 100 * ok / len(ex)))
    for k in per:
        print("   %-14s %d/%d" % (k, per_ok[k], per[k]))
    print("slot exact-match P=%.2f R=%.2f F1=%.2f" % (prec, rec, f1))
    print("latency median=%.2fms p95=%.2fms" % (times[len(times) // 2], times[int(len(times) * .95)]))
    print("\n".join(errors))


if __name__ == "__main__":
    main(*(sys.argv[1:3] if len(sys.argv) > 2 else ("data/test.md", "models/model.json")))
