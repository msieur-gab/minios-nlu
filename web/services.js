// Shared services that skills reach through ctx: date and time wording, folder paths, repeat rules.
// No dialogue here (web/agent.js) and no skill logic (skills/<name>/skill.js).
const NLUServices = (() => {
  // ---------- dates and times, in words ----------
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const pad2 = n => String(n).padStart(2, "0");
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");
  const day0 = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const daysApart = (a, b) => Math.round((day0(a) - day0(b)) / 864e5);
  // "2026-10-23T15:00" → local Date
  const fromIso = s => { const [d, t] = s.split("T"); const [y, m, dd] = d.split("-").map(Number); const [h, mi] = (t || "0:0").split(":").map(Number); return new Date(y, m - 1, dd, h, mi); };
  const isoMinute = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const clock = d => pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  // "Friday 23 October" (+ the year when it isn't this year)
  const dayText = (d, now) => DAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()] + (d.getFullYear() !== now.getFullYear() ? " " + d.getFullYear() : "");
  // "today at 20:30", "tomorrow at 09:00", "on Friday 23 October at 15:00"
  const whenText = (d, now) => { const k = daysApart(d, now); return (k === 0 ? "today" : k === 1 ? "tomorrow" : "on " + dayText(d, now)) + " at " + clock(d); };
  const durWords = sec => {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60, out = [];
    if (h) out.push(plural(h, "hour")); if (m) out.push(plural(m, "minute")); if (s) out.push(plural(s, "second"));
    return out.join(" ") || "0 seconds";
  };

  // ---------- repeating rules (RRULE from the date parser) ----------
  const RR_WORD = { MO: "Monday", TU: "Tuesday", WE: "Wednesday", TH: "Thursday", FR: "Friday", SA: "Saturday", SU: "Sunday" };
  const ruleParts = rrule => Object.fromEntries(rrule.split(";").map(x => x.split("=")));
  // " every weekday at 08:15"
  function ruleWords(rrule) {
    const p = ruleParts(rrule);
    const every = p.INTERVAL ? "every " + (p.INTERVAL === "2" ? "other " : p.INTERVAL + " ") : "every ";
    let what = { DAILY: "day", WEEKLY: "week", MONTHLY: "month", YEARLY: "year", HOURLY: "hour", MINUTELY: "minute" }[p.FREQ];
    if (p.BYDAY) what = p.BYDAY === "MO,TU,WE,TH,FR" ? "weekday" : p.BYDAY.split(",").map(d => RR_WORD[d]).join(" and ");
    if (p.INTERVAL && p.INTERVAL !== "2" && !p.BYDAY) what += "s";
    return " " + every + what + (p.BYHOUR ? " at " + pad2(p.BYHOUR) + ":" + pad2(p.BYMINUTE) : "");
  }
  // systemd OnCalendar form of simple rules, null when systemd can't express it
  function onCalendar(rrule) {
    const p = ruleParts(rrule);
    if (p.INTERVAL) return null;
    const t = " " + pad2(p.BYHOUR || 9) + ":" + pad2(p.BYMINUTE || 0) + ":00";
    if (p.FREQ === "DAILY") return "*-*-*" + t;
    if (p.FREQ === "WEEKLY" && p.BYDAY) return p.BYDAY.split(",").map(d => RR_WORD[d].slice(0, 3)).join(",") + " *-*-*" + t;
    return null;
  }

  // ---------- folders ----------
  const XDG = { desktop: "Desktop", documents: "Documents", downloads: "Downloads", music: "Music",
    pictures: "Pictures", videos: "Videos", templates: "Templates", public: "Public" };
  const HERE = /^(here|this (folder|directory|dir)|(the )?current (folder|directory|dir)|cwd|current)$/i;
  // what people call a place on disk → { path, label }
  function where(raw) {
    if (!raw) return { path: "$HOME", label: "your home folder" };
    const v = raw.replace(/^the\s+/i, "").replace(/\s+(folder|directory|dir)$/i, "");
    const low = v.toLowerCase();
    if (HERE.test(low)) return { path: "$HOME", label: "the current folder" };
    if (low === "home" || low === "~") return { path: "$HOME", label: "your home folder" };
    if (XDG[low]) return { path: "$HOME/" + XDG[low], label: XDG[low] };
    return { path: "$HOME/" + v, label: v };
  }
  // text made safe for the command line: single quotes, so nothing in it ($, `, ;, &) is run.
  // A path's leading $HOME stays outside the quotes so the shell still expands it.
  const sq = t => (/^[\w./:-]+$/.test(t) ? t : "'" + t.replace(/'/g, "'\\''") + "'");
  const quote = p => (p.startsWith("$HOME") ? "$HOME" + (p.length > 5 ? sq(p.slice(5)) : "") : sq(p));


  // ---------- network: the place lookup and the requests declared in skill.md ----------
  const getPath = (obj, path) => path.replace(/\[(\d+)\]/g, ".$1").split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
  // a place → coordinates and time zone (Open-Meteo place search), cached per agent
  async function geocode(agent, name) {
    const key = name.toLowerCase();
    agent.geoCache = agent.geoCache || {};
    if (key in agent.geoCache) return agent.geoCache[key];
    if (!agent.fetch) throw new Error("no network access");
    const r = await agent.fetch("https://geocoding-api.open-meteo.com/v1/search?count=5&language=en&format=json&name=" + encodeURIComponent(name));
    if (!r.ok) throw new Error("place search answered " + r.status);
    // several places share a name ("Paris", "Hong"): prefer the most populated one
    const g = ((await r.json()).results || []).reduce((best, x) => (!best || (x.population || 0) > (best.population || 0) ? x : best), null);
    const out = g ? { name: g.name, region: [g.admin1, g.country].filter(x => x && x !== g.name).join(", "), lat: g.latitude, lon: g.longitude, timezone: g.timezone } : null;
    agent.geoCache[key] = out;
    return out;
  }
  // the call under "## Request": {slot} from the sentence, {place.lat} after a place lookup;
  // "## Answer" picks the fields that become reply values
  async function request(agent, sk, vars, ctx) {
    const r = sk.request;
    if (!r) throw new Error(sk.file + " has no ## Request section");
    vars = { ...vars };
    let place = null;
    if (Object.values(r.query).some(v => v.includes("{place."))) {
      place = typeof vars.place === "string" ? await geocode(agent, vars.place) : vars.place;
      if (!place) return { place: null, answer: {}, json: null };
      vars.place = place;
    }
    const q = Object.entries(r.query).map(([k, v]) => k + "=" + encodeURIComponent(v.replace(/\{([\w.]+)\}/g, (_, path) => getPath(vars, path) ?? "")));
    const url = r.url + (q.length ? "?" + q.join("&") : "");
    ctx.exec(r.method + " " + url.replace(/^https?:\/\//, "").replace(/%2C/g, ","));
    if (!agent.fetch) throw new Error("no network access");
    const res = await agent.fetch(url);
    if (!res.ok) throw new Error(new URL(url).host + " answered " + res.status);
    const json = await res.json();
    const answer = {};
    for (const [name, a] of Object.entries(sk.answer || {})) {
      let v = getPath(json, a.path);
      if (a.round && typeof v === "number") v = Math.round(v);
      if (a.via) v = ctx.lookup(a.via, v) ?? v;
      answer[name] = v;
    }
    return { place, answer, json };
  }

  // the place a sentence names: the tagged words, extended to the rest of a multi-word name
  // ("hong" in "time in hong kong now" → "hong kong"), stopping at words that aren't part of it
  const NOT_PLACE = /^(now|right|today|tonight|tomorrow|please|on|at|this|next|in|for|and|then|later|morning|afternoon|evening|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d.*)$/i;
  function placeIn(text, tagged) {
    if (!tagged) return null;
    const at = text.toLowerCase().indexOf(tagged.toLowerCase());
    if (at < 0) return tagged;
    const words = text.slice(at + tagged.length).replace(/[?!.,;].*$/, "").split(/\s+/).filter(Boolean);
    const more = [];
    for (const w of words) { if (NOT_PLACE.test(w)) break; more.push(w); }
    return [text.slice(at, at + tagged.length), ...more].join(" ").trim();
  }

  // ---------- what the agent remembers about the person: on this device only ----------
  const ME_KEY = "minios.me.v1"; // old name kept on purpose: name and place survive the rename
  const me = {
    get: (store, agent) => { try { return JSON.parse((store && store.getItem(ME_KEY)) || "null") || agent._mem || {}; } catch { return agent._mem || {}; } },
    set: (store, agent, m) => { agent._mem = m; try { if (store) store.setItem(ME_KEY, JSON.stringify(m)); } catch { /* kept in memory only */ } },
  };

  return { net: { geocode, request }, me, places: { placeIn }, fmt: { DAYS, MONTHS, pad2, cap, plural, day0, daysApart, fromIso, isoMinute, clock, dayText, whenText, durWords, ruleWords, onCalendar },
    files: { where, quote } };
})();
if (typeof module !== "undefined") module.exports = NLUServices;
