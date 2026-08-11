import dotenv from "dotenv";
import { server, app, initApp } from "./src/index.js"; // 👈 initApp replaces connectDB
import os from "os";
import https from "https";
import memoryMonitor from "./src/utils/memoryMonitor.js";

dotenv.config();
const PORT = process.env.PORT || 3000;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getLocalIP = () => {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
};

const getPublicIP = () =>
  new Promise((resolve, reject) => {
    https
      .get("https://api.ipify.org?format=json", (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(JSON.parse(data).ip));
      })
      .on("error", reject);
  });

// ─── Startup ──────────────────────────────────────────────────────────────────
async function startServer() {
  try {
    // ✅ DB connects + cache loads + security check kicks off — all before listen()
    await initApp();
    console.log("✅ MongoDB connected");

    server.listen(PORT, "0.0.0.0", async () => {
      const localIP = getLocalIP();
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📡 Local Access:  http://localhost:${PORT}`);
      if (localIP) console.log(`💻 LAN Access:    http://${localIP}:${PORT}`);

      try {
        await getPublicIP();
      } catch (_) { }

      memoryMonitor.startMonitoring(30000);
    });

  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

startServer();

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  server.close(() => {
    if (global.gc) global.gc();
    process.exit(0);
  });
});

process.on('SIGINT', () => process.emit('SIGTERM'));

// ─── Error Guards ─────────────────────────────────────────────────────────────
process.on("uncaughtException", (err) => console.error("UNCAUGHT EXCEPTION:", err));
process.on("unhandledRejection", (reason) => console.error("UNHANDLED REJECTION:", reason));
// Reload trigger: 2026-07-03T16:34:00