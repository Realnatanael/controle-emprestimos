import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { assertProductionReady } from "./auth.js";
import { connectDatabase } from "./db.js";
import { api } from "./routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

assertProductionReady();

const app = express();
app.set("trust proxy", 1);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use("/api", api);

const dist = path.resolve(__dirname, "../../client/dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();
    res.sendFile(path.join(dist, "index.html"));
  });
}

const port = Number(process.env.PORT) || 4000;
const db = await connectDatabase();
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`API pronta em http://localhost:${port}`);
  console.log(`Banco: ${db.mode}`);
});

async function shutdown() {
  server.close();
  await db.mongod?.stop().catch(() => {});
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
