#!/usr/bin/env node

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = __dirname;
const backendDir = path.join(rootDir, "backend");
const frontendDir = path.join(rootDir, "frontend");

function run(command, args = [], options = {}) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: true, // makes it work nicely on Windows + *nix
    ...options
  });
  return child;
}

async function infraUp() {
  console.log("==> Starting infra: Postgres, Redis, Qdrant, NATS (docker compose)...");
  run("docker", ["compose", "up", "-d", "postgres", "redis", "qdrant", "nats"], {
    cwd: rootDir
  }).on("exit", (code) => {
    process.exitCode = code ?? 0;
  });
}

async function infraDown() {
  console.log("==> Stopping infra (docker compose down)...");
  run("docker", ["compose", "down"], {
    cwd: rootDir
  }).on("exit", (code) => {
    process.exitCode = code ?? 0;
  });
}

async function backendDev() {
  console.log("==> Starting backend dev server (Fastify)...");
  run("npm", ["run", "dev"], { cwd: backendDir });
}

async function frontendDev() {
  console.log("==> Starting frontend dev server (Vite)...");
  run("npm", ["run", "dev"], { cwd: frontendDir });
}

async function devAll() {
  console.log("==> Bringing up infra + backend + frontend (dev mode)...");
  const infra = run("docker", ["compose", "up", "-d", "postgres", "redis", "qdrant", "nats"], {
    cwd: rootDir
  });

  infra.on("exit", (code) => {
    if (code !== 0) {
      console.error("Infra failed to start, aborting dev-all.");
      process.exitCode = code ?? 1;
      return;
    }
    backendDev();
    frontendDev();
  });
}

const cmd = process.argv[2];

switch (cmd) {
  case "infra:up":
    await infraUp();
    break;
  case "infra:down":
    await infraDown();
    break;
  case "backend":
    await backendDev();
    break;
  case "frontend":
    await frontendDev();
    break;
  case "dev":
  case "dev:all":
    await devAll();
    break;
  default:
    console.log(`Usage:
  node devctl.mjs infra:up      # start Postgres, Redis, Qdrant, NATS via docker compose
  node devctl.mjs infra:down    # stop all infra containers
  node devctl.mjs backend       # start backend dev server
  node devctl.mjs frontend      # start frontend dev server
  node devctl.mjs dev           # start infra + backend + frontend (dev mode)

You can also make devctl.mjs executable and run:
  ./devctl.mjs dev
`);
    process.exit(0);
}

