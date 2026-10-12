// Today's date, the date of a day ("next friday"), days until a date.
module.exports = {
  run(ctx) {
    const { fmt } = ctx, now = ctx.now, text = ctx.text;
    const e = ctx.entities().find(x => x.type === "date" || x.type === "datetime" || x.type === "range");
    if (e) ctx.used(e);
    if (!e && /what (month|year)/i.test(text))
      return /year/i.test(text) ? ctx.say("year", { year: now.getFullYear() }) : ctx.say("month", { month: fmt.MONTHS[now.getMonth()] + " " + now.getFullYear() });
    const unknown = /\b(?:is|until|till|before)\s+(?!it\b|today\b|we\b)([a-z][a-z' -]*?)\s*\??$/i.exec(text);
    if (!e && unknown) { ctx.log("no date found in “" + unknown[1] + "”", "abstain"); return ctx.say("unknown", { what: unknown[1] }); }
    if (!e) return ctx.say("today", { date: fmt.dayText(now, now) });
    if (e.type === "range") return ctx.say("range", { phrase: fmt.cap(e.text), from: fmt.dayText(fmt.fromIso(e.from), now), to: fmt.dayText(fmt.fromIso(e.to), now) });
    const d = fmt.fromIso(e.value), k = fmt.daysApart(d, now), date = fmt.dayText(d, now);
    let reply;
    if (/how (many days|long)|until|till|before/i.test(text)) reply = k >= 0 ? ctx.say("until", { n: fmt.plural(k, "day"), date }) : ctx.say("since", { n: fmt.plural(-k, "day"), date });
    else if (/^(is (it|today))\b/i.test(text.trim())) reply = ctx.say(k === 0 ? "is_today" : "not_today", { date: fmt.dayText(now, now) });
    else reply = ctx.say("other", { phrase: fmt.cap(e.text), date });
    if (e.ambiguous && e.alternatives.length) reply += " " + ctx.say("other_one", { date: fmt.dayText(fmt.fromIso(e.alternatives[0].split("/")[0]), now) });
    return reply;
  },
};
