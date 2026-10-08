"""Train intent classifier (TF-IDF + logistic regression) and slot tagger (CRF),
then export everything the runtime needs to a single JSON file.

    python train.py data/train.md models/model.json
"""
import base64
import json
import sys
import time
from array import array

import sklearn_crfsuite
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

from nlu.dataset import bio, load
from nlu.features import intent_features, token_features


def f32(values):
    return base64.b64encode(array("f", values).tobytes()).decode()


def main(train_paths, out_path, verify=True):
    if isinstance(train_paths, str):
        train_paths = [train_paths]
    ex = load_many(train_paths)
    return fit_export(ex, out_path, verify)


def load_many(paths):
    ex = []
    for p in paths:
        ex += load(p)
    return ex


def fit_export(ex, out_path, verify=True):
    texts = [e["text"] for e in ex]
    y = [e["intent"] for e in ex]
    t0 = time.time()

    vec = TfidfVectorizer(analyzer=intent_features, sublinear_tf=True, min_df=2)
    X = vec.fit_transform(texts)
    clf = LogisticRegression(C=8.0, max_iter=3000, class_weight="balanced")
    clf.fit(X, y)

    X_seq, y_seq = [], []
    for e in ex:
        toks, labels = bio(e["text"], e["spans"])
        X_seq.append([{f: 1.0 for f in fs} for fs in token_features(e["text"], toks)])
        y_seq.append(labels)
    crf = sklearn_crfsuite.CRF(algorithm="lbfgs", c1=0.05, c2=0.01,
                               max_iterations=200, all_possible_transitions=True)
    crf.fit(X_seq, y_seq)
    train_s = time.time() - t0

    vocab = sorted(vec.vocabulary_, key=vec.vocabulary_.get)
    labels = list(crf.classes_)
    lab_idx = {l: i for i, l in enumerate(labels)}
    state = {}
    for (attr, lab), w in crf.state_features_.items():
        if abs(w) < 1e-4:
            continue
        state.setdefault(attr, []).extend([lab_idx[lab], round(w, 4)])
    trans = [[0.0] * len(labels) for _ in labels]
    for (a, b), w in crf.transition_features_.items():
        trans[lab_idx[a]][lab_idx[b]] = round(w, 4)

    model = {
        "version": time.strftime("%Y-%m-%d %H:%M"),
        "intents": list(clf.classes_),
        "vocab": vocab,
        "idf": f32(vec.idf_),
        "coef": f32(clf.coef_.ravel()),
        "intercept": [float(b) for b in clf.intercept_],
        "labels": labels,
        "state": state,
        "trans": trans,
        "stats": {"examples": len(ex), "features": len(vocab),
                  "crf_attrs": len(state), "train_seconds": round(train_s, 2)},
    }
    with open(out_path, "w") as fh:
        json.dump(model, fh, separators=(",", ":"))
    size = len(json.dumps(model, separators=(",", ":")))
    if not verify:
        return model
    print("examples=%d intents=%d features=%d crf_attrs=%d labels=%d train=%.2fs size=%.0fKB"
          % (len(ex), len(clf.classes_), len(vocab), len(state), len(labels), train_s, size / 1024))

    # Parity check: pure-Python runtime must reproduce sklearn's predictions
    from nlu.runtime import NLU
    nlu = NLU(out_path)
    ref_int = clf.predict(X)
    ref_slots = crf.predict(X_seq)
    bad_i = bad_s = 0
    maxdiff = 0.0
    probs = clf.predict_proba(X)
    for k, e in enumerate(ex):
        r = nlu.parse(e["text"])
        bad_i += r["intent"] != ref_int[k]
        maxdiff = max(maxdiff, abs(r["confidence"] - probs[k].max()))
        bad_s += r["_labels"] != ref_slots[k]
    print("parity: intent mismatches=%d slot mismatches=%d max prob diff=%.2e" % (bad_i, bad_s, maxdiff))


TRAIN_FILES = ["data/train.md", "data/synth_v1.md", "data/synth_batch_A.md",
               "data/synth_batch_A1.md", "data/synth_batch_B.md", "data/synth_batch_C.md"]

if __name__ == "__main__":
    main(TRAIN_FILES, "models/model.json")
