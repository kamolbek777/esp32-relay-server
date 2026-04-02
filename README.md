# ESP32 Relay Server

## Run locally

```bash
cd relay-server
npm install
DEVICE_TOKEN=change-this-token PORT=8080 npm start
```

## Deploy to VPS

1. Install Node.js 20+ on the VPS.
2. Copy `relay-server/` to the VPS.
3. Run:

```bash
cd relay-server
npm install
DEVICE_TOKEN=change-this-token PORT=8080 npm start
```

4. Put Nginx/Caddy in front if you want HTTPS.

## Open in browser

```text
https://your-domain-or-ip/?deviceId=esp32s3-room-1&token=change-this-token
```

## ESP configuration

Update these lines in `/main/main.c`:

- `DEVICE_TOKEN`
- `RELAY_WS_URL`

Example:

```c
#define DEVICE_TOKEN "change-this-token"
#define RELAY_WS_URL "ws://YOUR_VPS_IP:8080/ws/device"
```
