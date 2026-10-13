// Pause, resume, next, previous, stop: the control is a list slot (skill.md), found also from
// words like "skip" or "go back"; its output is the player's command.
module.exports = {
  run(ctx) {
    const c = ctx.slots.control;
    ctx.exec("mpc " + c.out);
    return ctx.say("done_" + c.key);
  },
};
