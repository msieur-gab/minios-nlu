// Make a folder: the name is quoted before it reaches the command line.
module.exports = {
  run(ctx) {
    const { name, location } = ctx.slots;
    const at = ctx.files.where(location);
    ctx.exec("mkdir -p " + ctx.files.quote(at.path + "/" + name));
    return ctx.say("done", { name: "“" + name + "”", where: at.label });
  },
};
