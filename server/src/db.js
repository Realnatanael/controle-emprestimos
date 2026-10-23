import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { isProduction } from "./auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function connectUri(uri, mode) {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: isProduction() ? 15000 : 4000,
    dbName: "controle-emprestimos",
  });
  return { mode, mongod: null };
}

function clearStaleLocks(dbPath) {
  for (const name of ["mongod.lock", "WiredTiger.lock"]) {
    const file = path.join(dbPath, name);
    if (fs.existsSync(file)) fs.rmSync(file, { force: true });
  }
}

async function startEmbedded() {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const dbPath = path.resolve(__dirname, "../../data/mongo");
  fs.mkdirSync(dbPath, { recursive: true });
  clearStaleLocks(dbPath);
  console.log("Subindo MongoDB nesta pasta. Na primeira vez o binário é baixado e pode demorar.");
  const mongod = await MongoMemoryServer.create({
    instance: {
      dbPath,
      dbName: "controle-emprestimos",
      storageEngine: "wiredTiger",
      launchTimeout: 60000,
    },
  });
  await mongoose.connect(mongod.getUri(), { dbName: "controle-emprestimos" });
  return { mode: "embutido", mongod };
}

export async function connectDatabase() {
  const configured = process.env.MONGODB_URI?.trim();
  if (configured) return connectUri(configured, "configurado");
  if (isProduction()) {
    throw new Error("No Render, crie um MongoDB Atlas e cole a URI em MONGODB_URI.");
  }

  try {
    return await connectUri("mongodb://127.0.0.1:27017/controle-emprestimos", "local");
  } catch {
    await mongoose.disconnect().catch(() => {});
  }

  return startEmbedded();
}
