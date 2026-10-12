// node test_dialogue.js : scripted conversations through the real model + agent, clock fixed at Mon 12 Oct 2026 20:14
const fs = require("fs");
const R = require("./web/runtime.js");
const { Agent } = require("./web/agent.js");
const nlu = new R.NLU(JSON.parse(fs.readFileSync("models/model.json", "utf8")));
const { mockFetch } = require("./tests/fixtures.js");
const store = { d: {}, getItem(k) { return k in this.d ? this.d[k] : null; }, setItem(k, v) { this.d[k] = String(v); }, removeItem(k) { delete this.d[k]; } };
const NOW = new Date(2026, 9, 12, 20, 14);
const agent = new Agent(nlu, store);
agent.clock = () => NOW;
agent.fetch = mockFetch(NOW);
Math.random = () => 0; // first response variant, so the output is stable

const CONVERSATIONS = [
  ["what time is it"],
  ["what's the time in tokyo?"],
  ["what's the date"],
  ["what day is next friday"],
  ["what date is christmas"],
  ["how many days until december 24"],
  ["what day is the 14th"],
  ["is it friday yet"],
  ["what year is it"],
  ["set a timer for 10 minutes"],
  ["timer 1h30"],
  ["start a timer", "25 minutes"],
  ["set a timer for 3pm"],
  ["remind me to call mum next friday at 3pm", "the 16th"],
  ["remind me to call mum next friday at 3pm", "next one"],
  ["remind me to buy milk tomorrow at 9", "morning"],
  ["remind me to water the plants in 2 days"],
  ["remind me in an hour"],
  ["remind me to send the invoice", "next week", "wednesday at 10am"],
  ["remind me to take the bread out tonight at 8", "yes"],
  ["remind me to stretch every weekday at 3pm"],
  ["remind me to back up the photos every monday at 9", "morning"],
  ["set a reminder", "never mind"],
  ["set an alarm for 7am"],
  ["what's on my calendar tomorrow"],
  ["make a folder called Monday in Schedule"],
  ["open firefox"],
  ["launch the thing"],
  ["open an app", "calculator"],
  // memory + API skills (network answers are recorded, see tests/fixtures.js)
  ["what's the weather like", "Munich"],
  ["what do you know about me"],
  ["hi, my name is Gab"],
  ["I live in Munich"],
  ["hello"],
  ["what do you know about me"],
  ["what's the weather like"],
  ["will it rain tomorrow?"],
  ["weather in Lisbon this weekend"],
  ["what's the weather in Tokyo on friday"],
  ["weather in Atlantis"],
  ["what time is it in tokyo"],
  ["what time is it in New York"],
  ["what time is it"],
  ["weather in 3 weeks"],
  ["forget where I live"],
  ["where do I live"],
  ["forget everything about me"],
  ["what's my name"],
  // several commands in one sentence
  ["i live in munich and my name is gab"],
  ["open the terminal and set a timer for 10 minutes"],
  ["open the terminal and the browser"],
  ["set a timer and open firefox", "10 minutes"],
  ["set a timer and open firefox", "cancel"],
  ["create a folder called reports and open the browser"],
  ["make a folder called salt and pepper"],
];
const KEEP_MEMORY = true; // memory persists across these conversations on purpose (like the phone)
(async () => {
for (const conv of CONVERSATIONS) {
  agent.reset();
  for (const t of conv) {
    const out = agent.handle(t);
    if (out.later) { const res = await out.later; out.reply = out.reply + "\n  → " + res.reply.replace(/\n/g, "\n    "); if (res.trace) out.trace.push(...res.trace); }
    const r = out.trace[0].r;
    const ent = out.trace.find(x => x.type === "entity");
    const exec = out.trace.filter(x => x.type === "exec").map(x => x.text).join(" | ");
    console.log(`> ${t}\n  [${r.intent} ${r.confidence.toFixed(2)}${Object.keys(r.slots).length ? " " + JSON.stringify(r.slots) : ""}${ent ? " · " + ent.e.type + " " + (ent.e.value || ent.e.rrule) : ""}]\n  ${out.reply}${exec ? "\n  $ " + exec : ""}`);
  }
  console.log();
}
})();
