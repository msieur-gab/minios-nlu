// Shut down, restart or sleep, after a yes. The action is a list slot (skill.md): the core finds it,
// also from words like "rebot" or "goodnight", and asks when there's none.
module.exports = {
  run(ctx) {
    const act = ctx.slots.power_action.key;
    return ctx.confirm(act, ctx.say("confirm_" + act), c => {
      c.exec(c.lookup("action", act));
      return c.say("done_" + act);
    });
  },
};
