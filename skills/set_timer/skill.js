// Timer: the duration comes from the date parser. A time instead ("timer for 3pm") becomes a reminder.
module.exports = {
  run(ctx) {
    const dur = ctx.slots.duration;
    // not required in skill.md: a time instead of a duration goes to reminders before anyone asks
    if (!dur && ctx.entities().some(x => x.type === "datetime")) return ctx.handover("set_reminder", {}, ctx.say("is_time"));
    if (!dur) return ctx.ask("duration", "ask");
    const end = new Date(ctx.now.getTime() + dur.seconds * 1000);
    const words = ctx.fmt.durWords(dur.seconds);
    ctx.exec(`systemd-run --user --on-active=${dur.seconds}s notify-send Timer ${ctx.files.quote(words + " is up")}`);
    ctx.arm(end, ctx.say("ring", { dur: words }));
    return ctx.say("done", { dur: words, at: ctx.fmt.clock(end) });
  },
};
