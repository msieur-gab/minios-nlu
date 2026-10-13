"""Bundle model + runtime + agent + skills into the offline PWA in docs/. Standard library only;
the held-out numbers shown in the page come from the model (written by node train.js)."""
import hashlib
import json
import os
import shutil

model = json.load(open("models/model.json"))
ev = model["stats"]["eval"]
acc, f1, n = ev["accuracy"], ev["slot_f1"], ev["n"]

page = open("web/template.html").read()
page = page.replace("/*MODEL*/", open("models/model.json").read().replace("</", "<\\/"))
page = page.replace("/*RUNTIME*/", open("web/runtime.js").read())
page = page.replace("/*ENTITIES*/", open("web/entities.js").read())
page = page.replace("/*SERVICES*/", open("web/services.js").read())
page = page.replace("/*SKILLS*/", open("web/skills.json").read().replace("</", "<\\/"))
# each skill's script, wrapped so it can use module.exports exactly as in Node
skills_rt = json.load(open("web/skills.json"))["skills"]
code = "const SKILL_CODE = {};\n" + "".join(
    "SKILL_CODE[%s] = (() => { const module = { exports: {} };\n%s\nreturn module.exports; })();\n"
    % (json.dumps(name), open(sk["dir"] + "/skill.js").read()) for name, sk in skills_rt.items() if sk["code"])
page = page.replace("/*SKILL_CODE*/", code.replace("</", "<\\/"))
# training data + trainer for on-device retraining (Web Worker)
manifest = json.load(open("data/manifest.json"))
data = {"train": "\n".join(open(f, encoding="utf-8").read() for f in manifest["train"]),
        "test": open(manifest["test"], encoding="utf-8").read()}
worker_src = open("web/runtime.js").read() + "\n" + open("web/trainer.js").read() + """
self.onmessage = e => {
  // sentences taught in the inbox win over an identical sentence in the shipped data
  const norm0 = t => t.toLowerCase().replace(/[?!.]+$/, "").split(/\\s+/).filter(Boolean).join(" ");
  const taught = NLUTrainer.parseDataset(e.data.learned || "");
  const taughtSet = new Set(taught.map(x => norm0(x.text)));
  const ex = NLUTrainer.parseDataset(e.data.train).filter(x => !taughtSet.has(norm0(x.text))).concat(taught);
  const model = NLUTrainer.train(ex, { log: m => self.postMessage({ log: m }) });
  // same rule as the build: only test sentences that are not also training sentences
  const norm = t => t.toLowerCase().replace(/\\?/g, "").split(/\\s+/).filter(Boolean).join(" ");
  const seen = new Set(ex.map(x => norm(x.text)));
  const test = NLUTrainer.parseDataset(e.data.test).filter(x => !seen.has(norm(x.text)));
  const ev = NLUTrainer.evaluate(new NLURuntime.NLU(model), test);
  self.postMessage({ model, ev: { accuracy: ev.accuracy, slotF1: ev.slotF1, n: ev.n } });
};
"""
page = page.replace("/*DATA*/", json.dumps(data).replace("</", "<\\/"))
page = page.replace("/*WORKER_SRC*/", json.dumps(worker_src).replace("</", "<\\/"))
page = page.replace("/*AGENT*/", open("web/agent.js").read())
page = page.replace("/*INBOX*/", open("web/inbox.js").read())
page = page.replace("/*EVAL*/", json.dumps({"accuracy": acc, "slot_f1": f1, "n": n}))
print("page %.0f KB  (accuracy %s%%, slot F1 %s, n=%s)" % (len(page) / 1024, acc, f1, n))

# PWA build: full document with manifest, icons and service worker
version = hashlib.sha1((page + open("pwa/manifest.webmanifest").read() + open("pwa/sw.template.js").read()).encode()).hexdigest()[:10]
head = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#f7f7f4">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="MiniOS">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<style>
html { box-sizing: border-box; height: 100%; padding: env(safe-area-inset-top, 0px) 0 env(safe-area-inset-bottom, 0px); color-scheme: light; background: #f7f7f4; }
*, *::before, *::after { box-sizing: inherit; }
body { margin: 0; font: 14px/1.4 system-ui, -apple-system, sans-serif; -webkit-text-size-adjust: 100%; }
[hidden] { display: none !important; }
</style>
</head>
<body>
"""
sw_reg = """<script>
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" })
      .then(reg => reg.update()).catch(() => {});
  });
  // A new version took over: reload once so its code runs too
  let reloaded = false;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController && !reloaded) { reloaded = true; location.reload(); }
  });
}
</script>
"""
os.makedirs("docs", exist_ok=True)
for f in ["manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable.png", "apple-touch-icon.png"]:
    shutil.copy("pwa/" + f, "docs/" + f)
open("docs/index.html", "w").write(head + page + sw_reg + "</body>\n</html>\n")
open("docs/sw.js", "w").write(open("pwa/sw.template.js").read().replace("/*VERSION*/", version))
open("docs/.nojekyll", "w").write("")
print("docs/ (PWA) built, cache version", version)
