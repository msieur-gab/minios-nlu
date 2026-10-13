// node test_entities.js   (TZ=Europe/Berlin recommended)
// Fixed reference: Monday 12 October 2026, 20:14.
const E = require("./web/entities.js");
const NOW = new Date(2026, 9, 12, 20, 14);

// [sentence, expected value of the first entity (or null = no entity), expect ambiguous?]
const CASES = [
  // relative periods
  ["remind me next week", "2026-10-19/2026-10-25"],
  ["what's planned for next year", "2027-01-01/2027-12-31"],
  ["this weekend", "2026-10-17/2026-10-18"],
  ["next weekend", "2026-10-17/2026-10-18", true],     // the coming one; next week's is the alternative
  ["next month", "2026-11-01/2026-11-30"],
  ["the week after next", "2026-10-26/2026-11-01"],
  ["in december", "2026-12-01/2026-12-31"],
  ["in 2027", "2027-01-01/2027-12-31"],
  ["end of the month", "2026-10-31"],
  ["by the end of next week", "2026-10-23", true],
  ["beginning of next month", "2026-11-01"],
  // weekdays
  ["next friday", "2026-10-16", true],                  // the coming one; the 23rd is the alternative
  ["this friday", "2026-10-16"],
  ["friday", "2026-10-16"],
  ["on wednesday", "2026-10-14"],
  ["friday next week", "2026-10-23"],
  ["last friday", "2026-10-09"],
  ["next sunday", "2026-10-18", true],
  // relative offsets
  ["in 2 days", "2026-10-14"],
  ["in two days", "2026-10-14"],
  ["in a couple of days", "2026-10-14"],
  ["in 3 weeks", "2026-11-02"],
  ["in a month", "2026-11-12"],
  ["the day after tomorrow", "2026-10-14"],
  ["tomorrow", "2026-10-13"],
  ["in 10 minutes", "2026-10-12T20:24"],
  ["in twenty five minutes", "2026-10-12T20:39"],
  ["in an hour and a half", "2026-10-12T21:44"],
  ["in 2 and a half hours", "2026-10-12T22:44"],
  ["in half an hour", "2026-10-12T20:44"],
  ["2 hours ago", "2026-10-12T18:14"],
  ["3 days from now", "2026-10-15"],
  // absolute dates
  ["on the 20th", "2026-10-20"],
  ["on the 5th", "2026-11-05"],
  ["december 24", "2026-12-24"],
  ["24th of december at 6pm", "2026-12-24T18:00"],
  ["march 3", "2027-03-03"],
  ["20/10", "2026-10-20"],
  ["3/4", "2027-04-03", true],
  ["20.10.2027", "2027-10-20"],
  ["2026-11-02", "2026-11-02"],
  // date + time
  ["next friday at 3pm", "2026-10-16T15:00", true],
  ["next friday at 3", "2026-10-16T15:00", true],
  ["tomorrow at 9", "2026-10-13T09:00", true],
  ["tomorrow at 9am", "2026-10-13T09:00"],
  ["tomorrow morning", "2026-10-13T09:00"],
  ["tomorrow evening at 7", "2026-10-13T19:00"],
  ["remind me in 2 days at 9:30", "2026-10-14T09:30", true],
  ["half past three tomorrow", "2026-10-13T15:30"],
  ["quarter to 11 tonight", "2026-10-12T22:45"],
  ["noon on friday", "2026-10-16T12:00"],
  ["remind me to call mum next tuesday at 18h", "2026-10-13T18:00", true],
  ["at 18:30", "2026-10-13T18:30"],
  ["at 3pm", "2026-10-13T15:00"],
  ["at 9", "2026-10-12T21:00", true],                    // tonight, or tomorrow morning: ask (13 Oct)
  ["at midnight", "2026-10-13T00:00"],
  ["tonight at 8", "2026-10-12T20:00"], // already passed: must come back with past: true
  // durations (timers)
  ["set a timer for 10 minutes", "10 min"],
  ["timer 1h30", "1 h 30 min"],
  ["a 45 second timer", "45 s"],
  ["start a timer for an hour and a half", "1 h 30 min"],
  ["countdown 90 seconds", "90 s"],
  // recurrence
  ["every monday at 9", "FREQ=WEEKLY;BYDAY=MO;BYHOUR=9;BYMINUTE=0", true],
  ["every day at 7am", "FREQ=DAILY;BYHOUR=7;BYMINUTE=0"],
  ["every weekday at 8:15", "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=8;BYMINUTE=15", true],
  ["every other week", "FREQ=WEEKLY;INTERVAL=2"],
  ["every tuesday and thursday at 6pm", "FREQ=WEEKLY;BYDAY=TU,TH;BYHOUR=18;BYMINUTE=0"],
  ["every morning", "FREQ=DAILY;BYHOUR=9;BYMINUTE=0"],
  // holidays, dates counted from other dates, ordinal words (added after comparing with Compromise)
  ["on christmas day", "2026-12-25"],
  ["christmas eve", "2026-12-24"],
  ["new year's eve", "2026-12-31"],
  ["easter", "2027-03-28"],
  ["good friday", "2027-03-26"],
  ["halloween", "2026-10-31"],
  ["three days before christmas", "2026-12-22"],
  ["a week from tomorrow", "2026-10-20"],
  ["two weeks from friday", "2026-10-30"],
  ["2 days after new year", "2027-01-03"],
  ["the first monday of next month", "2026-11-02"],
  ["the last friday of october", "2026-10-30"],
  ["the second tuesday of march", "2027-03-09"],
  ["the last day of the year", "2026-12-31"],
  ["the first day of next month", "2026-11-01"],
  ["tuesday the 20th", "2026-10-20"],
  ["friday the 13th", "2026-11-13"],
  ["on the third of may", "2027-05-03"],
  ["the twenty-first of june", "2027-06-21"],
  ["at half three", "2026-10-13T15:30"],
  ["this time next week", "2026-10-19T20:14"],
  ["in the next 10 minutes", "2026-10-12T20:24"],
  ["by 5 o'clock", "2026-10-13T17:00"],
  ["open the first file", null],
    // must find nothing
  ["make a folder called may notes", null],
  ["I may be late", null],
  ["open the terminal", null],
  ["set the volume to 30", null],
  ["create a file called report 2026", null],
  ["brightness 5", null],
  ["wednesday addams fan club folder", "2026-10-14"], // honest failure case: a word that is also a weekday
];

