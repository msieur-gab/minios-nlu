// Dialogue manager + response templates. Actions are simulated: the trace shows the
// shell command the agent would run on the device, nothing is executed.

const THRESHOLD = 0.45;
const ACTIONABLE = new Set(["create_folder", "create_file", "open_app", "open_file",
  "adjust_volume", "adjust_brightness", "system_status", "power",
  "get_time", "get_date", "set_timer", "set_reminder"]);
// Rule-based dates, times and durations (web/entities.js): shared by every time skill, no training.
const ENT = typeof NLUEntities !== "undefined" ? NLUEntities : require("./entities.js");

// Editable response sets. {slot} placeholders are filled at runtime; one variant is picked at random.
const RESPONSES = {
  "create_folder.done": ["Done. {name} is now in {where}.", "Created the folder {name} in {where}.", "Folder {name} created in {where}."],
  "create_folder.ask_name": ["What should I call the folder?", "Sure. What name do you want for the folder?"],
  "create_file.done": ["Created {file} in {where}.", "Done. {file} is in {where}.", "{file} created in {where}."],
  "create_file.default_type": ["You didn't say which type, so I made a plain text file."],
  "create_file.ask_name": ["What should I call the file?", "OK. What's the file name?"],
  "open_app.done": ["Opening the {app}.", "Starting the {app}."],
  "open_app.ask_app": ["Which app? I can open the terminal, browser, file manager, text editor, calculator or settings."],
  "open_app.unknown": ["I don't know an app called “{value}”. I can open the terminal, browser, file manager, text editor, calculator or settings."],
  "open_file.done": ["Opening {target}.", "Here's {target}."],
  "open_file.ask_name": ["Which file or folder should I open?"],
  "volume.ask": ["Up or down? You can also give a level, like 40%."],
  "brightness.ask": ["Brighter or darker? You can also give a level, like 60%."],
  "power.ask": ["Shut down, restart or sleep?"],
  "power.confirm": ["{action_q} Say yes to confirm or no to cancel."],
  "power.done": ["{action_done}"],
  "power.cancel": ["OK, I'll leave it running.", "Cancelled. Nothing changes."],
  "confirm.dropped": ["I'll take that as a no for the {what}."],
  "greet": ["Hi. Tell me what to create or open.", "Hello. I can create folders and files, or open apps."],
  "thanks": ["You're welcome.", "Anytime."],
  "help": ["I can create folders and files, open files and apps, change volume and brightness, check the system (disk, CPU, temperature, memory, network), shut down or restart, tell the time and date, and set timers and reminders. Try “make a folder called drafts in documents”, “remind me to call mum next friday at 3pm” or “timer 10 minutes”."],
  "time.done": ["It's {time}.", "{time}."],
  "time.elsewhere": ["I only know the time here: it's {time}."],
  "date.today": ["Today is {date}.", "It's {date}."],
  "date.other": ["{phrase} is {date}.", "That's {date}."],
  "date.range": ["{phrase} runs from {from} to {to}."],
  "date.until": ["{n} until {date}.", "{date} is in {n}."],
  "date.since": ["{date} was {n} ago."],
  "timer.ask": ["How long? For example “10 minutes” or “1h30”.", "Sure. For how long?"],
  "timer.done": ["Timer set for {dur}. It rings at {at}.", "{dur}, starting now. Done at {at}."],
  "timer.ring": ["⏰ {dur} timer is done."],
  "timer.is_time": ["That's a time rather than a duration, so I set a reminder for {at} instead."],
  "reminder.ask_when": ["When should I remind you?", "OK. When?"],
  "reminder.ask_day": ["{phrase} runs from {from} to {to}. Which day?"],
  "reminder.done": ["I'll remind you{what} {at}.", "Reminder set{what} {at}.", "OK, I'll remind you{what} {at}."],
  "reminder.repeat": ["OK, I'll remind you{what}{rule}. First one {next}."],
  "reminder.no_time": [" You didn't give a time, so I used {t}."],
  "reminder.ring": ["⏰ Reminder: {what}"],
  "choose": ["{q}"],
  "past": ["{at} has already passed. Shall I make it {next}?"],
  "affirm": ["OK. What would you like to do?"],
  "deny": ["OK. There's nothing to cancel."],
  "cancel": ["Cancelled.", "OK, I dropped it."],
  "fallback": ["I didn't understand that. Say help to see what I can do.", "That's outside what I can do. Say help for the list."],
  "learned": ["I recognise this as “{intent}”{got}, but no action is set up for it yet."],
  "empty_value": ["I didn't catch a name. Try again, or say cancel."],
};

const XDG = { desktop: "Desktop", documents: "Documents", downloads: "Downloads", music: "Music",
  pictures: "Pictures", videos: "Videos", templates: "Templates", public: "Public" };
