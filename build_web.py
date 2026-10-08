"""Bundle model + runtime + agent into one self-contained page: web/index.html"""
import io
import json
import re
from contextlib import redirect_stdout

import evaluate

from nlu.dataset import load
from train import TRAIN_FILES

# Report only on test sentences that do not appear in any training file
norm = lambda t: " ".join(t.lower().replace("?", "").split())
seen = {norm(e["text"]) for p in TRAIN_FILES for e in load(p)}
test = [e for e in load("data/test.md") if norm(e["text"]) not in seen]
buf = io.StringIO()
with redirect_stdout(buf):
    evaluate.main(None, "models/model.json", examples=test)
out = buf.getvalue()
acc = re.search(r"= ([\d.]+)%", out).group(1)
n = re.search(r"intent accuracy: \d+/(\d+)", out).group(1)
f1 = re.search(r"F1=([\d.]+)", out).group(1)

page = open("web/template.html").read()
page = page.replace("/*MODEL*/", open("models/model.json").read().replace("</", "<\\/"))
page = page.replace("/*RUNTIME*/", open("web/runtime.js").read())
page = page.replace("/*AGENT*/", open("web/agent.js").read())
page = page.replace("/*EVAL*/", json.dumps({"accuracy": acc, "slot_f1": f1, "n": int(n)}))
open("web/index.html", "w").write(page)
print("web/index.html %.0f KB  (accuracy %s%%, slot F1 %s, n=%s)" % (len(page) / 1024, acc, f1, n))

# PWA build: full document with manifest, icons and service worker
import hashlib
version = hashlib.sha1((page + open("pwa/manifest.webmanifest").read() + open("pwa/sw.template.js").read()).encode()).hexdigest()[:10]
head = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#2e5bd6">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="MiniOS">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<style>
html { box-sizing: border-box; height: 100%; padding: env(safe-area-inset-top, 0px) 0 env(safe-area-inset-bottom, 0px); color-scheme: light; }
*, *::before, *::after { box-sizing: inherit; }
body { margin: 0; font: 14px/1.4 system-ui, -apple-system, sans-serif; -webkit-text-size-adjust: 100%; }
[hidden] { display: none !important; }
</style>
</head>
<body>
"""
sw_reg = """<script>
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => {}); });
}
</script>
"""
import os
import shutil
os.makedirs("docs", exist_ok=True)
for f in ["manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable.png", "apple-touch-icon.png"]:
    shutil.copy("pwa/" + f, "docs/" + f)
open("docs/index.html", "w").write(head + page + sw_reg + "</body>\n</html>\n")
open("docs/sw.js", "w").write(open("pwa/sw.template.js").read().replace("/*VERSION*/", version))
open("docs/.nojekyll", "w").write("")
print("docs/ (PWA) built, cache version", version)
