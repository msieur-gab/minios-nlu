// Say what the agent remembers about you. There is nothing else stored.
module.exports = {
  run(ctx) {
    const me = ctx.me.get(), t = ctx.text.toLowerCase();
    const aboutName = /\b(name|call me|who am i|who i am)\b/.test(t);
    const aboutPlace = /\b(live|living|city|town|place|location|home|based|address)\b/.test(t);
    const where = p => [p.name, p.region].filter(Boolean).join(", ");
    if (aboutName && !aboutPlace) return me.name ? ctx.say("name", { name: me.name }) : ctx.say("no_name");
    if (aboutPlace && !aboutName) return me.place ? ctx.say("place", { place: where(me.place) }) : ctx.say("no_place");
    const facts = [me.name && "your name is " + me.name, me.place && "you live in " + where(me.place)].filter(Boolean);
    return facts.length ? ctx.say("all", { facts: facts.join(", and ") }) : ctx.say("nothing");
  },
};
