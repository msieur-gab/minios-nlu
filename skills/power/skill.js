// Shut down, restart or sleep, after a yes. The commands are in skill.md (## Values: action).
const GUESS = [ // typos and phrasings the model may not tag
  [/reboo?t|rebot|rest?r?a?r?t|restrat|re strt|power cycle|hard reset/i, "reboot"],
  [/sle+p|slepp|suspend|standby|nap|bed\b|rest\b|goodnight/i, "sleep"],
  [/\b(off|of|down|dwn|dw|halt)\b|pwr|plug|juice|kill power|drop power/i, "shutdown"],
];
module.exports = {
  run(ctx) {
    const named = ctx.slots.power_action && ctx.find("action", ctx.slots.power_action);
    const act = named ? named.key : ctx.slots.power_action ? null : (GUESS.find(([re]) => re.test(ctx.text)) || [])[1];
    if (!act) return ctx.ask("power_action", "ask");
    return ctx.confirm(act, ctx.say("confirm_" + act), c => {
      c.exec(c.lookup("action", act));
      return c.say("done_" + act);
    });
  },
};
