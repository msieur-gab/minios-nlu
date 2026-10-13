// Recorded-style Open-Meteo, ntfy and Telegram responses so the API skills can be tested without a network.
// Shapes follow open-meteo.com (place search: results[]; forecast: current{} and daily{} arrays).
const PLACES = {
  munich: { name: "Munich", latitude: 48.13743, longitude: 11.57549, country: "Germany", admin1: "Bavaria", timezone: "Europe/Berlin" },
  tokyo: { name: "Tokyo", latitude: 35.6895, longitude: 139.69171, country: "Japan", admin1: "Tokyo", timezone: "Asia/Tokyo" },
  paris: { name: "Paris", latitude: 48.85341, longitude: 2.3488, country: "France", admin1: "Île-de-France", timezone: "Europe/Paris" },
  "new york": { name: "New York", latitude: 40.71427, longitude: -74.00597, country: "United States", admin1: "New York", timezone: "America/New_York" },
  kyoto: { name: "Kyoto", latitude: 35.02107, longitude: 135.75385, country: "Japan", admin1: "Kyoto", timezone: "Asia/Tokyo" },
  lisbon: { name: "Lisbon", latitude: 38.71667, longitude: -9.13333, country: "Portugal", admin1: "Lisbon", timezone: "Europe/Lisbon" },
};
function forecast(start) {
  const time = [], codes = [3, 61, 2, 0, 80, 63, 1, 71, 3, 2, 0, 0, 61, 45, 3, 2];
  for (let i = 0; i < 16; i++) { const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    time.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")); }
  return { timezone: "Europe/Berlin",
    current: { time: time[0] + "T20:00", interval: 900, temperature_2m: 11.4, weather_code: 3, wind_speed_10m: 9.7 },
    daily: { time, weather_code: codes, temperature_2m_max: time.map((_, i) => 14 + (i % 5)), temperature_2m_min: time.map((_, i) => 5 + (i % 4)),
      precipitation_probability_max: codes.map(c => (c >= 51 ? 70 : 10)) } };
}
function mockFetch(start, { offline = false, log = [] } = {}) {
  return async (url, opts = {}) => {
    log.push(opts.body ? url + " " + opts.body : url);
    if (offline) throw new TypeError("Failed to fetch");
    const u = new URL(url);
    if (u.hostname === "api.telegram.org") { // Bot API: a known token and a chat id, or 401
      const m = JSON.parse(opts.body || "{}"), ok = u.pathname === "/bot123:ABC/sendMessage" && m.chat_id;
      return ok ? { ok: true, status: 200, json: async () => ({ ok: true, result: { message_id: 7, chat: { id: +m.chat_id }, text: m.text } }) }
        : { ok: false, status: 401, json: async () => ({ ok: false, error_code: 401, description: "Unauthorized" }) };
    }
    if (u.hostname === "ntfy.sh") { // ntfy publish: answers with the message it stored
      const m = JSON.parse(opts.body || "{}");
      return m.topic ? { ok: true, status: 200, json: async () => ({ id: "x7Kq2", event: "message", topic: m.topic, title: m.title, message: m.message }) }
        : { ok: false, status: 400, json: async () => ({ error: "topic missing" }) };
    }
    const body = u.hostname.startsWith("geocoding")
      ? { results: PLACES[u.searchParams.get("name").toLowerCase()] ? [PLACES[u.searchParams.get("name").toLowerCase()]] : undefined }
      : forecast(start);
    return { ok: true, status: 200, json: async () => body };
  };
}
module.exports = { mockFetch, PLACES };