const valueOf = e => (e.type === "recurrence" ? e.rrule : e.value);
let ok = 0;
const rows = [];
for (const [s, want, wantAmb] of CASES) {
  const ents = E.parse(s, { now: NOW });
  const e = ents[0];
  const got = e ? valueOf(e) : null;
  const pass = got === want && (want === null || !!wantAmb === !!e.ambiguous);
  if (pass) ok++;
  rows.push({ pass, s, got, want, e });
}
for (const r of rows) {
  const e = r.e;
  const extra = e ? [e.ambiguous ? `ambiguous → also ${e.alternatives.join(", ")}` : "", e.past ? "PAST" : "", e.note || "", e.next ? `next: ${e.next}` : ""].filter(Boolean).join(" · ") : "";
  console.log(`${r.pass ? "✓" : "✗"} ${r.s.padEnd(44)} ${String(r.got).padEnd(42)}${r.pass ? "" : " expected " + r.want} ${extra}`);
}
console.log(`\n${ok}/${CASES.length} as expected`);

// speed
const t0 = process.hrtime.bigint();
const N = 20000;
for (let i = 0; i < N; i++) E.parse(CASES[i % CASES.length][0], { now: NOW });
console.log(`${(Number(process.hrtime.bigint() - t0) / 1e3 / N).toFixed(1)} µs per sentence on this machine`);
