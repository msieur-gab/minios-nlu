// Inbox: sentences the agent did not understand, waiting for a decision.
// Everything stays on this device (localStorage). Accepted and rejected sentences become
// training lines in the same Markdown format as data/*.md, so they can be retrained here
// or exported and committed to the repo. A skill created here gets its answer here too, and
// is exported as a draft skills/<name>/skill.md (examples, slots, reply) ready to commit.

const NLUInbox = (() => {
  const ENT = () => (typeof NLUEntities !== "undefined" ? NLUEntities : require("./entities.js"));
  // what a marked value is: a time or date when the date parser reads one there ("wake me up at
  // [8](time)"), a duration ("for [10 minutes](length)"), otherwise words
  function kindOf(text, s, e) {
    const hit = ENT().parse(text, { now: new Date() }).find(x => x.start < e && s < x.end);
    return !hit ? "text" : hit.type === "duration" ? "duration" : "datetime";
  }
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

    // examples: [{ text, spans }] — the sentence itself, plus any other phrasings;
    // answer: for a new skill, what the agent says ({value} fills in a marked value)
    accept(id, intent, examples, isNew = false, answer = "") {
      const i = this.get(id);
      if (!i || !NAME_RE.test(intent)) return false;
      Object.assign(i, { status: "accepted", intent, examples, isNew, answer: isNew ? answer.trim() : "", trained: false, decidedAt: Date.now() });
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
      for (const k of ["intent", "examples", "isNew", "answer", "trained", "decidedAt"]) delete i[k];
      i.status = "new";
      this.save();
    }
    remove(id) { this.items = this.items.filter(i => i.id !== id); this.save(); }
    markTrained() { for (const i of this.decided()) i.trained = true; this.save(); }

    // skills created here: { name: { answer, slots: [marked names], types: { name: text|datetime|duration },
    // needed: [names the answer uses] }. A value is a time if the date parser reads one in any of its marks.
    newSkills() {
      const out = {};
      for (const i of this.decided()) if (i.isNew) out[i.intent] = { answer: i.answer || "", slots: [], types: {}, needed: [] };
      for (const i of this.decided()) if (out[i.intent]) for (const ex of i.examples) for (const [st, en, n] of ex.spans) {
        const sk = out[i.intent], k = kindOf(ex.text, st, en);
        if (!sk.slots.includes(n)) { sk.slots.push(n); sk.types[n] = k; }
        else if (k !== "text") sk.types[n] = k;
      }
      for (const s of Object.values(out)) s.needed = s.slots.filter(n => s.answer.includes("{" + n + "}"));
      return out;
    }
    // training lines in data/*.md format, grouped by intent (only = a filter on intents)
    markdown(only = () => true) {
      const by = new Map();
      for (const i of this.decided()) if (only(i.intent)) for (const ex of i.examples) {
        if (!by.has(i.intent)) by.set(i.intent, []);
        by.get(i.intent).push(annotate(ex.text, ex.spans));
      }
      let md = "";
      for (const [intent, lines] of by) md += `\n## intent: ${intent}\n` + lines.map(l => "- " + l).join("\n") + "\n";
      return md;
    }
    // a new skill as a skill.md that passes the compile checks: its examples, each marked value
    // as a text slot, and its answer. Types, questions and a help line are refined in the file.
    draftSkill(name, stamp) {
      const s = this.newSkills()[name];
      const lines = this.markdown(i => i === name).split("\n").filter(l => l.startsWith("- "));
      return ["---", "skill: " + name, "action: say", "---", "# " + name.replace(/_/g, " "), "",
        "Taught on the phone through the inbox, " + stamp + ". To do more than answer, add a skill.js;",
        "to show it in help, add a help: line above.", "",
        ...(s.slots.length ? ["## Slots", ...s.slots.map(n => "- " + n + ": " + s.types[n] + (s.needed.includes(n) ? ", required, ask: ask_" + n : "")), ""] : []),
        "## Examples", ...lines, "", "## Replies",
        "- say: " + (s.answer || "I know this one, but nothing is set up to do it yet."),
        ...s.needed.map(n => "- ask_" + n + ": Which " + n.replace(/_/g, " ") + "?"), ""].join("\n");
    }
    exportFile() {
      const stamp = new Date().toISOString().slice(0, 10), fresh = this.newSkills();
      let out = "<!-- Taught on the device through the inbox, " + stamp + ".\n" +
        "     Sentences for existing skills: copy to data/ and list the file in data/manifest.json. -->\n" +
        this.markdown(i => !fresh[i]);
      for (const name of Object.keys(fresh))
        out += "\n<!-- New skill: save this as skills/" + name + "/skill.md, then run node train.js -->\n" +
          "````markdown\n" + this.draftSkill(name, stamp) + "````\n";
      return out;
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

  return { Inbox, annotate, NAME_RE };
})();
if (typeof module !== "undefined") module.exports = NLUInbox;
