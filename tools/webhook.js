// A small webhook for ptiLU's hand-over skills: it receives what the agent understood and
// answers with one sentence to say, { "say": "…" }. No dependencies (Node 18 or later).
//
//   POST /route   { from, to, mode }   places and street addresses from OpenStreetMap's
//                                      Nominatim, routes from routing.openstreetmap.de
//                                      (both free, fair use: one request a second at most)
//   POST /agenda  { when }             reads the calendar at ICS_URL (a private iCal address)
//
//   ICS_URL="https://…/basic.ics" PORT=8787 node tools/webhook.js
//
// The PWA is served over https, so the browser only calls an https webhook: put this behind
// a tunnel (Cloudflare Tunnel, Tailscale Funnel…) or a reverse proxy with a certificate.
// Repeating events (RRULE) in the calendar are not read: only single events.
const http = require("http");

const pad = n => String(n).padStart(2, "0");
const dayKey = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const dayWords = (d, today) => {
  const k = Math.round((new Date(dayKey(d)) - new Date(dayKey(today))) / 864e5);
  return k === 0 ? "today" : k === 1 ? "tomorrow" : d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
};
const minutes = s => { const m = Math.round(s / 60); return m < 60 ? m + " min" : Math.floor(m / 60) + " h" + (m % 60 ? " " + (m % 60) + " min" : ""); };

// ---------- route ----------
const PROFILE = { car: "routed-car", bike: "routed-bike", foot: "routed-foot" };
// a place or a street address ("Munich airport", "Menzinger Straße 14a, Munich")
const AGENT = { "User-Agent": "ptiLU-webhook/1 (https://github.com/msieur-gab/ptiLU)" }; // Nominatim asks for one
async function place(name, fetch) {
  const r = await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" + encodeURIComponent(name), { headers: AGENT });
  const g = (await r.json())[0];
  return g ? { name: g.name || name, lat: +g.lat, lon: +g.lon } : null; // an address has no name: say it as asked
}
async function route({ from, to, mode }, fetch) {
  if (!from || !to) return { say: "I need both a start and a destination." };
  const [a, b] = await Promise.all([place(from, fetch), place(to, fetch)]);
  if (!a || !b) return {}; // no "say": the agent answers its not_found reply
  const how = PROFILE[mode] ? mode : "car";
  const r = await fetch(`https://routing.openstreetmap.de/${PROFILE[how]}/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`, { headers: AGENT });
  const best = ((await r.json()).routes || [])[0];
  if (!best) return {};
  const by = how === "foot" ? "on foot" : "by " + how;
  return { say: `${a.name} to ${b.name}: ${minutes(best.duration)} ${by}, ${Math.round(best.distance / 1000)} km.` };
}

// ---------- agenda ----------
// an iCal date: 20261014T090000Z (UTC), 20261014T090000 (local), 20261014 (all day)
function icalDate(v) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(v.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (!h) return { at: new Date(+y, mo - 1, +d), allDay: true };
  return { at: z ? new Date(Date.UTC(+y, mo - 1, +d, +h, +mi, +s)) : new Date(+y, mo - 1, +d, +h, +mi, +s), allDay: false };
}
function events(ics) {
  const lines = ics.replace(/\r?\n[ \t]/g, "").split(/\r?\n/); // unfold continued lines
  const out = [];
  let ev = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") ev = {};
    else if (line === "END:VEVENT") { if (ev && ev.start && !ev.repeats) out.push(ev); ev = null; }
    else if (ev) {
      const [key, ...rest] = line.split(":"), name = key.split(";")[0], value = rest.join(":");
      if (name === "DTSTART") Object.assign(ev, (d => d && { start: d.at, allDay: d.allDay })(icalDate(value)) || {});
      else if (name === "SUMMARY") ev.title = value.replace(/\\([,;\\])/g, "$1").replace(/\\n/gi, " ");
      else if (name === "RRULE") ev.repeats = true;
    }
  }
  return out;
}
async function agenda({ when }, fetch, now = new Date()) {
  if (!process.env.ICS_URL) return { say: "The calendar webhook has no ICS_URL set." };
  const [a, b] = (when || dayKey(now)).split("/");
  const from = new Date(a.slice(0, 10) + "T00:00"), to = new Date((b || a).slice(0, 10) + "T23:59:59");
  const found = events(await (await fetch(process.env.ICS_URL)).text())
    .filter(e => e.start >= from && e.start <= to).sort((x, y) => x.start - y.start);
  const span = b ? "then" : dayWords(from, now);
  if (!found.length) return { say: b ? "Nothing in your calendar then." : `Nothing in your calendar ${span}.` };
  const several = b && dayKey(from) !== dayKey(to);
  const items = found.slice(0, 6).map(e => (e.title || "something") + (e.allDay ? "" : " at " + pad(e.start.getHours()) + ":" + pad(e.start.getMinutes()))
    + (several ? " (" + dayWords(e.start, now) + ")" : ""));
  const count = ["", "One thing", "Two things", "Three things"][found.length] || found.length + " things";
  return { say: `${count} ${span}: ${items.join(", ")}${found.length > 6 ? ", and more" : ""}.` };
}

// ---------- server ----------
const HANDLERS = { "/route": route, "/agenda": agenda };
function serve(port = +process.env.PORT || 8787) {
  return http.createServer(async (req, res) => {
    const head = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
    if (req.method === "OPTIONS") { res.writeHead(204, head); return res.end(); }
    const handler = HANDLERS[new URL(req.url, "http://x").pathname];
    if (req.method !== "POST" || !handler) { res.writeHead(404, head); return res.end("{}"); }
    let body = "";
    for await (const chunk of req) body += chunk;
    try {
      const out = await handler(JSON.parse(body || "{}"), fetch);
      res.writeHead(200, head); res.end(JSON.stringify(out));
    } catch (err) {
      res.writeHead(502, head); res.end(JSON.stringify({ error: err.message }));
    }
  }).listen(port, () => console.log("ptiLU webhook on :" + port + "  (POST /route, /agenda)"));
}

if (require.main === module) serve();
module.exports = { route, agenda, events, icalDate, serve };
