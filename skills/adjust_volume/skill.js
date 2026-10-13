// A level from 0 to 100: up and down by 10, set to a value, mute and unmute.
// Shared by Volume and Brightness: the commands and the starting level are in each skill.md.
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
    // direction: a list slot, also found from phrases like "it's too loud" (skill.md)
    let dir = ctx.slots.direction ? ctx.slots.direction.out : null;
    const n = ctx.slots.level ? level(ctx.slots.level, "", true) : level(null, ctx.raw.direction || ctx.text, false);
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
