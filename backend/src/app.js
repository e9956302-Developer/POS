import cors from "cors";
import express from "express";
import { router } from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { cookieMiddleware } from "./middleware/cookie.js";

export const app = express();

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);
    callback(null, origin);
  },
  credentials: true
}));

app.use(cookieMiddleware);
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "digitalmarkaz360-api" });
});

app.get("/", (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>DigitalMarkaz360 API</title>
        <meta http-equiv="refresh" content="2; url=http://localhost:5173" />
      </head>
      <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; text-align: center;">
        <div style="padding: 2.5rem; background: #1e293b; border-radius: 12px; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.5); max-width: 480px;">
          <h2 style="margin: 0 0 10px; color: #38bdf8;">DigitalMarkaz360 API is Online 🚀</h2>
          <p style="margin: 0 0 6px; color: #38bdf8; font-weight: 600; font-size: 1.05rem;">Poora Karobar, Ek Markaz</p>
          <p style="margin: 0 0 20px; color: #94a3b8; font-size: 0.95rem;">Port 4000 is the backend REST API. Redirecting you to the Web Application...</p>
          <a href="http://localhost:5173" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Open Web Application (http://localhost:5173) →
          </a>
        </div>
      </body>
    </html>
  `);
});

app.use("/api", router);
app.use(notFoundHandler);
app.use(errorHandler);

