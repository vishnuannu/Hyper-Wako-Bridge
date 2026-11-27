const http = require("http");

const UPSTREAM = "https://hyper.stravo.site";
const CONFIG_PATH = "/local:hi:@display=list";

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (req.method !== "GET") {
    res.writeHead(405);
    return res.end("GET only");
  }

  try {
    const path = new URL(req.url, "http://localhost").pathname;
    const upstreamUrl = `${UPSTREAM}${CONFIG_PATH}${path}`;

    const response = await fetch(upstreamUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Hyper-Wako-Bridge/1.0"
      }
    });

    let raw = await response.text();

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
      data.streams = data.streams.map(stream => ({
        ...stream,
        behaviorHints: {
          ...(stream.behaviorHints || {}),
          proxyHeaders: {
            request: {
              Referer: "https://mzfi.me/",
              Origin: "https://mzfi.me",
              "User-Agent": "Mozilla/5.0",
              Accept: "*/*"
            }
          }
        }
      }));
    }

    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store"
    });
    res.end(JSON.stringify(data));

  } catch (error) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: error.message }));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Hyper Wako Bridge running on port ${PORT}`);
});
