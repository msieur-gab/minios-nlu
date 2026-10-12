// Inbox: sentences the agent did not understand, waiting for a decision.
// Everything stays on this device (localStorage). Accepted and rejected sentences become
// training lines in the same Markdown format as data/*.md, so they can be retrained here
// or exported and committed to the repo.

const NLUInbox = (() => {
  const KEY = "minios.inbox.v1";
  const MODEL_KEY = "minios.model.v1";
  const norm = t => t.toLowerCase().replace(/[?!.]+$/g, "").split(/\s+/).filter(Boolean).join(" ");
  const NAME_RE = /^[a-z][a-z0-9_]{1,40}$/;

  // "remind me to call mum", [[12, 20, "task"]] → "remind me to [call mum](task)"
  function annotate(text, spans) {
    let out = "", pos = 0;
    for (const [s, e, name] of [...spans].sort((a, b) => a[0] - b[0])) {
      out += text.slice(pos, s) + "[" + text.slice(s, e) + "](" + name + ")";
      pos = e;
    }
    return out + text.slice(pos);
  }

  class Inbox {
    constructor(storage) {
      this.storage = storage || null;
      this.items = [];
      try { this.items = JSON.parse(this.storage.getItem(KEY) || "[]"); } catch { this.items = []; }
    }
    save() { try { this.storage.setItem(KEY, JSON.stringify(this.items)); } catch { /* storage full or blocked: keep in memory */ } }

    // a sentence the agent could not handle; the same sentence is only kept once
    add(text, guess, confidence, reason = "unknown") {
      text = text.trim();
      if (!text) return null;
      const n = norm(text);
      const same = this.items.find(i => norm(i.text) === n);
      if (same) { if (same.status === "new") { same.count = (same.count || 1) + 1; same.at = Date.now(); this.save(); } return same; }
      const item = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text, guess, confidence,
        reason, at: Date.now(), count: 1, status: "new" };
      this.items.unshift(item);
      this.save();
      return item;
    }
    get(id) { return this.items.find(i => i.id === id); }
    waiting() { return this.items.filter(i => i.status === "new"); }
    decided() { return this.items.filter(i => i.status !== "new"); }
    untrained() { return this.decided().filter(i => !i.trained).length; }

    // examples: [{ text, spans }] — the sentence itself, plus any other phrasings
    accept(id, intent, examples, isNew = false) {
      const i = this.get(id);
      if (!i || !NAME_RE.test(intent)) return false;
      Object.assign(i, { status: "accepted", intent, examples, isNew, trained: false, decidedAt: Date.now() });
      this.save();
      return true;
    }
    reject(id) {
      const i = this.get(id);
      if (!i) return false;
      Object.assign(i, { status: "rejected", intent: "out_of_scope", examples: [{ text: i.text, spans: [] }], trained: false, decidedAt: Date.now() });
      this.save();
      return true;
    }
    undo(id) { // back to the inbox
      const i = this.get(id);
      if (!i) return;
      for (const k of ["intent", "examples", "isNew", "trained", "decidedAt"]) delete i[k];
      i.status = "new";
      this.save();
    }
    remove(id) { this.items = this.items.filter(i => i.id !== id); this.save(); }
    markTrained() { for (const i of this.decided()) i.trained = true; this.save(); }

    // training lines in data/*.md format, grouped by intent
    markdown() {
      const by = new Map();
      for (const i of this.decided()) for (const ex of i.examples) {
        if (!by.has(i.intent)) by.set(i.intent, []);
        by.get(i.intent).push(annotate(ex.text, ex.spans));
      }
      let md = "";
      for (const [intent, lines] of by) md += `\n## intent: ${intent}\n` + lines.map(l => "- " + l).join("\n") + "\n";
      return md;
    }
    exportFile() {
      const stamp = new Date().toISOString().slice(0, 10);
      return "<!-- Sentences taught on the device through the inbox, " + stamp + ".\n" +
        "     Copy to data/ and list the file in data/manifest.json to make them part of the shipped model. -->\n" + this.markdown();
    }

    // the model trained on this device, kept until the shipped model changes
    saveModel(model, shippedVersion) {
      try { this.storage.setItem(MODEL_KEY, JSON.stringify({ shipped: shippedVersion, model })); return true; } catch { return false; }
    }
    loadModel(shippedVersion) {
      try {
        const v = JSON.parse(this.storage.getItem(MODEL_KEY) || "null");
        if (!v) return { model: null };
        if (v.shipped !== shippedVersion) { this.storage.removeItem(MODEL_KEY); return { model: null, outdated: true }; }
        return { model: v.model };
      } catch { return { model: null }; }
    }
    clearModel() { try { this.storage.removeItem(MODEL_KEY); } catch { /* nothing stored */ } }
  }

  // slot names used by each intent in a training file, e.g. { set_reminder: ["task"], open_app: ["app"] }
  function slotsByIntent(md) {
    const out = {};
    let intent = null;
    for (const line of md.split("\n")) {
      const h = /^##\s*intent:\s*([a-z_]+)/.exec(line.trim());
      if (h) { intent = h[1]; out[intent] = out[intent] || new Set(); continue; }
      if (intent) for (const m of line.matchAll(/\]\(([a-z_]+)\)/g)) out[intent].add(m[1]);
    }
    return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v].sort()]));
  }

  return { Inbox, annotate, slotsByIntent, NAME_RE };
})();
if (typeof module !== "undefined") module.exports = NLUInbox;
