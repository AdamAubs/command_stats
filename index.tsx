import fs from "fs";
import path from "path";
import { render } from "ink";
import React from "react";
import App from "./ui";

const home = process.env.HOME || "~";
const stateHome =
  process.env.XDG_STATE_HOME || path.join(home, ".local", "state");
const logPath = path.join(stateHome, "command-stats", "commands.log");
const raw = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "";
const today = new Date().toISOString().slice(0, 10);

const counts = raw
  .split("\n")
  .filter(Boolean)
  .filter((line) => line.slice(0, 10) === today)
  .map((line) => {
    const payload = line.split("|")[1] || "";
    return payload.trim().split(/\s+/)[0] || "";
  })
  .reduce<Record<string, number>>((acc, cmd) => {
    if (!cmd) return acc;
    acc[cmd] = (acc[cmd] || 0) + 1;
    return acc;
  }, {});

const items = Object.entries(counts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30);
render(<App items={items} />);
