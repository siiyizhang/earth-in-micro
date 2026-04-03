import { spawn } from "node:child_process";

function run(command, args) {
  return spawn(command, args, { stdio: "inherit" });
}

const api = run("tsx", ["server.ts"]);
const vite = run("vite", []);

let shuttingDown = false;

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  api.kill("SIGTERM");
  vite.kill("SIGTERM");
}

api.on("exit", (code, signal) => {
  if (shuttingDown) return;
  if (signal) shutdown();
  else if (code && code !== 0) shutdown();
  process.exit(code ?? 0);
});

vite.on("exit", (code, signal) => {
  if (shuttingDown) return;
  if (signal) shutdown();
  else if (code && code !== 0) shutdown();
  process.exit(code ?? 0);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
