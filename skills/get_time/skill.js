// The time here, or in another place: the place lookup gives the place's time zone.
const same = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

module.exports = {
  run(ctx) {
    const me = ctx.me.get();
    // a capitalised name after "in" also counts, if the model didn't mark a place
    const m = /\b(?:in|at)\s+([A-Z][\w'.-]*(?:\s+[A-Z][\w'.-]*)*)/.exec(ctx.text);
    const place = ctx.slots.place || (m && m[1]);
    if (!place || (me.place && same(place, me.place.name))) {
      ctx.exec("date +%H:%M");
      return ctx.say("done", { time: ctx.fmt.clock(ctx.now) });
    }
    return ctx.later("looking", { place }, async () => {
      ctx.exec("GET geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(place));
      const g = await ctx.geocode(place).catch(() => undefined);
      if (g === undefined) return ctx.say("offline", { time: ctx.fmt.clock(ctx.now) });
      if (!g) return ctx.say("not_found", { place });
      const f = o => new Intl.DateTimeFormat("en-GB", { timeZone: g.timezone, ...o }).format(ctx.now);
      ctx.log(`${g.name}${g.region ? ", " + g.region : ""} → ${g.timezone}`);
      return ctx.say("elsewhere", { place: g.name, time: f({ hour: "2-digit", minute: "2-digit", hour12: false }), day: f({ weekday: "long" }) });
    });
  },
};
