import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { extname, join } from "node:path";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT || 8080);
const DEVICE_TOKEN = process.env.DEVICE_TOKEN || "change-this-token";
const PUBLIC_DIR = join(process.cwd(), "public");

const devices = new Map();
const viewers = new Map();

function getMimeType(path) {
  switch (extname(path)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    default:
      return "text/plain; charset=utf-8";
  }
}

function viewerSet(deviceId) {
  if (!viewers.has(deviceId)) viewers.set(deviceId, new Set());
  return viewers.get(deviceId);
}

function broadcastJson(deviceId, payload) {
  const message = JSON.stringify(payload);
  for (const client of viewerSet(deviceId)) {
    if (client.readyState === 1) client.send(message);
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let filePath = url.pathname === "/" ? join(PUBLIC_DIR, "index.html") : join(PUBLIC_DIR, url.pathname);
  if (!existsSync(filePath)) {
    res.writeHead(404).end("Not found");
    return;
  }
  res.writeHead(200, { "content-type": getMimeType(filePath) });
  res.end(readFileSync(filePath));
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get("token");
  const deviceId = url.searchParams.get("deviceId") || "esp32s3-room-1";

  if (token !== DEVICE_TOKEN) {
    ws.close(4001, "bad token");
    return;
  }

  if (url.pathname === "/ws/device") {
    devices.set(deviceId, ws);
    broadcastJson(deviceId, { type: "status", online: true });

    ws.on("message", (data, isBinary) => {
      if (isBinary) {
        for (const client of viewerSet(deviceId)) {
          if (client.readyState === 1) client.send(data, { binary: true });
        }
        return;
      }

      try {
        const message = JSON.parse(data.toString());
        broadcastJson(deviceId, message);
      } catch {
        return;
      }
    });

    ws.on("close", () => {
      if (devices.get(deviceId) === ws) devices.delete(deviceId);
      broadcastJson(deviceId, { type: "status", online: false });
    });

    return;
  }

  if (url.pathname === "/ws/app") {
    viewerSet(deviceId).add(ws);

    const device = devices.get(deviceId);
    if (device?.readyState === 1) {
      device.send(JSON.stringify({ type: "ping" }));
      ws.send(JSON.stringify({ type: "status", online: true }));
    } else {
      ws.send(JSON.stringify({ type: "status", online: false }));
    }

    ws.on("message", (data) => {
      const deviceSocket = devices.get(deviceId);
      if (deviceSocket?.readyState !== 1) return;
      deviceSocket.send(data.toString());
    });

    ws.on("close", () => {
      viewerSet(deviceId).delete(ws);
    });
  }
});

server.listen(PORT, () => {
  console.log(`Relay server listening on http://0.0.0.0:${PORT}`);
});
