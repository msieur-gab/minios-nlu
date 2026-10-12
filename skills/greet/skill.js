// Hello, by name when the agent knows it.
module.exports = { run: ctx => (ctx.me.get().name ? ctx.say("named", { name: ctx.me.get().name }) : ctx.say("say")) };
