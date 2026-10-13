// Reminders: when comes from the date parser. Ambiguous readings become a choice, a time that has
// passed becomes an offer for tomorrow, a day without a time is 09:00.
function schedule(ctx, task, when, noTime) {
  const { fmt } = ctx, now = ctx.now, what = task ? " to " + task : "";
  if (when.type === "recurrence") {
    const cal = fmt.onCalendar(when.rrule);
    ctx.exec(cal ? `systemd-run --user --on-calendar="${cal}" notify-send "Reminder" "${task || "Reminder"}"` : "# rule " + when.rrule + " (needs a small scheduler, not a single systemd timer)");
    return ctx.say("repeat", { what, rule: fmt.ruleWords(when.rrule), next: when.next ? fmt.whenText(fmt.fromIso(when.next), now) : "soon" });
  }
  const at = fmt.fromIso(when.value);
  if (at < now) { // already passed: offer the same time tomorrow
    const next = new Date(at.getTime());
    while (next < now) next.setDate(next.getDate() + 1);
    const iso = fmt.isoMinute(next);
    ctx.log("time already passed, offering " + iso);
    return ctx.choose(ctx.say("past", { at: fmt.cap(fmt.whenText(at, now)), next: fmt.whenText(next, now) }),
      [{ label: fmt.whenText(next, now), keys: ["tomorrow", "yes"], then: c => schedule(c, task, { type: "datetime", value: iso }) }]);
  }
  ctx.exec(`systemd-run --user --on-calendar="${fmt.isoMinute(at).replace("T", " ")}:00" notify-send "Reminder" "${task || "Reminder"}"`);
  ctx.arm(at, ctx.say("ring", { what: task || "time's up" }));
  return ctx.say("done", { what, at: fmt.whenText(at, now) }) + (noTime ? " " + ctx.say("no_time") : "");
}
// words that pick one of two dates or hours: "the 16th", "next one", "morning"
function keysFor(d, other, fmt) {
  const keys = [];
  if (d.toDateString() !== other.toDateString()) {
    const n = d.getDate(), suf = n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
    keys.push(String(n), n + suf, fmt.MONTHS[d.getMonth()].toLowerCase() + " " + n);
    keys.push(...(d < other ? ["this", "this one", "coming", "this week"] : ["next", "next one", "next week", "later", "the following"]));
  }
  if (d.getHours() !== other.getHours()) {
    const h = d.getHours();
    keys.push(fmt.clock(d), String(h), ...(h < 12 ? ["am", "morning", "a m"] : ["pm", "evening", "afternoon", "night", "tonight", "p m", String(h - 12)]));
  }
  return keys;
}
module.exports = {
  run(ctx) {
    const { fmt } = ctx, now = ctx.now, e = ctx.slots.when; // the core asked for it if it was missing
    let task = ctx.slots.task || null;
    // the task never includes the words the date parser read as the time ("stretch every weekday at 3pm")
    if (task) {
      const at = ctx.text.toLowerCase().indexOf(task.toLowerCase());
      if (at >= 0 && at < e.start && at + task.length > e.start) task = ctx.text.slice(at, e.start).replace(/[\s,]+$/, "") || null;
    }
    if (e.type === "range") return ctx.ask("when", "ask_day", { phrase: fmt.cap(e.text), from: fmt.dayText(fmt.fromIso(e.from), now), to: fmt.dayText(fmt.fromIso(e.to), now) });
    let when = e, noTime = false;
    if (e.type === "date") { // a day without a time
      noTime = true;
      when = { type: "datetime", value: e.value + "T09:00", ambiguous: e.ambiguous, alternatives: (e.alternatives || []).map(a => a + "T09:00") };
    }
    if (!when.ambiguous || !(when.alternatives || []).length) return schedule(ctx, task, when, noTime);
    // two readings: let the person pick
    let options;
    if (when.type === "recurrence") {
      options = [when.time, when.alternatives[0]].map((v, i) => {
        const [h, m] = v.split(":");
        const rule = when.rrule.replace(/BYHOUR=\d+;BYMINUTE=\d+/, "BYHOUR=" + +h + ";BYMINUTE=" + +m);
        return { label: i === 0 ? fmt.ruleWords(rule).trim() : "at " + v,
          keys: +h < 12 ? ["am", "morning", v, String(+h)] : ["pm", "evening", "afternoon", "night", v, String(+h), String(+h - 12)],
          then: c => schedule(c, task, { ...when, rrule: rule, time: v }) };
      });
    } else {
      const vs = [when.value, when.alternatives[0]];
      options = vs.map((v, i) => ({ label: fmt.whenText(fmt.fromIso(v), now), keys: keysFor(fmt.fromIso(v), fmt.fromIso(vs[1 - i]), fmt),
        then: c => schedule(c, task, { type: "datetime", value: v }, noTime) }));
    }
    return ctx.choose(fmt.cap(options[0].label) + ", or " + options[1].label + "?", options);
  },
};
