// Open a file or folder with its default app. An app name goes to open_app instead.
module.exports = {
  run(ctx) {
    const { name, location, app } = ctx.slots;
    if (app && ctx.findIn("open_app", "app", app)) return ctx.handover("open_app", { app });
    if (!name && !location) {
      const guess = ctx.guess(); // "open the terminal" read as a file: is it an app?
      if (ctx.findIn("open_app", "app", guess)) return ctx.handover("open_app", { app: guess });
      return ctx.ask("name", "ask_name");
    }
    const at = ctx.files.where(location);
    ctx.exec("xdg-open " + ctx.files.quote(name ? at.path + "/" + name : at.path));
    return ctx.say("done", { target: name ? "“" + name + "”" + (location ? " from " + at.label : "") : at.label });
  },
};
