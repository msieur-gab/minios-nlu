"""Dependency-free inference from models/model.json (Python reference; web/runtime.js mirrors it)."""
import base64
import json
import math
from array import array

from .dataset import spans_from_labels
from .features import intent_features, softmax, token_features, tokenize


def _f32(s):
    a = array("f")
    a.frombytes(base64.b64decode(s))
    return a


class NLU:
    def __init__(self, path):
        with open(path) as fh:
            m = json.load(fh)
        self.intents = m["intents"]
        self.vocab = {f: i for i, f in enumerate(m["vocab"])}
        self.idf = _f32(m["idf"])
        self.coef = _f32(m["coef"])
        self.intercept = m["intercept"]
        self.labels = m["labels"]
        self.state = m["state"]
        self.trans = m["trans"]
        self.nf = len(m["vocab"])

    def classify(self, text):
        counts = {}
        for f in intent_features(text):
            j = self.vocab.get(f)
            if j is not None:
                counts[j] = counts.get(j, 0) + 1
        vec = {j: (1 + math.log(c)) * self.idf[j] for j, c in counts.items()}
        norm = math.sqrt(sum(v * v for v in vec.values())) or 1.0
        scores = []
        for k in range(len(self.intents)):
            base = k * self.nf
            s = self.intercept[k]
            for j, v in vec.items():
                s += self.coef[base + j] * v / norm
            scores.append(s)
        p = softmax(scores)
        order = sorted(range(len(p)), key=lambda i: -p[i])
        return [(self.intents[i], p[i]) for i in order]

    def tag(self, text, toks):
        L = len(self.labels)
        em = []
        for feats in token_features(text, toks):
            row = [0.0] * L
            for f in feats:
                w = self.state.get(f)
                if w:
                    for q in range(0, len(w), 2):
                        row[w[q]] += w[q + 1]
            em.append(row)
        if not em:
            return []
        score, back = em[0][:], []
        for t in range(1, len(em)):
            new, bp = [0.0] * L, [0] * L
            for b in range(L):
                best, arg = -1e18, 0
                for a in range(L):
                    v = score[a] + self.trans[a][b]
                    if v > best:
                        best, arg = v, a
                new[b], bp[b] = best + em[t][b], arg
            score = new
            back.append(bp)
        last = max(range(L), key=lambda i: score[i])
        path = [last]
        for bp in reversed(back):
            path.append(bp[path[-1]])
        return [self.labels[i] for i in reversed(path)]

    def parse(self, text):
        ranked = self.classify(text)
        toks = tokenize(text)
        labels = self.tag(text, toks)
        slots = {}
        for s, e, name, value in spans_from_labels(text, toks, labels):
            slots.setdefault(name, value)
        return {"intent": ranked[0][0], "confidence": ranked[0][1], "ranking": ranked[:3],
                "slots": slots, "_labels": labels}
