// node test_dialogue.js : scripted conversations through the real model + agent, clock fixed at Mon 12 Oct 2026 20:14
const fs = require("fs");
const R = require("./web/runtime.js");
const { Agent } = require("./web/agent.js");
const nlu = new R.NLU(JSON.parse(fs.readFileSync("models/model.json", "utf8")));
const agent = new Agent(nlu);
agent.clock = () => new Date(2026, 9, 12, 20, 14);
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
];
for (const conv of CONVERSATIONS) {
  agent.reset();
  for (const t of conv) {
    const out = agent.handle(t);
    const r = out.trace[0].r;
    const ent = out.trace.find(x => x.type === "entity");
    const exec = out.trace.filter(x => x.type === "exec").map(x => x.text).join(" | ");
    console.log(`> ${t}\n  [${r.intent} ${r.confidence.toFixed(2)}${Object.keys(r.slots).length ? " " + JSON.stringify(r.slots) : ""}${ent ? " · " + ent.e.type + " " + (ent.e.value || ent.e.rrule) : ""}]\n  ${out.reply}${exec ? "\n  $ " + exec : ""}`);
  }
  console.log();
}
