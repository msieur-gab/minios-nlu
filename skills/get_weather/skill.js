// Weather: which day(s) the sentence asks about, read from the 16-day forecast.
// The request itself (URL, parameters, fields for "now") is declared in skill.md.
const same = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
const day0 = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

module.exports = {
  run(ctx) {
    // place and day are filled by the core (## Slots): the place named, or home; the day, if any
    const me = ctx.me.get(), place = ctx.slots.place;
    const e = ctx.slots.day && ctx.slots.day.type !== "recurrence" ? ctx.slots.day : null;
    const today = day0(ctx.now);
    let days = null;
    if (e && e.type === "range") {
      days = [];
      for (let d = ctx.fmt.fromIso(e.from); d <= ctx.fmt.fromIso(e.to) && days.length < 7; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1))
        if (d >= today) days.push(d);
    } else if (e) days = [day0(ctx.fmt.fromIso(e.value))];
    if (days && days.length && days[days.length - 1] < today) return ctx.say("past");
    if (days && days.some(d => (d - today) / 864e5 > 15)) return ctx.say("too_far");

    return ctx.later("checking", { place }, async () => {
      const home = me.place && same(place, me.place.name) && me.place.lat != null ? me.place : null;
      const r = await ctx.request({ place: home || place });
      if (!r.place) return ctx.say("not_found", { place });
      if (!home && me.place && same(place, me.place.name)) ctx.me.set({ ...ctx.me.get(), place: r.place }); // home found on the map
      if (!days) return ctx.say("now", { place: r.place.name, ...r.answer });

      const d = r.json.daily;
      const label = day => { const k = Math.round((day - today) / 864e5); return k === 0 ? "today" : k === 1 ? "tomorrow" : ctx.fmt.dayText(day, ctx.now); };
      const lines = days.map(day => {
        const i = d.time.indexOf(iso(day));
        if (i < 0) return null;
        const rain = d.precipitation_probability_max[i];
        return { when: label(day), sky: ctx.lookup("sky", d.weather_code[i]) || "mixed weather",
          min: Math.round(d.temperature_2m_min[i]), max: Math.round(d.temperature_2m_max[i]), rain: rain == null ? "?" : rain };
      }).filter(Boolean);
      if (!lines.length) return ctx.say("too_far");
      if (lines.length === 1) return ctx.say("day", { ...lines[0], when: ctx.fmt.cap(lines[0].when), place: r.place.name });
      return ctx.say("days", { place: r.place.name, phrase: e.text }) + "\n"
        + lines.map(L => `${ctx.fmt.cap(L.when)}: ${L.sky}, ${L.min} to ${L.max}°C, ${L.rain}% rain`).join("\n");
    });
  },
};
