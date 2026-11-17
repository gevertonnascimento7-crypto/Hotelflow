// Gateway mínimo (substitui o Kong) para o Supabase local de testes.
// /auth/v1 → GoTrue, /rest/v1 → PostgREST, /storage/v1 → Storage, /realtime/v1 → Realtime
import http from "node:http";
import net from "node:net";

const PORT = Number(process.env.GATEWAY_PORT ?? 54321);
const routes = [
  { prefix: "/auth/v1", port: 54390, rewrite: (p) => p },
  { prefix: "/rest/v1", port: 54391, rewrite: (p) => p },
  { prefix: "/storage/v1", port: 54392, rewrite: (p) => p },
  { prefix: "/realtime/v1", port: 54393, rewrite: (p) => "/socket" + p, host: "realtime-dev" },
];

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD",
  "access-control-allow-headers":
    "authorization,x-client-info,apikey,content-type,prefer,range,accept-profile,content-profile,x-upsert,x-supabase-api-version,cache-control,x-requested-with",
  "access-control-expose-headers": "content-range,content-length,x-supabase-api-version",
  "access-control-max-age": "86400",
};

function match(url) {
  for (const r of routes) {
    if (url === r.prefix || url.startsWith(r.prefix + "/") || url.startsWith(r.prefix + "?")) {
      return { route: r, path: r.rewrite(url.slice(r.prefix.length) || "/") };
    }
  }
  return null;
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, cors);
    return res.end();
  }
  const m = match(req.url ?? "/");
  if (!m) {
    res.writeHead(404, { "content-type": "application/json", ...cors });
    return res.end(JSON.stringify({ message: "no route" }));
  }
  const headers = { ...req.headers, host: m.route.host ?? `localhost:${m.route.port}` };
  const proxy = http.request(
    { hostname: "127.0.0.1", port: m.route.port, path: m.path, method: req.method, headers },
    (up) => {
      const out = { ...up.headers };
      for (const k of Object.keys(out)) if (k.startsWith("access-control-")) delete out[k];
      res.writeHead(up.statusCode ?? 502, { ...out, ...cors });
      up.pipe(res);
    },
  );
  proxy.on("error", (err) => {
    res.writeHead(502, { "content-type": "application/json", ...cors });
    res.end(JSON.stringify({ message: String(err) }));
  });
  req.pipe(proxy);
});

server.on("upgrade", (req, socket, head) => {
  const m = match(req.url ?? "/");
  if (!m) return socket.destroy();
  const upstream = net.connect(m.route.port, "127.0.0.1", () => {
    const lines = [`${req.method} ${m.path} HTTP/1.1`];
    for (const [k, v] of Object.entries(req.headers)) {
      if (k === "host") continue;
      for (const val of Array.isArray(v) ? v : [v]) lines.push(`${k}: ${val}`);
    }
    lines.push(`host: ${m.route.host ?? "localhost"}`);
    upstream.write(lines.join("\r\n") + "\r\n\r\n");
    if (head?.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
});

server.listen(PORT, () => console.log(`gateway listening on http://localhost:${PORT}`));
