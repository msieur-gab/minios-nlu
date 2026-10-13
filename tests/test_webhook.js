// node tests/test_webhook.js : the reference webhook (tools/webhook.js) on recorded answers, no network
const assert = require("assert");
const { route, agenda, events } = require("../tools/webhook.js");

const PLACES = { munich: [48.137, 11.575, "Munich"], salzburg: [47.799, 13.044, "Salzburg"] };
const fake = async url => {
  const u = new URL(url);
  if (u.hostname.startsWith("geocoding")) {
    const p = PLACES[u.searchParams.get("name").toLowerCase()];
    return { json: async () => ({ results: p ? [{ latitude: p[0], longitude: p[1], name: p[2] }] : undefined }) };
  }
  if (u.hostname === "routing.openstreetmap.de")
    return { json: async () => ({ routes: [{ duration: u.pathname.includes("bike") ? 30000 : 5400, distance: 142400 }] }) };
  if (u.hostname === "cal.test") return { text: async () => ICS };
  throw new Error("unexpected " + url);
};
const ICS = [
  "BEGIN:VCALENDAR",
  "BEGIN:VEVENT", "DTSTART:20261013T070000Z", "SUMMARY:Dentist", "END:VEVENT",
  "BEGIN:VEVENT", "DTSTART;TZID=Europe/Berlin:20261013T140000", "SUMMARY:Call with the bank\\, about", "  the loan", "END:VEVENT",
  "BEGIN:VEVENT", "DTSTART;VALUE=DATE:20261017", "SUMMARY:Market", "END:VEVENT",
  "BEGIN:VEVENT", "DTSTART:20261013T180000", "RRULE:FREQ=WEEKLY", "SUMMARY:Yoga", "END:VEVENT",
  "END:VCALENDAR"].join("\r\n");

(async () => {
  let n = 0;
  const eq = async (got, want) => { assert.deepStrictEqual(await got, want); n++; };
  await eq(route({ from: "Munich", to: "Salzburg", mode: "car" }, fake), { say: "Munich to Salzburg: 1 h 30 min by car, 142 km." });
  await eq(route({ from: "Munich", to: "Salzburg", mode: "bike" }, fake), { say: "Munich to Salzburg: 8 h 20 min by bike, 142 km." });
  await eq(route({ from: "Munich", to: "Salzburg", mode: "" }, fake), { say: "Munich to Salzburg: 1 h 30 min by car, 142 km." });
  await eq(route({ from: "Munich", to: "Atlantis" }, fake), {});

  assert.strictEqual(events(ICS).length, 3); n++; // the repeating one is left out
  process.env.ICS_URL = "https://cal.test/basic.ics";
  const now = new Date(2026, 9, 12, 20, 14);
  await eq(agenda({ when: "2026-10-13" }, fake, now), { say: "Two things tomorrow: Dentist at 09:00, Call with the bank, about the loan at 14:00." });
  await eq(agenda({ when: "2026-10-17/2026-10-18" }, fake, now), { say: "One thing then: Market (Saturday 17 October)." });
  await eq(agenda({ when: "" }, fake, now), { say: "Nothing in your calendar today." });
  console.log(`${n}/${n} webhook checks as expected`);
})().catch(err => { console.error(err.message); process.exit(1); });
