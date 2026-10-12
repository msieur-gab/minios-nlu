// Remember your name and where you live, on this device only.
// The place is looked up once to get its coordinates and time zone, used by weather and time.
module.exports = {
  run(ctx) {
    const { place } = ctx.slots;
    // typed in lowercase on a phone: "gab" → "Gab"
    const name = ctx.slots.name && (ctx.slots.name === ctx.slots.name.toLowerCase()
      ? ctx.slots.name.replace(/(^|[\s-])\p{L}/gu, c => c.toUpperCase()) : ctx.slots.name);
    if (!name && !place) return ctx.say("ask");
    const me = ctx.me.get();
    ctx.me.set({ ...me, ...(name ? { name } : {}), ...(place ? { place: { name: place } } : {}) });
    ctx.log("saved on this device: " + [name && "name", place && "place"].filter(Boolean).join(" and "));
    const said = name ? ctx.say("name", { name }) : "";
    if (!place) return said;
    const both = s => (said + " " + s).trim();
    return ctx.later("place", { place }, async () => {
      ctx.exec("GET geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(place));
      const g = await ctx.geocode(place).catch(() => undefined);
      if (g === undefined) return both(ctx.say("place_offline", { place }));
      if (!g) return both(ctx.say("place_not_found", { place }));
      const cur = ctx.me.get();
      if (cur.place && cur.place.name.toLowerCase() === place.toLowerCase()) ctx.me.set({ ...cur, place: g });
      ctx.log(`${g.name} ${g.lat.toFixed(2)}, ${g.lon.toFixed(2)} · ${g.timezone}`);
      return both(ctx.say("place_found", { place: [g.name, g.region].filter(Boolean).join(", ") }));
    });
  },
};