const DEICTIC = /^(here|this (folder|directory|dir)|(the )?current (folder|directory|dir)|cwd|current)$/i;

const TYPE_EXT = { markdown: "md", md: "md", text: "txt", txt: "txt", "plain text": "txt", python: "py", py: "py",
  json: "json", html: "html", csv: "csv", yaml: "yml", yml: "yml", javascript: "js", js: "js", css: "css" };

const APPS = [
  { id: "terminal", label: "terminal", cmd: "x-terminal-emulator", words: ["terminal", "console", "shell", "command line", "cli", "term"] },
  { id: "browser", label: "browser", cmd: "x-www-browser", words: ["browser", "web browser", "internet", "web"] },
  { id: "firefox", label: "Firefox browser", cmd: "firefox", words: ["firefox", "firefox browser"] },
  { id: "chromium", label: "Chromium browser", cmd: "chromium", words: ["chromium", "chrome", "chromium browser", "chrome browser"] },
  { id: "files", label: "file manager", cmd: 'xdg-open "$HOME"', words: ["file manager", "files", "file explorer", "explorer", "finder", "folders"] },
  { id: "editor", label: "text editor", cmd: "mousepad", words: ["text editor", "editor", "notepad", "mousepad"] },
  { id: "calculator", label: "calculator", cmd: "galculator", words: ["calculator", "calc"] },
  { id: "settings", label: "settings", cmd: "xfce4-settings-manager", words: ["settings", "system settings", "preferences", "control panel"] },
];

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const fill = (key, vars = {}) => pick(RESPONSES[key]).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
const cleanValue = v => v.trim().replace(/^["'“”‘’`]+|["'“”‘’`.!?,]+$/g, "").trim();
const shq = p => (/[\s'"$`\\]/.test(p) ? '"' + p.replace(/(["\\`])/g, "\\$1") + '"' : p);

function resolveLocation(raw) {
  if (!raw) return { path: "$HOME", label: "your home folder", kind: "default" };
  const v = cleanValue(raw).replace(/^the\s+/i, "").replace(/\s+(folder|directory|dir)$/i, "");
  const low = v.toLowerCase();
  if (DEICTIC.test(low)) return { path: "$HOME", label: "the current folder", kind: "here" };
  if (low === "home" || low === "~") return { path: "$HOME", label: "your home folder", kind: "home" };
  if (XDG[low]) return { path: "$HOME/" + XDG[low], label: XDG[low], kind: "xdg" };
  return { path: "$HOME/" + v, label: v, kind: "relative" };
}

function resolveApp(raw) {
  const v = cleanValue(raw).toLowerCase().replace(/^(the|my|a|an)\s+/, "").replace(/\s+(app|application|program|window)$/, "");
  return APPS.find(a => a.words.includes(v)) || null;
}


// Direction and level parsing: deterministic layer under the CRF slots
const DIR_WORDS = {
  up: ["up", "increase", "increased", "incrase", "raise", "louder", "higher", "more", "brighter", "brighten",
    "boost", "turn up", "crank"],
  down: ["down", "dwn", "decrease", "decrse", "lower", "quieter", "quietr", "softer", "dimmer", "dimmr", "dim",
    "dimmed", "dimming", "darker", "less", "reduce", "hush"],
  mute: ["mute", "muted", "muting", "mut", "silence", "quiet"],
  unmute: ["unmute", "unmuted", "unmut"],
};
const DIR_PHRASES = [
  [/too (loud|bright|much (noise|light))|deafening|blinding|glare|squint|ears|eyes (are )?hurt|headache|head hurts/i, "down"],
  [/(can'?t|cannot|barely) (hear|see)|too (quiet|low|dark|dim)|barely (audible|visible)|blast/i, "up"],
];
function parseDirection(slot, text) {
  const v = (slot ? cleanValue(slot) : "").toLowerCase();
  for (const [dir, words] of Object.entries(DIR_WORDS)) if (words.includes(v)) return dir;
  for (const [re, dir] of DIR_PHRASES) if (re.test(text)) return dir;
  const low = " " + text.toLowerCase().replace(/[^a-z\s]/g, " ") + " ";
  for (const dir of ["unmute", "mute", "up", "down"]) if (DIR_WORDS[dir].some(w => low.includes(" " + w + " "))) return dir;
  return null;
}
function parseLevel(slot, text) {
  const v = (slot || "").toLowerCase();
  if (/\b(max|maximum|full)\b/.test(v)) return 100;
  if (/\b(min|minimum|zero)\b/.test(v)) return 0;
  if (/\bhalf\b/.test(v)) return 50;
  const m = (v || text).match(/\b(\d{1,3})\s*(%|percent)?/);
  if (m && (slot || m[2])) return Math.max(0, Math.min(100, parseInt(m[1], 10)));
  return null;
}

const METRICS = {
  disk: { words: ["disk", "disk space", "storage", "storage space", "space", "space left", "free space", "sd card", "spc", "drive"], cmd: "df -h /",
    out: "Disk: 9.8 GB free of 29 GB (66% used)." },
  cpu: { words: ["cpu", "cpu usage", "cpu load", "processor", "load", "perf"], cmd: "uptime && top -bn1 | head -3",
    out: "CPU: 11% busy, load 0.42 on 4 cores." },
  temp: { words: ["temperature", "temp", "tmp", "cpu temperature", "heat"], cmd: "cat /sys/class/thermal/thermal_zone0/temp",
    out: "Temperature: 52 °C, well below the 80 °C where the board starts throttling." },
  memory: { words: ["memory", "memry", "mem", "ram", "memory usage"], cmd: "free -h", out: "Memory: 1.3 GB used of 3.8 GB." },
  network: { words: ["network", "net", "wifi", "wi-fi", "ip", "ip addr", "ip address", "internet", "connection"], cmd: "hostname -I && iwgetid -r",
    out: "Network: Wi-Fi connected, IP 192.168.1.42." },
  uptime: { words: ["uptime"], cmd: "uptime -p", out: "Uptime: 3 hours 12 minutes." },
};
function resolveMetrics(slot, text) {
  const v = (slot ? cleanValue(slot) : "").toLowerCase();
  if (v === "performance") return ["cpu", "memory", "temp"];
  for (const [k, m] of Object.entries(METRICS)) if (m.words.includes(v)) return [k];
  if (/hot|overheat|temperature|throttl|burning|fan/i.test(text)) return ["temp"];
  if (/slow|lag|crash|forever/i.test(text)) return ["cpu", "memory", "temp"];
  if (/online|offline|connection|ping/i.test(text)) return ["network"];
  if (/how long.*running|since when/i.test(text)) return ["uptime"];
  if (/space|storage|disk|drive|bytes/i.test(text)) return ["disk"];
  return Object.keys(METRICS);
}

const POWER = {
  shutdown: { words: ["shut down", "shutdown", "shutting down", "power off", "power down", "turn off", "switch off", "halt", "off"], cmd: "sudo systemctl poweroff",
    q: "Shut down the device now?", done: "Shutting down." },
  reboot: { words: ["reboot", "restart"], cmd: "sudo systemctl reboot", q: "Restart the device now?", done: "Restarting." },
  sleep: { words: ["sleep", "suspend", "sleep mode"], cmd: "sudo systemctl suspend", q: "Put the device to sleep now?", done: "Going to sleep." },
};
function resolvePower(slot, text) {
  const v = (slot ? cleanValue(slot) : "").toLowerCase();
  for (const [k, p] of Object.entries(POWER)) if (p.words.includes(v)) return k;
  if (/reboo?t|rebot|rest?r?a?r?t|restrat|re strt|power cycle|hard reset/i.test(text)) return "reboot";
  if (/sle+p|slepp|suspend|standby|nap|bed\b|rest\b|goodnight/i.test(text)) return "sleep";
  if (/\b(off|of|down|dwn|dw|halt)\b|pwr|plug|juice|kill power|drop power/i.test(text)) return "shutdown";
  return null;
}

// ---------- time skills ----------
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_N = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pad2 = n => String(n).padStart(2, "0");
const fromIso = s => { const [d, t] = s.split("T"); const [y, m, dd] = d.split("-").map(Number); const [h, mi] = (t || "0:0").split(":").map(Number); return new Date(y, m - 1, dd, h, mi); };
const clock = d => pad2(d.getHours()) + ":" + pad2(d.getMinutes());
function dayText(d, now) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const k = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - today) / 864e5);
  void k;
  return DAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS_N[d.getMonth()] + (d.getFullYear() !== now.getFullYear() ? " " + d.getFullYear() : "");
}
// "today at 20:30", "tomorrow at 9:00", "on Friday 23 October at 15:00"
function whenText(d, now) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const k = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - today) / 864e5);
  return (k === 0 ? "today" : k === 1 ? "tomorrow" : "on " + dayText(d, now)) + " at " + clock(d);
}
function plural(n, w) { return n + " " + w + (n === 1 ? "" : "s"); }
function durWords(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60, out = [];
  if (h) out.push(plural(h, "hour")); if (m) out.push(plural(m, "minute")); if (s) out.push(plural(s, "second"));
  return out.join(" ") || "0 seconds";
}
const RR_WORD = { MO: "Monday", TU: "Tuesday", WE: "Wednesday", TH: "Thursday", FR: "Friday", SA: "Saturday", SU: "Sunday" };
function ruleWords(rrule) {
  const p = Object.fromEntries(rrule.split(";").map(x => x.split("=")));
  const every = p.INTERVAL ? "every " + (p.INTERVAL === "2" ? "other " : p.INTERVAL + " ") : "every ";
  let what = { DAILY: "day", WEEKLY: "week", MONTHLY: "month", YEARLY: "year", HOURLY: "hour", MINUTELY: "minute" }[p.FREQ];
  if (p.BYDAY) what = p.BYDAY === "MO,TU,WE,TH,FR" ? "weekday" : p.BYDAY.split(",").map(d => RR_WORD[d]).join(" and ");
  if (p.INTERVAL && p.INTERVAL !== "2" && !p.BYDAY) what += "s";
  return " " + every + what + (p.BYHOUR ? " at " + pad2(p.BYHOUR) + ":" + pad2(p.BYMINUTE) : "");
}
function onCalendar(rrule) { // systemd OnCalendar form of simple rules
  const p = Object.fromEntries(rrule.split(";").map(x => x.split("=")));
  if (p.INTERVAL) return null;
  const t = " " + pad2(p.BYHOUR || 9) + ":" + pad2(p.BYMINUTE || 0) + ":00";
  if (p.FREQ === "DAILY") return "*-*-*" + t;
  if (p.FREQ === "WEEKLY" && p.BYDAY) return p.BYDAY.split(",").map(d => RR_WORD[d].slice(0, 3)).join(",") + " *-*-*" + t;
  return null;
}
// "the 16th", "this one", "morning", "yes" → which of the offered options
function pickOption(answer, options) {
  const a = " " + answer.toLowerCase().replace(/[^a-z0-9:]+/g, " ") + " ";
  for (let i = 0; i < options.length; i++) if (options[i].keys.some(k => a.includes(" " + k + " "))) return i;
  if (/ (second|other|latter|2nd|the other one) /.test(a)) return 1;
  if (/ (first|former|1st) /.test(a) || YES_RE.test(answer.trim())) return 0;
  return -1;
}
function optionKeys(d, other, now) {
  const keys = [];
  if (d.toDateString() !== other.toDateString()) {
    const n = d.getDate(), suf = n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
    keys.push(String(n), n + suf, MONTHS_N[d.getMonth()].toLowerCase() + " " + n);
    keys.push(...(d < other ? ["this", "this one", "coming", "this week"] : ["next", "next one", "next week", "later", "the following"]));
  }
  if (d.getHours() !== other.getHours()) {
    const h = d.getHours();
    keys.push(clock(d), String(h));
    keys.push(...(h < 12 ? ["am", "morning", "a m"] : ["pm", "evening", "afternoon", "night", "tonight", "p m", String(h - 12)]));
  }
  return keys;
}

const YES_RE = /^(y|yes|yeah|yep|yup|sure|ok|okay|confirm|do it|go|go ahead|please do|absolutely|of course)\b/i;
const NO_RE = /^(n|no|nope|nah|nvm|cancel|stop|don'?t|never ?mind|abort|not now)\b/i;
const stripVerb = t => t.replace(/^(please\s+)?((can|could|would) you\s+)?/i, "")
  .replace(/^(open|launch|start|run|bring up|fire up|show( me)?|give me|get me|pull up|display|view)\s+(up\s+)?/i, "")
  .replace(/\s+(please|for me)\s*\??$/i, "");

class Agent {
  constructor(nlu) { this.nlu = nlu; this.reset(); }

  reset() {
    this.pending = null; this.volume = 50; this.muted = false; this.brightness = 80;
    for (const t of this.timers || []) clearTimeout(t);
    this.timers = []; this.scheduled = [];
  }
  now() { return this.clock ? this.clock() : new Date(); }
  // In the PWA, timers and short reminders really ring while the page is open (onAlert renders the message).
  arm(at, message) {
    const ms = at - this.now();
    if (this.onAlert && ms > 0 && ms < 2 ** 31 - 1) this.timers.push(setTimeout(() => this.onAlert(message), ms));
  }

  handle(text) {
    const trace = [];
    this.lastText = text;
    const r = this.nlu.parse(text);
    trace.push({ type: "nlu", r });

    if (this.pending && this.pending.type === "confirm") {
      const p = this.pending;
      this.pending = null;
      const t = text.trim();
      const yes = YES_RE.test(t) || (r.intent === "affirm" && r.confidence >= 0.5);
      const no = NO_RE.test(t) || (r.intent === "deny" && r.confidence >= 0.5);
      if (yes && !no) {
        trace.push({ type: "state", text: "confirmed " + p.what });
        trace.push({ type: "exec", text: p.cmd });
        return { trace, reply: p.done };
      }
      if (no) {
        trace.push({ type: "state", text: "declined " + p.what });
        return { trace, reply: fill("power.cancel") };
      }
      trace.push({ type: "state", text: "no clear yes, dropped " + p.what + " and read this as a new command" });
    }

    if (this.pending && this.pending.type === "choose") {
      const p = this.pending;
      this.pending = null;
      const i = NO_RE.test(text.trim()) ? -2 : pickOption(text, p.options);
      if (i >= 0) {
        trace.push({ type: "state", text: "picked “" + p.options[i].label + "”" });
        return this.schedule(p.task, p.options[i].when, trace, p.noteNoTime);
      }
      if (i === -2) { trace.push({ type: "state", text: "declined, nothing scheduled" }); return { trace, reply: fill("cancel") }; }
      trace.push({ type: "state", text: "answer matched no option, read it as a new command" });
    }

    if (this.pending) {
      const p = this.pending;
      if ((r.intent === "deny" && r.confidence >= 0.5) || NO_RE.test(text.trim())) {
        this.pending = null;
        trace.push({ type: "state", text: "cancelled pending " + p.intent });
        return { trace, reply: fill("cancel") };
      }
      if (r.intent === p.intent && r.slots[p.need]) {
        trace.push({ type: "state", text: "same intent with " + p.need + ", merged into pending " + p.intent });
        this.pending = null;
        return this.run(p.intent, { ...p.slots, ...r.slots }, trace);
      }
      if (r.intent === "out_of_scope" && r.confidence >= 0.55 && text.trim().split(/\s+/).length >= 4) {
        trace.push({ type: "state", text: "off-topic sentence, dropped pending " + p.intent });
        this.pending = null;
      } else if (ACTIONABLE.has(r.intent) && r.confidence >= 0.8 && Object.keys(r.slots).length) {
        trace.push({ type: "state", text: "new command, dropped pending " + p.intent });
        this.pending = null;
      } else {
        let answer = text;
        const extra = {};
        if (r.slots.location && p.need === "name") {
          const idx = text.lastIndexOf(r.slots.location);
          answer = text.slice(0, idx).replace(/\s+(in|inside|on|under|within|to)(\s+(the|my))?\s*$/i, "");
          extra.location = r.slots.location;
        }
        const value = cleanValue(answer.replace(/^(please\s+)?(call it|name it|let'?s call it|it'?s|it is|its|name|called|named|use|make it|open|launch|start|run|fire up)\s+/i, ""));
        if (!value) {
          trace.push({ type: "state", text: "still waiting for " + p.need });
          return { trace, reply: fill("empty_value") };
        }
        if (p.need === "direction") {
          trace.push({ type: "state", text: "reading the answer as a direction or level" });
          this.pending = null;
          return this.run(p.intent, { ...p.slots, direction: value, level: parseLevel(null, value) !== null ? value : undefined }, trace);
        }
        if (p.need === "power_action") {
          this.pending = null;
          return this.run(p.intent, { power_action: value }, trace);
        }
        trace.push({ type: "state", text: "filled " + p.need + " ← “" + value + "” (raw answer)" });
        this.pending = null;
        return this.run(p.intent, { ...p.slots, ...extra, [p.need]: value }, trace);
      }
    }

    if (r.intent !== "open_app" && r.slots.app && resolveApp(r.slots.app)
        && /^(please\s+)?((can|could|would) you\s+)?(open|launch|start|run|fire up|bring up)\b/i.test(text)) {
      trace.push({ type: "state", text: "“" + cleanValue(r.slots.app) + "” is a known app, routing to open_app" });
      return this.run("open_app", { app: r.slots.app }, trace);
    }
    if (r.confidence < THRESHOLD) {
      trace.push({ type: "abstain", text: "confidence " + r.confidence.toFixed(2) + " < " + THRESHOLD + ", abstaining" });
      return { trace, reply: fill("fallback"), unknown: true };
    }
    if (r.intent === "out_of_scope") {
      trace.push({ type: "abstain", text: "out of scope, no action" });
      return { trace, reply: fill("fallback"), unknown: true };
    }
    if (!ACTIONABLE.has(r.intent)) {
      if (RESPONSES[r.intent]) return { trace, reply: fill(r.intent) };
      // a skill taught through the inbox: recognised, but nothing is wired to it yet
      const got = Object.entries(r.slots).map(([k, v]) => k + " “" + cleanValue(v) + "”").join(", ");
      trace.push({ type: "state", text: "learned skill " + r.intent + ", no action bound" });
      return { trace, reply: fill("learned", { intent: r.intent.replace(/_/g, " "), got: got ? " (" + got + ")" : "" }) };
    }
    return this.run(r.intent, r.slots, trace);
  }

  ask(intent, slots, need, key, trace) {
    this.pending = { intent, slots, need };
    trace.push({ type: "state", text: "missing " + need + ", waiting for answer" });
    return { trace, reply: fill(key) };
  }

  run(intent, slots, trace) {
    if (intent === "create_folder") {
      if (!slots.name) return this.ask(intent, slots, "name", "create_folder.ask_name", trace);
      const name = cleanValue(slots.name);
      const loc = resolveLocation(slots.location);
      trace.push({ type: "exec", text: "mkdir -p " + shq(loc.path + "/" + name) });
      return { trace, reply: fill("create_folder.done", { name: "“" + name + "”", where: loc.label }) };
    }
    if (intent === "create_file") {
      if (!slots.name) return this.ask(intent, slots, "name", "create_file.ask_name", trace);
      let name = cleanValue(slots.name);
      let note = "";
      if (!/\.[A-Za-z0-9]{1,5}$/.test(name)) {
        const ext = slots.file_type && TYPE_EXT[cleanValue(slots.file_type).toLowerCase()];
        if (ext) name += "." + ext;
        else { name += ".txt"; note = " " + fill("create_file.default_type"); }
      }
      const loc = resolveLocation(slots.location);
      const path = loc.path + "/" + name;
      trace.push({ type: "exec", text: "mkdir -p " + shq(loc.path) + " && touch " + shq(path) });
      return { trace, reply: fill("create_file.done", { file: "“" + name + "”", where: loc.label }) + note };
    }
    if (intent === "open_app") {
      if (!slots.app) {
        // Deterministic fallback: look up the words after the verb in the app dictionary
        const guess = this.lastText.replace(/^(please\s+)?(can|could|would) you\s+/i, "")
          .replace(/^(please\s+)?(open|launch|start|run|bring up|fire up|show|give me|get me)\s+(up\s+)?/i, "")
          .replace(/\s+(please|for me)\s*\??$/i, "");
        if (resolveApp(guess)) {
          trace.push({ type: "state", text: "app filled from dictionary ← “" + cleanValue(guess) + "”" });
          slots = { ...slots, app: guess };
        } else return this.ask(intent, slots, "app", "open_app.ask_app", trace);
      }
      const app = resolveApp(slots.app);
      if (!app) {
        trace.push({ type: "abstain", text: "no app matches “" + cleanValue(slots.app) + "”" });
        return { trace, reply: fill("open_app.unknown", { value: cleanValue(slots.app) }) };
      }
      trace.push({ type: "exec", text: app.cmd + " &" });
      return { trace, reply: fill("open_app.done", { app: app.label }) };
    }

    if (intent === "open_file") {
      let name = slots.name && cleanValue(slots.name);
      if (!name && !slots.location) {
        const guess = stripVerb(this.lastText);
        if (resolveApp(guess)) {
          trace.push({ type: "state", text: "“" + cleanValue(guess) + "” is an app, routing to open_app" });
          return this.run("open_app", { app: guess }, trace);
        }
        return this.ask(intent, slots, "name", "open_file.ask_name", trace);
      }
      const loc = resolveLocation(slots.location);
      const path = name ? loc.path + "/" + name : loc.path;
      trace.push({ type: "exec", text: "xdg-open " + shq(path) });
      const target = name ? "“" + name + "”" + (slots.location ? " from " + loc.label : "") : loc.label;
      return { trace, reply: fill("open_file.done", { target }) };
    }
    if (intent === "adjust_volume" || intent === "adjust_brightness") {
      const vol = intent === "adjust_volume";
      const text = this.lastText;
      let dir = parseDirection(slots.direction, slots.direction ? "" : text);
      const level = parseLevel(slots.level, slots.level ? "" : (slots.direction || text));
      if (dir === null && level === null) {
        return this.ask(intent, slots, "direction", vol ? "volume.ask" : "brightness.ask", trace);
      }
      if (!vol && (dir === "mute" || dir === "unmute")) dir = dir === "mute" ? "down" : "up";
      const key = vol ? "volume" : "brightness";
      let reply, cmd;
      if (vol && dir === "mute") {
        this.muted = true; cmd = "pactl set-sink-mute @DEFAULT_SINK@ 1"; reply = "Sound muted.";
      } else if (vol && dir === "unmute") {
        this.muted = false; cmd = "pactl set-sink-mute @DEFAULT_SINK@ 0"; reply = "Sound back on, at " + this.volume + "%.";
      } else {
        const before = this[key];
        this[key] = level !== null ? level : Math.max(0, Math.min(100, before + (dir === "down" ? -10 : 10)));
        if (vol) this.muted = false;
        const arg = level !== null ? this[key] + "%" : (dir === "down" ? "-10%" : "+10%");
        cmd = vol ? "pactl set-sink-volume @DEFAULT_SINK@ " + arg : "brightnessctl set " + (level !== null ? arg : arg.replace(/^([+-])(.*)$/, "$2$1"));
        const verb = level !== null ? "set to" : this[key] > before ? "up to" : this[key] < before ? "down to" : "already at";
        reply = (vol ? "Volume " : "Brightness ") + verb + " " + this[key] + "%.";
      }
      trace.push({ type: "state", text: key + ": " + (dir || "level") + (level !== null ? " → " + level + "%" : "") });
      trace.push({ type: "exec", text: cmd });
      return { trace, reply };
    }
    if (intent === "system_status") {
      const keys = resolveMetrics(slots.metric, this.lastText);
      for (const k of keys) trace.push({ type: "exec", text: METRICS[k].cmd });
      const lines = keys.map(k => METRICS[k].out);
      return { trace, reply: (keys.length > 2 ? "System overview (simulated values):\n" : "(Simulated) ") + lines.join("\n") };
    }
    if (intent === "power") {
      const act = resolvePower(slots.power_action, slots.power_action ? "" : this.lastText);
      if (!act) return this.ask(intent, slots, "power_action", "power.ask", trace);
      const P = POWER[act];
      this.pending = { type: "confirm", intent, what: act, cmd: P.cmd, done: P.done };
      trace.push({ type: "state", text: "risky action (" + act + "), waiting for confirmation" });
      return { trace, reply: fill("power.confirm", { action_q: P.q }) };
    }
    if (intent === "get_time") {
      const now = this.now();
      const elsewhere = /\bin\s+(?!the\b)([a-z][a-z .'-]+)\??$/i.exec(this.lastText);
      trace.push({ type: "exec", text: "date +%H:%M" });
      return { trace, reply: fill(elsewhere ? "time.elsewhere" : "time.done", { time: clock(now) }) };
    }
    if (intent === "get_date") {
      const now = this.now(), text = this.lastText;
      const e = ENT.parse(text, { now }).find(x => x.type === "date" || x.type === "datetime" || x.type === "range");
      if (e) trace.push({ type: "entity", e });
      if (/what (month|year)/i.test(text) && !e) {
        const year = /year/i.test(text);
        return { trace, reply: year ? "It's " + now.getFullYear() + "." : "It's " + MONTHS_N[now.getMonth()] + " " + now.getFullYear() + "." };
      }
      const unknown = /\b(?:is|until|till|before)\s+(?!it\b|today\b|we\b)([a-z][a-z' -]*?)\s*\??$/i.exec(text);
      if (!e && unknown) {
        trace.push({ type: "abstain", text: "no date found in “" + unknown[1] + "”" });
        return { trace, reply: "I don't know which date “" + unknown[1] + "” is. Try a date like “december 25” or “next friday”." };
      }
      if (!e) return { trace, reply: fill("date.today", { date: dayText(now, now) }) };
      if (e.type === "range") return { trace, reply: fill("date.range", { phrase: cap(e.text), from: dayText(fromIso(e.from), now), to: dayText(fromIso(e.to), now) }) };
      const d = fromIso(e.value);
      const day0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const k = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - day0) / 864e5);
      let reply;
      if (/how (many days|long)|until|till|before/i.test(text)) reply = k >= 0 ? fill("date.until", { n: plural(k, "day"), date: dayText(d, now) }) : fill("date.since", { n: plural(-k, "day"), date: dayText(d, now) });
      else if (/^(is (it|today))\b/i.test(text.trim())) reply = (k === 0 ? "Yes, " : "No, ") + "today is " + dayText(now, now) + ".";
      else reply = fill("date.other", { phrase: cap(e.text), date: dayText(d, now) });
      if (e.ambiguous && e.alternatives.length) reply += " If you meant the other one, that's " + dayText(fromIso(e.alternatives[0].split("/")[0]), now) + ".";
      return { trace, reply };
    }
    if (intent === "set_timer") {
      const now = this.now();
      const ents = ENT.parse(this.lastText, { now });
      const dur = ents.find(x => x.type === "duration");
      const at = ents.find(x => x.type === "datetime");
      if (!dur && at) { // "timer for 3pm" → it's a time
        trace.push({ type: "entity", e: at });
        const r2 = this.schedule(null, at, trace);
        return { trace, reply: fill("timer.is_time", { at: whenText(fromIso(at.value), now) }) + (r2.reply.startsWith("I'll") ? "" : " " + r2.reply) };
      }
      if (!dur) return this.ask(intent, slots, "duration", "timer.ask", trace);
      trace.push({ type: "entity", e: dur });
      const end = new Date(now.getTime() + dur.seconds * 1000);
      trace.push({ type: "exec", text: `systemd-run --user --on-active=${dur.seconds}s notify-send "Timer" "${durWords(dur.seconds)} is up"` });
      this.scheduled.push({ kind: "timer", at: end, seconds: dur.seconds });
      this.arm(end, fill("timer.ring", { dur: durWords(dur.seconds) }));
      return { trace, reply: fill("timer.done", { dur: durWords(dur.seconds), at: clock(end) }) };
    }
    if (intent === "set_reminder") {
      const now = this.now();
      const task = slots.task ? cleanValue(slots.task) : null;
      const ents = ENT.parse(this.lastText, { now }).filter(x => x.type !== "duration");
      const e = ents.find(x => x.type === "datetime" || x.type === "recurrence") || ents.find(x => x.type === "date" || x.type === "range");
      if (!e) return this.ask(intent, { ...slots }, "when", "reminder.ask_when", trace);
      trace.push({ type: "entity", e });
      if (e.type === "range") {
        this.pending = { intent, slots, need: "when" };
        trace.push({ type: "state", text: "a whole " + e.grain + ", waiting for a day" });
        return { trace, reply: fill("reminder.ask_day", { phrase: cap(e.text), from: dayText(fromIso(e.from), now), to: dayText(fromIso(e.to), now) }) };
      }
      let when = e, noTime = false;
      if (e.type === "date") { // a day without a time: 9:00, and say so
        noTime = true;
        const d = fromIso(e.value);
        const mk = iso => ({ type: "datetime", value: iso + "T09:00" });
        when = { ...mk(e.value), alternatives: (e.alternatives || []).map(a => a + "T09:00"), ambiguous: e.ambiguous,
          past: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9) < now };
      }
      if (when.ambiguous && when.alternatives && when.alternatives.length) {
        const opts = [when.type === "recurrence" ? when.time : when.value, when.alternatives[0]].map((v, i, arr) => {
          if (when.type === "recurrence") {
            const [h, m] = v.split(":");
            const rr = when.rrule.replace(/BYHOUR=\d+;BYMINUTE=\d+/, "BYHOUR=" + +h + ";BYMINUTE=" + +m);
            const keys = +h < 12 ? ["am", "morning", v, String(+h)] : ["pm", "evening", "afternoon", "night", v, String(+h), String(+h - 12)];
            return { label: i === 0 ? ruleWords(rr).trim() : "at " + v, keys, when: { ...when, rrule: rr, time: v, ambiguous: false } };
          }
          const d = fromIso(v), o = fromIso(arr[1 - i]);
          return { label: whenText(d, now), keys: optionKeys(d, o, now), when: { type: "datetime", value: v } };
        });
        this.pending = { type: "choose", intent, task, options: opts, need: "choice", noteNoTime: noTime };
        trace.push({ type: "state", text: "ambiguous, asking: " + opts.map(o => o.label).join(" / ") });
        return { trace, reply: fill("choose", { q: cap(opts[0].label) + ", or " + opts[1].label + "?" }) };
      }
      return this.schedule(task, when, trace, noTime);
    }
    return { trace, reply: fill("fallback") };
  }

  schedule(task, when, trace, noTime) {
    const now = this.now();
    const what = task || "";
    if (when.type === "recurrence") {
      const cal = onCalendar(when.rrule);
      trace.push({ type: "exec", text: cal ? `systemd-run --user --on-calendar="${cal}" notify-send "Reminder" "${what || "Reminder"}"` : "# rule " + when.rrule + " (needs a small scheduler, not a single systemd timer)" });
      this.scheduled.push({ kind: "reminder", rrule: when.rrule, what });
      return { trace, reply: fill("reminder.repeat", { what: what ? " to " + what : "", rule: ruleWords(when.rrule), next: when.next ? whenText(fromIso(when.next), now) : "soon" }) };
    }
    const at = fromIso(when.value);
    if (at < now) { // already passed: offer the same time tomorrow
      const next = new Date(at.getTime());
      while (next < now) next.setDate(next.getDate() + 1);
      const iso = next.getFullYear() + "-" + pad2(next.getMonth() + 1) + "-" + pad2(next.getDate()) + "T" + clock(next);
      this.pending = { type: "choose", intent: "set_reminder", task, need: "choice",
        options: [{ label: whenText(next, now), keys: ["tomorrow", "yes"], when: { type: "datetime", value: iso } }] };
      trace.push({ type: "state", text: "time already passed, offering " + iso });
      return { trace, reply: fill("past", { at: cap(whenText(at, now)), next: whenText(next, now) }) };
    }
    const stamp = at.getFullYear() + "-" + pad2(at.getMonth() + 1) + "-" + pad2(at.getDate()) + " " + clock(at) + ":00";
    trace.push({ type: "exec", text: `systemd-run --user --on-calendar="${stamp}" notify-send "Reminder" "${what || "Reminder"}"` });
    this.scheduled.push({ kind: "reminder", at, what });
    this.arm(at, fill("reminder.ring", { what: what || "time's up" }));
    return { trace, reply: fill("reminder.done", { what: what ? " to " + what : "", at: whenText(at, now) }) + (noTime ? fill("reminder.no_time", { t: "09:00" }) : "") };
  }
}
if (typeof module !== "undefined") module.exports = { Agent };
