// Play music: with a name, look it up and play it; without one, just play.
// The name is everything after "play …": the model often marks only names it has seen, so the
// usual sentence shapes are read here and the model's own marking is the fallback.
const SHAPE = /^(?:please\s+)?(?:(?:can|could|would) you\s+)?(?:(?:i want to|i would like to|i'd like to|let me)\s+)?(?:play(?: me)?|put on|listen to|hear)\s+(?:the (?:song|track|album)\s+|(?:something|some music|a song|songs|anything) (?:by|from)\s+|my\s+)?(.+?)(?:\s+please)?\s*\??$/i;
const NO_NAME = /^(some |any |a |the |my |more )?(music|songs?|tunes?|something|anything|it)( on)?$/i; // "some music", "a song"
module.exports = {
  run(ctx) {
    const said = SHAPE.exec(ctx.text.trim());
    const q = ((said && said[1]) || ctx.slots.query || "").trim();
    if (!q || NO_NAME.test(q)) {
      ctx.exec("mpc play");
      return ctx.say("any");
    }
    ctx.exec("mpc searchplay any " + ctx.files.quote(q));
    return ctx.say("track", { query: "“" + q + "”" });
  },
};
