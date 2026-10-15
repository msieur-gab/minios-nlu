// node diversity.js [-v]
// How varied is each skill's way of being asked? Scores the example lines in skills/*/skill.md,
// thinnest skills first, so you know where to write before anyone tests.
//
//   lines      example lines in the skill file
//   words      distinct words the lines use to ask, not counting values ({city}, [..](slot))
//   shapes     c command · p polite ("can you…", "I'd like…") · q question · s statement
//              ("it's too loud") · f fragment ("10 minutes for the pasta"); a dot is a shape
//              no line uses
//   unseen     the model is trained without a line and tries that line's sentences: the share
//              of lines still recognised. A line nothing else supports is an edge people will
//              hit; a skill where few lines survive has too little variety
//   pulled by  the other skill that takes the most probability from unseen lines (a place for
//              contrast lines), and how much on average
//
// Only the skill folders are scored (not data/synth_*.md), with the shipped trainer settings,
// 5 folds over each skill's lines. -v lists, per skill, the lines no other line supports and
// which skill takes them.
//
// Two kinds of thin: few lines survive (each line stands alone), or many lines but few words
// (the skill knows one way of saying it, and a new word won't be recognised).
const T = require("./web/trainer.js");
const R = require("./web/runtime.js");
const { compile } = require("./skills.js");

const verbose = process.argv.includes("-v");
const TH = 0.45, FOLDS = 5;
const { examples } = compile();
const words = t => R.tokenize(t).map(x => x[0].toLowerCase()).filter(w => /^[a-z][a-z']*$/.test(w));

// a line's own wording: drop marked values and {list} values, keep every {a|b} alternative
function wording(line) {
  const t = line.replace(/\[[^\]]*\]\([a-z_]+\)/g, " ").replace(/\{([^{}|]*)\}/g, (m, k) => (k.trim() ? " " : m));
  return new Set(words(t.replace(/[{}|]/g, " ")));
}
const POLITE = /^(please |can you |could you |would you |will you |i want |i'd like |i would like |i need |let's |i wanna )/;
const QUESTION = /^(what|what's|whats|where|where's|when|when's|who|who's|which|how|how's|is|are|am|do|does|did|will|would|should|was|were|have|has|any)\b/;
const STATEMENT = /^(it|it's|its|i'm|im|i|my|the|this|that|there|there's|we|you're|you)\b/;
function shape(sentence) {
  const s = sentence.toLowerCase().replace(/^(hey|ok|okay|so|um)\s*,?\s*/, "");
  if (POLITE.test(s)) return "p";
  if (QUESTION.test(s) || /\?\s*$/.test(s)) return "q";
  if (STATEMENT.test(s)) return "s";
  if (words(s).length <= 3 || /^[0-9]/.test(s)) return "f";
  return "c";
}

// every example line with its sentences; a line's fold is spread across skills
const lines = [];
for (const [skill, list] of Object.entries(examples))
  list.forEach((ex, i) => lines.push({ skill, i, line: ex.line, fold: i % FOLDS,
    sentences: [...ex.sentences].map(s => T.parseDataset(`## intent: ${skill}\n- ${s}\n`)[0]) }));

const norm = t => t.toLowerCase().replace(/[?!.]+$/, "").split(/\s+/).join(" ");
for (let f = 0; f < FOLDS; f++) {
  const out = new Set(lines.filter(l => l.fold === f).flatMap(l => l.sentences.map(e => norm(e.text))));
  const train = lines.filter(l => l.fold !== f).flatMap(l => l.sentences).filter(e => !out.has(norm(e.text)));
  const nlu = new R.NLU(T.train(train, { slotIter: 1 }));
  for (const l of lines.filter(l => l.fold === f)) {
    let ok = 0; const pulls = {};
    for (const e of l.sentences) {
      const r = nlu.classify(e.text);
      if ((r[0][1] >= TH ? r[0][0] : "out_of_scope") === l.skill) ok++;
      for (const [k, p] of r) if (k !== l.skill) pulls[k] = (pulls[k] || 0) + p;
    }
    l.ok = ok / l.sentences.length;
    l.pulls = Object.fromEntries(Object.entries(pulls).map(([k, p]) => [k, p / l.sentences.length]));
  }
  process.stderr.write(`  fold ${f + 1}/${FOLDS}\r`);
}

const rows = Object.keys(examples).map(skill => {
  const ls = lines.filter(l => l.skill === skill);
  const own = ls.map(l => wording(l.line));
  const vocab = new Set(own.flatMap(w => [...w]));
  const shapes = new Set(ls.map(l => shape(l.sentences[0].text)));
  const pull = {};
  for (const l of ls) for (const [k, p] of Object.entries(l.pulls)) pull[k] = (pull[k] || 0) + p / ls.length;
  const [by, amount] = Object.entries(pull).sort((a, b) => b[1] - a[1])[0] || ["", 0];
  const fragile = ls.filter(l => l.ok < 0.5);
  return { skill, n: ls.length, words: vocab.size, shapes: "cpqsf".split("").map(c => (shapes.has(c) ? c : "·")).join(""),
    unseen: ls.filter(l => l.ok >= 0.5).length / ls.length, by, amount, fragile };
}).sort((a, b) => a.unseen - b.unseen || a.words - b.words);

const pct = x => (100 * x).toFixed(0).padStart(3) + "%";
console.log("\n  skill              lines  words  shapes  unseen  pulled by");
for (const r of rows)
  console.log(`  ${r.skill.padEnd(18)} ${String(r.n).padStart(5)}  ${String(r.words).padStart(5)}  ${r.shapes}   ${pct(r.unseen)}   ${r.by} ${r.amount.toFixed(2)}`);
const all = lines.filter(l => l.ok >= 0.5).length / lines.length;
console.log(`\n  ${lines.length} example lines, ${pct(all).trim()} still recognised when left out of training`);

if (verbose) for (const r of rows) {
  if (!r.fragile.length) continue;
  console.log(`\n${r.skill}`);
  for (const l of r.fragile) {
    const [k, p] = Object.entries(l.pulls).sort((a, b) => b[1] - a[1])[0];
    console.log(`  ${l.line}   (→ ${k} ${p.toFixed(2)})`);
  }
}
