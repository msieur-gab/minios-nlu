// Forget your name, your place, or both.
module.exports = {
  run(ctx) {
    const me = ctx.me.get(), t = ctx.text.toLowerCase();
    const all = /\b(everything|all about|all of it|my data|my details|profile|memory)\b/.test(t);
    const aboutName = /\b(name|call me)\b/.test(t);
    const aboutPlace = /\b(live|living|city|town|place|location|home|based|address)\b/.test(t);
    const key = !all && aboutName && !aboutPlace ? "name" : !all && aboutPlace && !aboutName ? "place" : "all";
    const had = key === "all" ? me.name || me.place : me[key];
    const next = { ...me };
    if (key !== "place") delete next.name;
    if (key !== "name") delete next.place;
    ctx.me.set(next);
    ctx.log("forgot " + key);
    return had ? ctx.say(key) : ctx.say("nothing");
  },
};
