// A level from 0 to 100: up and down by 10, set to a value, mute and unmute.
// Shared by Volume and Brightness: the commands and the starting level are in each skill.md.
const PHRASES = [ // what people say when they mean down or up
  [/too (loud|bright|much (noise|light))|deafening|blinding|glare|squint|ears|eyes (are )?hurt|headache|head hurts/i, "down"],
  [/(can'?t|cannot|barely) (hear|see)|too (quiet|low|dark|dim)|barely (audible|visible)|blast/i, "up"],
];
function direction(ctx) {
  const v = ctx.slots.direction && ctx.find("direction", ctx.slots.direction);
  if (v) return v.out;
  if (ctx.slots.direction) return null;
  for (const [re, dir] of PHRASES) if (re.test(ctx.text)) return dir;
  const words = " " + ctx.text.toLowerCase().replace(/[^a-z\s]/g, " ") + " ";
  for (const dir of ["unmute", "mute", "up", "down"]) {
    const entry = ctx.values.direction.find(x => x.out === dir);
    if (entry.words.some(w => words.includes(" " + w + " "))) return dir;
  }
  return null;
}
function level(raw, text, fromSlot) {
  const v = (raw || "").toLowerCase();
  if (/\b(max|maximum|full)\b/.test(v)) return 100;
  if (/\b(min|minimum|zero)\b/.test(v)) return 0;
  if (/\bhalf\b/.test(v)) return 50;
  const m = (v || text).match(/\b(\d{1,3})\s*(%|percent)?/);
  return m && (fromSlot || m[2]) ? Math.max(0, Math.min(100, parseInt(m[1], 10))) : null;
}
module.exports = {
  run(ctx) {
    const p = ctx.params, key = p.state;
    let dir = direction(ctx);
    const n = ctx.slots.level ? level(ctx.slots.level, "", true) : level(null, ctx.slots.direction || ctx.text, false);
    if (dir === null && n === null) return ctx.ask("direction", "ask");
    if (!p.mute && (dir === "mute" || dir === "unmute")) dir = dir === "mute" ? "down" : "up"; // brightness: no mute
    const before = ctx.state.get(key, +p.start);
    if (dir === "mute") { ctx.state.set(key + ".muted", true); ctx.exec(p.mute); return ctx.say("muted"); }
    if (dir === "unmute") { ctx.state.set(key + ".muted", false); ctx.exec(p.unmute); return ctx.say("unmuted", { n: before }); }
    const now = n !== null ? n : Math.max(0, Math.min(100, before + (dir === "down" ? -10 : 10)));
    ctx.state.set(key, now);
    ctx.log(key + ": " + (dir || "level") + (n !== null ? " → " + n + "%" : ""));
    ctx.exec(n !== null ? p.set.replace("{n}", now) : dir === "down" ? p.down : p.up);
    return ctx.say(n !== null ? "set" : now > before ? "up" : now < before ? "down" : "same", { n: now });
  },
};
