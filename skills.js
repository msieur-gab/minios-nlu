// Compile the skill folders (skills/<name>/skill.md, plus an optional skill.js) into
//   data/skills.md     training sentences (same format as the other data files)
//   web/skills.json    what the agent needs at runtime: action, parameters, value lists, replies,
//                      the declared API request, and whether the skill has a script
//
//   node skills.js            (train.js runs it too)
//
// Format: see skills/README.md
const fs = require("fs");
const path = require("path");

function rng(seed) { // mulberry32: the same sentences on every machine
  return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

function parseSkill(md, file) {
  const fm = /^---\n([\s\S]*?)\n---\n?/.exec(md);
  if (!fm) throw new Error(file + ": missing front matter (--- ... ---)");
  const meta = {};
  for (const line of fm[1].split("\n")) {
    const m = /^\s*([a-z_]+)\s*:\s*(.*?)\s*$/.exec(line);
    if (m) meta[m[1]] = m[2].replace(/\s+#\s.*$/, "").replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1"); // "# note" ends a line
  }
  if (!meta.skill) throw new Error(file + ": front matter needs skill: <name>");
  const skill = { file, skill: meta.skill, action: meta.action || "say", params: meta, examples: [], values: {}, replies: {}, request: null, answer: {}, slots: null };
  let section = null, list = null;
  for (const raw of md.slice(fm[0].length).split("\n")) {
    const line = raw.trim();
    const h = /^##\s+(.+)$/.exec(line);
    if (h) {
      const title = h[1].trim();
      const v = /^values\s*:\s*([a-z_]+)$/i.exec(title);
      section = v ? "values" : title.toLowerCase();
      if (v) list = skill.values[v[1]] = [];
      continue;
    }
    // ## Request: first line "GET https://...", then "- name: value" query parameters
    if (section === "request") {
      const r = /^(GET|POST)\s+(\S+)$/.exec(line);
      if (r) { skill.request = { method: r[1], url: r[2], query: {} }; continue; }
    }
    if (!line.startsWith("- ")) continue;
    const item = line.slice(2).trim();
    if (section === "request" && skill.request) {
      const m = /^([A-Za-z0-9_]+)\s*:\s*(.+)$/.exec(item);
      if (m) skill.request.query[m[1]] = m[2];
      continue;
    }
    // ## Answer: "- name: path.in.json [round] [→ list]"
    if (section === "answer") {
      const m = /^([a-z_]+)\s*:\s*([A-Za-z0-9_.\[\]]+)(\s+round)?(?:\s*(?:→|->)\s*([a-z_]+))?$/.exec(item);
      if (m) skill.answer[m[1]] = { path: m[2], round: !!m[3], via: m[4] || null };
      continue;
    }
    // ## Slots: "- name: type, required, ask: reply, invalid: reply, default: source"
    if (section === "slots") {
      const m = /^([a-z_]+)\s*:\s*(.+)$/.exec(item);
      if (!m) throw new Error(`${file}: can't read slot line “${item}” (expected "- name: type, …")`);
      const [type, ...rest] = m[2].split(/\s*,\s*/);
      const [kind, list] = type.split(/\s+/);  // "list app": a value from ## Values: app
      const slot = { type: kind, list: list || null, required: false, guess: false, ask: null, invalid: null, default: null, ignore: [] };
      for (const opt of rest) {
        const o = /^(required|guess|ask|invalid|default|ignore)(?:\s*:\s*(.+))?$/.exec(opt);
        const flag = o && (o[1] === "required" || o[1] === "guess");
        if (!o || flag === !!o[2]) throw new Error(`${file}: slot ${m[1]}: unknown option “${opt}”`);
        slot[o[1]] = flag ? true : o[1] === "ignore" ? o[2].toLowerCase().split(/\s+/) : o[2];
      }
      (skill.slots = skill.slots || {})[m[1]] = slot;
      continue;
    }
    if (section === "examples") skill.examples.push(item);
    else if (section === "values") {
      // "key: synonym, synonym → output"   (synonyms and output are optional)
      const [left, out] = item.split(/\s*(?:→|->)\s*/);
      const [key, syn] = left.split(/:\s+/);
      const words = [key, ...(syn ? syn.split(/\s*,\s*/) : [])].map(w => w.trim()).filter(Boolean);
      list.push({ key: key.trim(), words: [...new Set(words.map(w => w.toLowerCase()))], say: words, out: out === undefined ? null : out.trim() });
    } else if (section === "replies") {
      const m = /^([a-z_]+)\s*:\s*(.+)$/.exec(item);
      if (m) skill.replies[m[1]] = m[2].split(/\s+\|\s+/).map(s => s.trim());
    }
  }
  return skill;
}

// Checks that run when the skills are compiled, so a mistake shows up while writing the skill,
// not when someone talks to the agent.
const SLOT_TYPES = ["text", "place", "datetime", "duration", "list"];
const ROLES = ["yes", "no", "fallback"];   // the skills the dialogue itself relies on
const DEFAULTS = ["home"];   // home: the place the person told the agent they live in
const USES = ["network"];
function validate(s) {
  const err = msg => { throw new Error(`${s.file}: ${msg}`); };
  const p = s.params;
  if (p.confidence !== undefined && !(+p.confidence > 0 && +p.confidence < 1)) err(`confidence must be between 0 and 1, not “${p.confidence}”`);
  for (const u of (p.uses || "").split(/\s*,\s*/).filter(Boolean)) if (!USES.includes(u)) err(`uses: unknown “${u}” (known: ${USES.join(", ")})`);
  if (p.role && !ROLES.includes(p.role)) err(`role: unknown “${p.role}” (known: ${ROLES.join(", ")})`);
  const slots = s.slots || {};
  const trainOnly = (p.train_only || "").split(/\s*,\s*/);
  for (const [name, slot] of Object.entries(slots)) {
    if (!SLOT_TYPES.includes(slot.type)) err(`slot ${name}: unknown type “${slot.type}” (known: ${SLOT_TYPES.join(", ")})`);
    if (slot.type === "list" && (!s.values[slot.list] || trainOnly.includes(slot.list))) err(`slot ${name}: “list ${slot.list}” needs a ## Values: ${slot.list} list that isn't train_only`);
    if (slot.type !== "list" && (slot.list || slot.guess || slot.ignore.length)) err(`slot ${name}: guess, ignore and a list name are for list slots only`);
    if (slot.required && !slot.ask) err(`slot ${name} is required but has no ask: reply to ask for it`);
    for (const k of ["ask", "invalid"]) if (slot[k] && !s.replies[slot[k]]) err(`slot ${name}: ${k}: “${slot[k]}” is not in ## Replies`);
    if (slot.default && !DEFAULTS.includes(slot.default)) err(`slot ${name}: unknown default “${slot.default}” (known: ${DEFAULTS.join(", ")})`);
  }
  // every value the examples teach the model to pull out, or the command uses, must be declared
  for (const ex of s.examples) for (const m of ex.matchAll(/\]\(([a-z_]+)\)/g))
    if (!slots[m[1]]) err(`examples mark [..](${m[1]}) but ## Slots doesn't declare ${m[1]}`);
  for (const m of (p.command || "").matchAll(/\{(\w+)\}/g)) if (!slots[m[1]]) err(`command uses {${m[1]}} but ## Slots doesn't declare it`);
}

// Expand one template: {a|b|} picks an alternative, {list} picks a value from "## Values: list".
function expand(tpl, skill, rand) {
  let t = tpl;
  for (let guard = 0; guard < 50; guard++) {
    const m = /\{([^{}]*)\}/.exec(t);
    if (!m) break;
    let rep;
    if (m[1].includes("|")) { const alts = m[1].split("|"); rep = alts[Math.floor(rand() * alts.length)]; }
    else {
      const list = skill.values[m[1]];
      if (!list) throw new Error(`${skill.file}: {${m[1]}} has no "## Values: ${m[1]}" list`);
      const v = list[Math.floor(rand() * list.length)];
      rep = v.say[Math.floor(rand() * v.say.length)];
    }
    t = t.slice(0, m.index) + rep + t.slice(m.index + m[0].length);
  }
  return t.replace(/\s+/g, " ").replace(/\s+([?!.,])/g, "$1").trim();
}

function compile(dir = "skills") {
  const folders = fs.readdirSync(dir).filter(f => fs.existsSync(path.join(dir, f, "skill.md"))).sort();
  const skills = [];
  for (const f of folders) {
    const s = parseSkill(fs.readFileSync(path.join(dir, f, "skill.md"), "utf8"), path.join(dir, f, "skill.md"));
    if (s.skill !== f) throw new Error(`${s.file}: skill name "${s.skill}" must match its folder "${f}"`);
    validate(s);
    if (s.params.role && skills.some(o => o.params.role === s.params.role)) throw new Error(`${s.file}: another skill already has role: ${s.params.role}`);
    s.dir = path.join(dir, f);
    s.code = fs.existsSync(path.join(dir, f, "skill.js"));
    skills.push(s);
  }
  let md = "<!-- generated by skills.js from skills/*.md — edit the skill files, not this file -->\n";
  const runtime = {};
  for (const s of skills) {
    const rand = rng(hash(s.skill));
    const n = +(s.params.samples || 6);
    const lower = s.params.lowercase !== undefined ? +s.params.lowercase : 0.35;
    const lines = new Set();
    for (const tpl of s.examples) {
      const hasChoice = /\{/.test(tpl);
      for (let k = 0; k < (hasChoice ? n : 1); k++) {
        const line = expand(tpl, s, rand);
        lines.add(line);
        // phones often type in lowercase: add a lowercase copy of some sentences
        if (line !== line.toLowerCase() && rand() < lower) lines.add(line.toLowerCase());
      }
    }
    md += `\n## intent: ${s.skill}\n` + [...lines].map(l => "- " + l).join("\n") + "\n";
    const { skill, file, dir, code, action, params, values, replies, request, answer, slots } = s;
    runtime[skill] = { file, dir, code, action, params, request, answer, replies, slots, sentences: lines.size,
      values: Object.fromEntries(Object.entries(values).filter(([k]) => !(params.train_only || "").split(/\s*,\s*/).includes(k))) };
  }
  fs.writeFileSync("data/skills.md", md);
  fs.writeFileSync("web/skills.json", JSON.stringify({ skills: runtime }, null, 1));
  return { skills: runtime, sentences: Object.values(runtime).reduce((a, s) => a + s.sentences, 0) };
}

if (require.main === module) {
  const r = compile();
  for (const [k, s] of Object.entries(r.skills)) console.log(`  ${k.padEnd(14)} ${String(s.sentences).padStart(4)} sentences  ${s.code ? "skill.md + skill.js" : "skill.md only"}${s.request ? " · request " + new URL(s.request.url).host : ""}`);
  console.log(`data/skills.md: ${r.sentences} sentences · web/skills.json`);
}
module.exports = { compile, parseSkill, validate };
