// Which metrics the question is about: the named one, or a guess from the words ("overheating" → temp).
const GUESS = [
  [/hot|overheat|temperature|throttl|burning|fan/i, ["temp"]],
  [/slow|lag|crash|forever/i, ["cpu", "memory", "temp"]],
  [/online|offline|connection|ping/i, ["network"]],
  [/how long.*running|since when/i, ["uptime"]],
  [/space|storage|disk|drive|bytes/i, ["disk"]],
];
module.exports = {
  run(ctx) {
    let keys = null;
    if (ctx.slots.metric === "performance") keys = ["cpu", "memory", "temp"];
    else if (ctx.slots.metric && ctx.find("check", ctx.slots.metric)) keys = [ctx.find("check", ctx.slots.metric).key];
    else keys = (GUESS.find(([re]) => re.test(ctx.text)) || [null, ctx.values.check.map(v => v.key)])[1];
    for (const k of keys) ctx.exec(ctx.lookup("check", k));
    const lines = keys.map(k => ctx.lookup("sample", k)).join("\n");
    return keys.length > 2 ? ctx.say("all") + "\n" + lines : ctx.say("one") + " " + lines;
  },
};
