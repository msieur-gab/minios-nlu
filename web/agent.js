// Dialogue core. It knows no skill by name: it routes what the model understood to the skill
// folders (skills/<name>/), keeps the conversation going (missing values, confirmations, choices,
// several commands in one sentence) and hands each skill a toolbox (ctx) of shared services.
// Commands are simulated: the trace shows what would run on the device.

const THRESHOLD = 0.45;        // below this the agent abstains
const SPLIT_CONFIDENCE = 0.7;  // each part of a multi-command sentence must be at least this sure
const ENT = typeof NLUEntities !== "undefined" ? NLUEntities : require("./entities.js");
const SV = typeof NLUServices !== "undefined" ? NLUServices : require("./services.js");
const SKILLS = (typeof SKILLS_DATA !== "undefined" ? SKILLS_DATA : require("./skills.json")).skills;
// skills that do something (conversational ones are marked "kind: chat")
const ACTIONABLE = new Set(Object.keys(SKILLS).filter(k => SKILLS[k].params.kind !== "chat"));

// the dialogue's own replies; every skill brings its own as "<skill>.<name>"
const RESPONSES = {
  cancel: ["Cancelled.", "OK, I dropped it."],
  declined: ["OK, I'll leave it.", "Cancelled. Nothing changes."],
  empty_value: ["I didn't catch a name. Try again, or say cancel."],
  fallback: ["I didn't understand that. Say help to see what I can do."],
  learned: ["I recognise this as “{intent}”{got}, but no action is set up for it yet."],
  network: ["I need a network connection to {what}."],
  unsure: ["Do you want me to {what}?"],
  wait: ["One moment…"],
};
for (const [name, sk] of Object.entries(SKILLS)) for (const [k, v] of Object.entries(sk.replies)) RESPONSES[name + "." + k] = v;

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const fill = (key, vars = {}) => pick(RESPONSES[key]).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
const has = key => key in RESPONSES;
const cleanValue = v => v.trim().replace(/^["'“”‘’`]+|["'“”‘’`.!?,]+$/g, "").trim();
const YES_RE = /^(y|yes|yeah|yep|yup|sure|ok|okay|confirm|do it|go|go ahead|please do|absolutely|of course)\b/i;
const NO_RE = /^(n|no|nope|nah|nvm|cancel|stop|don'?t|never ?mind|abort|not now)\b/i;
const stripVerb = t => t.replace(/^(please\s+)?((can|could|would) you\s+)?/i, "")
  .replace(/^(open|launch|start|run|bring up|fire up|show( me)?|give me|get me|pull up|display|view)\s+(up\s+)?/i, "")
  .replace(/\s+(please|for me)\s*\??$/i, "");
// a word from a skill's value list: "the Terminal app" → the "terminal" entry
const findValue = (list, raw) => {
  const v = cleanValue(raw).toLowerCase().replace(/^(the|my|a|an)\s+/, "").replace(/\s+(app|application|program|window)$/, "").trim();
  return (list || []).find(x => x.words.includes(v)) || null;
};
// what a skill does, from its help line: "check the weather (“weather tomorrow”)" → "check the weather"
const doing = sk => (sk.params.help || "do that").replace(/\s*\(.*$/, "").trim();
const online = () => typeof navigator === "undefined" || navigator.onLine !== false;
const orList = a => (a.length > 1 ? a.slice(0, -1).join(", ") + " or " + a[a.length - 1] : a.join(""));
// which offered option an answer points to: an option's keys ("16th", "morning"), "the other one", or yes
function pickOption(answer, options) {
  const a = " " + answer.toLowerCase().replace(/[^a-z0-9:]+/g, " ") + " ";
  for (let i = 0; i < options.length; i++) if ((options[i].keys || []).some(k => a.includes(" " + k + " "))) return i;
  if (/ (second|other|latter|2nd|the other one) /.test(a)) return 1;
  if (/ (first|former|1st) /.test(a) || YES_RE.test(answer.trim())) return 0;
  return -1;
}
// a skill's script: bundled by the build in the browser, required from its folder in Node
function loadScript(name, sk) {
  const from = sk.params.script || name;
  if (typeof SKILL_CODE !== "undefined") return SKILL_CODE[from];
  return require(require("path").join(__dirname, "..", "skills", from, "skill.js"));
}

class Agent {
  constructor(nlu, store) {
    this.nlu = nlu;
    this.store = store || null;
    this.fetch = typeof fetch !== "undefined" ? fetch.bind(globalThis) : null;
    this.reset();
  }
  reset() {
    this.pending = null; this.queue = null; this.levels = {};
    for (const t of this.timers || []) clearTimeout(t);
    this.timers = [];
  }
  now() { return this.clock ? this.clock() : new Date(); }
  // timers and reminders really ring in the PWA while the page is open (onAlert shows the message)
  arm(at, message) {
    const ms = at - this.now();
    if (this.onAlert && ms > 0 && ms < 2 ** 31 - 1) this.timers.push(setTimeout(() => this.onAlert(message), ms));
  }

  // ---------- several commands in one sentence ----------
  // Split on and / then / ; only when every part is confidently a command on its own, so
  // "a folder called salt and pepper" stays whole. A part without a verb borrows the previous one.
  splitCommands(text) {
    if (this.pending) return null;
    const parts = text.split(/\s*(?:,\s*)?\b(?:and then|and also|then|and)\b\s*|\s*;\s*/i).map(p => p.trim()).filter(Boolean);
    if (parts.length < 2 || parts.length > 4) return null;
    const ok = r => ACTIONABLE.has(r.intent) && r.confidence >= SPLIT_CONFIDENCE;
    const rs = parts.map(p => this.nlu.parse(p));
    for (let i = 1; i < parts.length; i++) {
      if (ok(rs[i])) continue;
      const verb = parts[i - 1].split(/\s+/)[0];
      const r = this.nlu.parse(verb + " " + parts[i]);
      if (ok(r) && r.intent === rs[i - 1].intent) { parts[i] = verb + " " + parts[i]; rs[i] = r; }
    }
    if (!rs.every(ok)) return null;
    // one skill with all its values in the whole sentence ("I live in Munich and my name is Gab"): keep it whole
    const whole = this.nlu.parse(text);
    if (rs.every(r => r.intent === whole.intent) && Object.keys(whole.slots).length >= rs.reduce((n, r) => n + Object.keys(r.slots).length, 0)) return null;
    return parts;
  }

  handle(text) {
    const parts = this.splitCommands(text);
    if (parts) return this.runSequence(parts, text);
    this.dropQueue = false;
    const out = this.handleOne(text);
    if (this.queue && !this.pending) { // an answer to a question asked mid-sequence: carry on
      const rest = this.queue;
      this.queue = null;
      if (!this.dropQueue) return this.runSequence(rest, text, out);
      out.trace.push({ type: "state", text: "dropped the rest: " + rest.map(p => "“" + p + "”").join(", ") });
    }
    return out;
  }

  runSequence(parts, text, first = null) {
    const outs = first ? [first] : [];
    let i = 0;
    for (; i < parts.length; i++) {
      outs.push(this.handleOne(parts[i]));
      if (this.pending) { i++; break; } // a part asked a question: the rest waits for the answer
    }
    this.queue = i < parts.length ? parts.slice(i) : null;
    const trace = [{ type: "nlu", r: first ? first.trace[0].r : this.nlu.parse(text) },
      { type: "state", text: (first ? "answer received, continuing with " : "split into commands: ") + parts.map(p => "“" + p + "”").join(" + ") }];
    outs.forEach((o, k) => {
      trace.push({ type: "state", text: "→ " + (k + 1) + ". " + o.trace[0].r.intent + " " + o.trace[0].r.confidence.toFixed(2) });
      trace.push(...o.trace.slice(1));
    });
    if (this.queue) trace.push({ type: "state", text: "waiting for an answer; then: " + this.queue.map(p => "“" + p + "”").join(", ") });
    const reply = outs.map(o => o.reply).join("\n");
    if (!outs.some(o => o.later)) return { trace, reply };
    const later = Promise.all(outs.map(o => o.later || Promise.resolve({ reply: o.reply, trace: [] })))
      .then(rs => ({ reply: rs.map(r => r.reply).join("\n"), trace: rs.flatMap(r => r.trace || []) }));
    return { trace, reply, later };
  }

  // ---------- one command, or the answer to a question ----------
  handleOne(text) {
    const trace = [];
    this.lastText = text;
    const r = this.nlu.parse(text);
    trace.push({ type: "nlu", r });
    const p = this.pending, t = text.trim();
    const no = NO_RE.test(t) || (r.intent === "deny" && r.confidence >= 0.5);
    const drop = why => { this.dropQueue = true; this.pending = null; trace.push({ type: "state", text: why }); };

    if (p && p.type === "confirm") {
      this.pending = null;
      const yes = YES_RE.test(t) || (r.intent === "affirm" && r.confidence >= 0.5);
      if (yes && !no) {
        trace.push({ type: "state", text: "confirmed " + p.what });
        if (p.sentence) { this.lastText = p.sentence; return this.run(p.intent, p.slots, trace); }
        return this.resume(p, p.then, trace);
      }
      if (no) { drop("declined " + p.what); return { trace, reply: fill(has(p.intent + ".declined") ? p.intent + ".declined" : "declined") }; }
      trace.push({ type: "state", text: "no clear yes, dropped " + p.what + " and read this as a new command" });
    } else if (p && p.type === "choose") {
      this.pending = null;
      const i = no ? -2 : pickOption(text, p.options);
      if (i >= 0) { trace.push({ type: "state", text: "picked “" + p.options[i].label + "”" }); return this.resume(p, p.options[i].then, trace); }
      if (i === -2) { drop("declined, nothing done"); return { trace, reply: fill("cancel") }; }
      trace.push({ type: "state", text: "answer matched no option, read it as a new command" });
    } else if (p) {
      if (no) { drop("cancelled pending " + p.intent); return { trace, reply: fill("cancel") }; }
      if (r.intent === p.intent && r.slots[p.need]) {
        this.pending = null;
        trace.push({ type: "state", text: "same skill with " + p.need + ", merged into the question" });
        return this.run(p.intent, { ...p.slots, ...r.slots }, trace);
      }
      if (r.intent === "out_of_scope" && r.confidence >= 0.55 && t.split(/\s+/).length >= 4) drop("off-topic sentence, dropped the question");
      else if (ACTIONABLE.has(r.intent) && r.confidence >= 0.8 && Object.keys(r.slots).length) drop("new command, dropped the question");
      else return this.answer(p, r, text, trace);
    }

    if (r.confidence < THRESHOLD) {
      trace.push({ type: "abstain", text: "confidence " + r.confidence.toFixed(2) + " < " + THRESHOLD + ", abstaining" });
      return { trace, reply: fill(has("out_of_scope.say") ? "out_of_scope.say" : "fallback"), unknown: true };
    }
    if (r.intent === "out_of_scope") {
      trace.push({ type: "abstain", text: "out of scope, no action" });
      return { trace, reply: fill(has("out_of_scope.say") ? "out_of_scope.say" : "fallback"), unknown: true };
    }
    if (!SKILLS[r.intent]) { // taught through the inbox: recognised, but no skill folder does it yet
      const got = Object.entries(r.slots).map(([k, v]) => k + " “" + cleanValue(v) + "”").join(", ");
      trace.push({ type: "state", text: "learned skill " + r.intent + ", no skill folder" });
      return { trace, reply: fill("learned", { intent: r.intent.replace(/_/g, " "), got: got ? " (" + got + ")" : "" }) };
    }
    // a skill can ask for more certainty than the global threshold: in between, ask first
    const sure = +(SKILLS[r.intent].params.confidence || 0);
    if (r.confidence < sure) {
      this.pending = { type: "confirm", intent: r.intent, slots: r.slots, what: r.intent, sentence: text };
      trace.push({ type: "state", text: "confidence " + r.confidence.toFixed(2) + " < " + sure + " for " + r.intent + ", asking first" });
      return { trace, reply: fill(has(r.intent + ".unsure") ? r.intent + ".unsure" : "unsure", { what: doing(SKILLS[r.intent]) }) };
    }
    return this.run(r.intent, r.slots, trace);
  }

  // the answer to "what should I call it?": the needed value, minus any other value it carries
  // ("drafts in documents" → name "drafts", location "documents")
  answer(p, r, text, trace) {
    let rest = text;
    const extra = {};
    for (const [k, v] of Object.entries(r.slots)) {
      if (k === p.need) continue;
      const at = rest.toLowerCase().lastIndexOf(v.toLowerCase());
      if (at > 0) { rest = rest.slice(0, at).replace(/\s+(in|inside|on|under|within|to|at)(\s+(the|my))?\s*$/i, ""); extra[k] = v; }
    }
    const value = cleanValue(rest.replace(/^(please\s+)?(call it|name it|let'?s call it|it'?s|it is|its|name|called|named|use|make it|open|launch|start|run|fire up)\s+/i, ""));
    if (!value) { trace.push({ type: "state", text: "still waiting for " + p.need }); return { trace, reply: fill("empty_value") }; }
    this.pending = null;
    trace.push({ type: "state", text: "filled " + p.need + " ← “" + value + "”" });
    return this.run(p.intent, { ...p.slots, ...extra, [p.need]: value }, trace);
  }

  ask(intent, slots, need, key, trace, vars = {}) {
    this.pending = { intent, slots, need };
    trace.push({ type: "state", text: "missing " + need + ", waiting for an answer" });
    return { trace, reply: fill(key, vars) };
  }

  // ---------- running a skill ----------
  run(intent, slots, trace) {
    const sk = SKILLS[intent];
    if ((sk.params.uses || "").includes("network") && !online()) {
      trace.push({ type: "abstain", text: "offline, " + intent + " uses the network" });
      return { trace, reply: fill("network", { what: doing(sk) }) };
    }
    if (sk.slots) { // declared slots: fill them, ask for what's missing, before the skill runs
      const got = this.fillSlots(sk, slots, trace);
      if (got.ask) return this.ask(intent, slots, got.ask[0], intent + "." + got.ask[1], trace);
      slots = got.values;
    }
    if (sk.code || sk.params.script) return this.runScript(intent, sk, slots, trace);
    if (sk.action === "run") return this.runCommand(intent, sk, slots, trace);
    if (sk.request) return this.runScript(intent, sk, slots, trace, { run: ctx => ctx.later("checking", ctx.slots, async () => {
      const res = await ctx.request(ctx.slots);
      return res.place === null && ctx.slots.place ? ctx.say("not_found", ctx.slots) : ctx.say("done", { ...ctx.slots, ...res.answer, ...(res.place ? { place: res.place.name } : {}) });
    }) });
    return { trace, reply: fill(intent + ".say") };
  }

  // Each declared slot gets a value of its type: text from the model, a place (whole multi-word
  // name), or a date from the date parser. A missing required slot is asked for; a value that
  // doesn't fit its type is asked for again (with the slot's invalid: reply if it has one).
  fillSlots(sk, slots, trace) {
    const text = this.lastText, values = { ...slots };
    for (const [name, slot] of Object.entries(sk.slots)) {
      const raw = slots[name] != null && typeof slots[name] === "string" ? cleanValue(slots[name]) : slots[name];
      let v = null;
      if (slot.type === "text") v = raw || null;
      else if (slot.type === "place") v = raw ? SV.places.placeIn(text, raw) : null;
      else if (slot.type === "datetime") {
        const ents = ENT.parse(text, { now: this.now() }).filter(x => x.type !== "duration");
        v = ents.find(x => x.type === "datetime" || x.type === "recurrence") || ents.find(x => x.type === "date" || x.type === "range") || null;
        if (v) trace.push({ type: "entity", e: v });
      }
      if (v == null && slot.default === "home") { const me = this.mem(); v = (me.place && me.place.name) || null; }
      if (v == null && slot.required) {
        const wrong = raw && slot.invalid;
        trace.push({ type: "state", text: wrong ? name + " “" + raw + "” isn't a " + slot.type : "missing " + name });
        return { ask: [name, wrong ? slot.invalid : slot.ask] };
      }
      values[name] = v;
    }
    return { values };
  }

  // action: run — a command from the skill's front matter, filled with a value from its list
  runCommand(intent, sk, slots, trace) {
    const need = sk.params.needs, list = sk.values[need] || [];
    const choices = orList(list.map(v => v.key));
    let raw = slots[need];
    if (!raw) {
      const guess = stripVerb(this.lastText);
      if (!findValue(list, guess)) return this.ask(intent, slots, need, intent + ".ask_" + need, trace, { choices });
      trace.push({ type: "state", text: need + " filled from the skill's list ← “" + cleanValue(guess) + "”" });
      raw = guess;
    }
    const v = findValue(list, raw);
    if (!v) {
      trace.push({ type: "abstain", text: "no " + need + " matches “" + cleanValue(raw) + "” in " + sk.file });
      return { trace, reply: fill(intent + ".unknown", { value: cleanValue(raw), choices }) };
    }
    trace.push({ type: "exec", text: sk.params.command.replace(/\{(\w+)\}/g, (_, k) => (k === need ? v.out : cleanValue(slots[k] || ""))) });
    return { trace, reply: fill(intent + ".done", { [need]: v.key }) };
  }

  // the toolbox a skill script receives
  makeCtx(intent, sk, slots, trace) {
    const agent = this, now = this.now(), text = this.lastText;
    const ctx = {
      intent, text, now, values: sk.values, params: sk.params, live: trace,
      slots: Object.fromEntries(Object.entries(slots).filter(([, v]) => v != null).map(([k, v]) => [k, typeof v === "string" ? cleanValue(v) : v])),
      // what to answer
      say: (name, vars = {}) => fill(intent + "." + name, vars),
      ask: (slot, name, vars = {}) => ({ ask: [slot, name, vars] }),
      confirm: (what, question, then) => ({ confirm: [what, question, then] }),
      choose: (question, options) => ({ choose: [question, options] }),
      later: (name, vars, work) => ({ later: [name, vars, work] }),
      handover: (to, newSlots = {}, prefix = "") => ({ handover: [to, newSlots, prefix] }),
      // what happened, for the trace
      log: (line, type = "state") => ctx.live.push({ type, text: line }),
      used: e => ctx.live.push({ type: "entity", e }),
      exec: cmd => ctx.live.push({ type: "exec", text: cmd }),
      // shared services
      entities: () => ENT.parse(text, { now }),
      find: (list, raw) => findValue(sk.values[list], raw),
      findIn: (skill, list, raw) => findValue(SKILLS[skill] && SKILLS[skill].values[list], raw), // another skill's list
      lookup: (list, key) => ((sk.values[list] || []).find(v => v.key === String(key)) || {}).out,
      guess: () => stripVerb(text),
      state: { get: (k, d) => (k in agent.levels ? agent.levels[k] : d), set: (k, v) => { agent.levels[k] = v; } },
      me: { get: () => agent.mem(), set: m => agent.setMem(m) },
      geocode: name => agent.geocode(name),
      place: () => SV.places.placeIn(text, ctx.slots.place),  // the place named, whole ("hong kong")
      request: vars => agent.request(sk, vars, ctx),
      arm: (at, message) => agent.arm(at, message),
      skills: () => Object.values(SKILLS).filter(s => s.params.help).map(s => s.params.help),
      fmt: SV.fmt, files: SV.files,
    };
    return ctx;
  }

  runScript(intent, sk, slots, trace, script) {
    const ctx = this.makeCtx(intent, sk, slots, trace);
    return this.finish(intent, sk, ctx, (script || loadScript(intent, sk)).run(ctx), trace, slots);
  }
  // an answer to a confirmation or a choice: back to the skill that asked
  resume(p, then, trace) {
    const sk = SKILLS[p.intent], ctx = this.makeCtx(p.intent, sk, p.slots || {}, trace);
    return this.finish(p.intent, sk, ctx, then(ctx), trace, p.slots || {});
  }
  // turn what a script returned into the agent's reply
  finish(intent, sk, ctx, res, trace, slots) {
    if (res && res.ask) { const [slot, name, vars] = res.ask; return this.ask(intent, slots, slot, intent + "." + name, trace, vars); }
    if (res && res.confirm) {
      const [what, question, then] = res.confirm;
      this.pending = { type: "confirm", intent, slots, what, then };
      trace.push({ type: "state", text: "needs a yes first (" + what + ")" });
      return { trace, reply: question };
    }
    if (res && res.choose) {
      const [question, options] = res.choose;
      this.pending = { type: "choose", intent, slots, options };
      trace.push({ type: "state", text: "asking: " + options.map(o => o.label).join(" / ") });
      return { trace, reply: question };
    }
    if (res && res.handover) {
      const [to, newSlots, prefix] = res.handover;
      trace.push({ type: "state", text: "handed over to " + to });
      const out = this.run(to, newSlots, trace);
      if (prefix) out.reply = prefix + " " + out.reply;
      return out;
    }
    if (res && res.later) {
      const [name, vars, work] = res.later;
      const late = [];
      ctx.live = late;
      const later = Promise.resolve().then(work)
        .then(r => ({ reply: typeof r === "string" ? r : r.reply, trace: late }))
        .catch(err => {
          late.push({ type: "abstain", text: err.message });
          const reply = has(intent + ".offline") ? ctx.say("offline", vars)
            : (sk.params.uses || "").includes("network") ? fill("network", { what: doing(sk) }) : "Something went wrong: " + err.message;
          return { reply, trace: late };
        });
      return { trace, reply: has(intent + "." + name) ? ctx.say(name, vars) : fill("wait"), later };
    }
    return { trace, reply: typeof res === "string" ? res : (res && res.reply) || "" };
  }

  // network and memory services (web/services.js), bound to this agent's fetch and storage
  request(sk, vars, ctx) { return SV.net.request(this, sk, vars, ctx); }
  geocode(name) { return SV.net.geocode(this, name); }
  mem() { return SV.me.get(this.store, this); }
  setMem(m) { SV.me.set(this.store, this, m); }
}
if (typeof module !== "undefined") module.exports = { Agent };
