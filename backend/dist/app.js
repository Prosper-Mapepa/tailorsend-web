import cors from "cors";
import express from "express";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
export function createApp() {
    const app = express();
    app.use(cors({
        origin: [config.frontendUrl, config.appUrl].filter(Boolean),
        credentials: true,
    }));
    app.use(express.json({ limit: "1mb" }));
    app.get("/health", (_req, res) => {
        res.json({ ok: true, service: "autoapply-backend" });
    });
    app.use("/api/auth", authRoutes);
    app.use((_req, res) => {
        res.status(404).json({ error: "Not found." });
    });
    app.use((err, _req, res, _next) => {
        console.error(err);
        res.status(500).json({ error: "Internal server error." });
    });
    return app;
}
