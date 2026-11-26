const UPSTREAM = "https://hyper.stravo.site";
const CONFIG_PATH = "/local:hi:@display=list";

function send(res, status, body, contentType = "application/json; charset=utf-8") {
  res.statusCode = status;
  res.setHeader("Content-Type", contentType);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, "");
  if (req.method !== "GET") return send(res, 405, { error: "GET only" });

  // Vercel catch-all route: /api/[...path]
  const urlPath = new URL(req.url, "https://bridge.local").pathname;
  let requestedPath = urlPath.replace(/^\/api\/?/, "").replace(/^\/+/, "");

  if (!requestedPath || requestedPath === "api") {
    const parts = Array.isArray(req.query.path)
      ? req.query.path
      : (req.query.path ? [req.query.path] : []);
    requestedPath = parts.join("/");
  }
  const isManifest = requestedPath === "manifest.json";

  const upstreamUrl = `${UPSTREAM}${CONFIG_PATH}/${requestedPath}`;
  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Hyper-Wako-Bridge/1.0"
      }
    });

    const contentType = upstream.headers.get("content-type") || "";
    const raw = await upstream.text();

    if (!upstream.ok) {
      return send(res, upstream.status, {
        error: "Hyper upstream request failed",
        upstreamStatus: upstream.status,
        detail: raw.slice(0, 500)
      });
    }

    if (!contentType.includes("json")) {
      return send(res, 502, {
        error: "Hyper returned a non-JSON response",
        contentType,
        detail: raw.slice(0, 300)
      });
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return send(res, 502, { error: "Could not parse Hyper JSON response" });
    }

    if (isManifest) {
      data.name = "Hyper Hindi — Wako Bridge";
      data.description = "Compatibility wrapper for Hyper Hindi streams. Playback depends on source and Wako player support.";
      data.id = "com.user.hyper-wako-bridge";
      return send(res, 200, data);
    }

    if (Array.isArray(data.streams)) {
      data.streams = data.streams.map(stream => {
        if (!stream || !stream.url) return stream;
        return {
          ...stream,
          behaviorHints: {
            ...(stream.behaviorHints || {}),
            proxyHeaders: {
              ...((stream.behaviorHints && stream.behaviorHints.proxyHeaders) || {}),
              request: {
                ...((((stream.behaviorHints || {}).proxyHeaders || {}).request) || {}),
                Referer: "https://mzfi.me/",
                Origin: "https://mzfi.me",
                "User-Agent": "Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36",
                Accept: "*/*"
              }
            }
          }
        };
      });
    }

    return send(res, 200, data);
  } catch (err) {
    return send(res, 502, {
      error: "Bridge could not reach Hyper",
      detail: String(err && err.message ? err.message : err)
    });
  }
};
