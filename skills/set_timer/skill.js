// Timer: the duration comes from the date parser. A time instead ("timer for 3pm") becomes a reminder.
module.exports = {
  run(ctx) {
    const ents = ctx.entities();
    const dur = ents.find(x => x.type === "duration");
    const at = ents.find(x => x.type === "datetime");
    if (!dur && at) { ctx.used(at); return ctx.handover("set_reminder", {}, ctx.say("is_time")); }
    if (!dur) return ctx.ask("duration", "ask");
    ctx.used(dur);
    const end = new Date(ctx.now.getTime() + dur.seconds * 1000);
    const words = ctx.fmt.durWords(dur.seconds);
    ctx.exec(`systemd-run --user --on-active=${dur.seconds}s notify-send "Timer" "${words} is up"`);
    ctx.arm(end, ctx.say("ring", { dur: words }));
    return ctx.say("done", { dur: words, at: ctx.fmt.clock(end) });
  },
};
