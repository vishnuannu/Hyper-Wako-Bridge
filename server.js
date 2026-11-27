const http = require("http");
const { Readable } = require("stream");

const UPSTREAM = "https://hyper.stravo.site";
const CONFIG_PATH = "/local:hi:@display=list";

const HEADERS = {
  Referer: "https://mzfi.me/",
  Origin: "https://mzfi.me",
  "User-Agent": "Mozilla/5.0",
  Accept: "*/*"
};

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, "http://localhost");
  const path = requestUrl.pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*"
    });
    return res.end();
  }

  if (path === "/proxy") {
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405);
      return res.end("GET or HEAD only");
    }

    try {
      const videoUrl = new URL(requestUrl.searchParams.get("url") || "");

      if (
        videoUrl.protocol !== "https:" ||
        !videoUrl.hostname.endsWith(".hakunaymatata.com")
      ) {
        res.writeHead(403);
        return res.end("Video host not allowed");
      }

      const headers = { ...HEADERS };
      if (req.headers.range) {
        headers.Range = req.headers.range;
      }

      const response = await fetch(videoUrl, {
        method: req.method,
        headers,
        redirect: "follow"
      });

      const finalUrl = new URL(response.url);
      if (
        finalUrl.protocol !== "https:" ||
        !finalUrl.hostname.endsWith(".hakunaymatata.com")
      ) {
        res.writeHead(403);
        return res.end("Redirect host not allowed");
      }

      const responseHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store"
      };

      for (const name of [
        "content-type",
        "content-length",
        "content-range",
        "accept-ranges"
      ]) {
        if (response.headers.has(name)) {
          responseHeaders[name] = response.headers.get(name);
        }
      }

      res.writeHead(response.status, responseHeaders);

      if (req.method === "HEAD" || !response.body) {
        return res.end();
      }

      Readable.fromWeb(response.body).pipe(res);
    } catch (error) {
      if (!res.headersSent) res.writeHead(502);
      res.end("Video proxy error: " + error.message);
    }
    return;
  }

  if (req.method !== "GET") {
    res.writeHead(405);
    return res.end("GET only");
  }

  try {
    const upstreamUrl = `${UPSTREAM}${CONFIG_PATH}${path}`;
    const response = await fetch(upstreamUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Hyper-Wako-Bridge/1.0"
      }
    });

    const raw = await response.text();

    if (!response.ok) {
      res.writeHead(response.status, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      });
      return res.end(JSON.stringify({
        error: "Hyper upstream error",
        status: response.status,
        detail: raw.slice(0, 500)
      }));
    }

    const data = JSON.parse(raw);

    if (path === "/manifest.json") {
      data.id = "com.user.hyper-wako-bridge";
      data.name = "Hyper Hindi - Wako Bridge";
      data.description = "Hyper Hindi compatibility bridge";
    } else if (Array.isArray(data.streams)) {
      const baseUrl =
        process.env.PUBLIC_URL || `https://${req.headers.host}`;

      data.streams = data.streams.map(stream => {
        try {
          const videoUrl = new URL(stream.url);

          if (
            videoUrl.protocol === "https:" &&
            videoUrl.hostname.endsWith(".hakunaymatata.com")
          ) {
            stream.url =
              `${baseUrl}/proxy?url=${encodeURIComponent(videoUrl.href)}`;
          }
        } catch (_) {}

        stream.behaviorHints = {
          ...(stream.behaviorHints || {}),
          proxyHeaders: {
            request: HEADERS
          }
        };

        return stream;
      });
    }

    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store"
    });

    res.end(JSON.stringify(data));
  } catch (error) {
    res.writeHead(502, {
      "Content-Type": "application/json"
    });
    res.end(JSON.stringify({ error: error.message }));
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Hyper Wako Bridge running on port ${PORT}`);
});
