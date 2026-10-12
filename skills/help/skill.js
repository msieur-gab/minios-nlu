// What the agent can do: the "help" line of every skill's front matter, without its example.
module.exports = {
  run(ctx) {
    const list = ctx.skills().map(h => h.replace(/\s*\(.*?\)\s*$/, ""));
    return ctx.say("say", { list: list.slice(0, -1).join(", ") + " and " + list[list.length - 1] }) + " " + ctx.say("try");
  },
};
