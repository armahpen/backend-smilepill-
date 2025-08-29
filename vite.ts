import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Simplified setupVite for development (not used in production)
export async function setupVite(app: Express, server: Server) {
  // In standalone backend, we don't need Vite setup
  // This is only used in development when frontend and backend are together
  console.log("Vite setup skipped - standalone backend mode");
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    // In standalone backend, we don't serve static files
    // The frontend is deployed separately on Netlify
    console.log("Static file serving skipped - standalone backend mode");
    return;
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
