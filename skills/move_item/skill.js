// Move a file or folder into a folder. -n: never overwrite; the trailing slash: the destination
// must already be a folder, or the command fails instead of renaming. Names are quoted.
// The bin is refused wherever it is named in the sentence, before asking anything.
const BIN = /\b(trash|bin|rubbish|recycle bin|garbage|wastebasket)\b/i;
module.exports = {
  run(ctx) {
    const { source, location } = ctx.slots;
    if (BIN.test(location || "") || (!location && BIN.test(ctx.text))) return ctx.say("no_bin");
    if (!location) return ctx.ask("location", "ask_where");
    const name = ctx.slots.name.replace(/^(the|my) /i, ""); // "the photos" is the folder "photos"
    const from = ctx.files.where(source), to = ctx.files.where(location);
    if (from.path === to.path) return ctx.say("same", { name: "“" + name + "”" });
    ctx.exec("mv -n " + ctx.files.quote(from.path + "/" + name) + " " + ctx.files.quote(to.path + "/"));
    return ctx.say("done", { name: "“" + name + "”", from: source ? " from " + from.label : "", to: to.label });
  },
};
