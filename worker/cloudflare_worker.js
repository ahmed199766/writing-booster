export default {
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400"
        }
      });
    }
    try {
      const videoId = url.searchParams.get("videoId") || url.searchParams.get("v");
      const lang = url.searchParams.get("lang") || "en";
      if (!videoId) {
        return new Response(JSON.stringify({ error: "missing_videoId" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
      const yt = `https://www.youtube.com/api/timedtext?lang=${encodeURIComponent(lang)}&v=${encodeURIComponent(videoId)}&fmt=json3`;
      const r = await fetch(yt, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!r.ok) {
        return new Response(JSON.stringify({ error: "fetch_failed", status: r.status }), {
          status: 502,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
      const data = await r.json();
      const items = [];
      if (data && Array.isArray(data.events)) {
        let tcursor = 0;
        for (const e of data.events) {
          if (!e) continue;
          const segs = e.segs || [];
          const text = segs.map(s => s.utf8).join("").replace(/\s+/g, " ").trim();
          if (!text) continue;
          const start = e.tStartMs != null ? e.tStartMs / 1000 : tcursor;
          const dur = e.dDurationMs != null ? e.dDurationMs / 1000 : Math.max(1, text.split(" ").length / 2.5);
          items.push({ t: start, text, dur });
          tcursor = start + dur;
        }
      }
      return new Response(JSON.stringify({ items }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "exception", message: String(err) }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  }
};