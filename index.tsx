import fs from "fs";
import path from "path";
import { render } from "ink";
import React from "react";
import App from "./ui";

const logPath = path.join(process.env.HOME || "~", ".command_stats.log");
const raw = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "";
const today = new Date().toISOString().slice(0, 10);

const counts = raw
  .split("\n")
  .filter(Boolean)
  .filter((l) => l.slice(0, 10) === today)
  .map((l) => {
    const p = l.split("|")[1] || "";
    return p.trim().split(/\s+/)[0] || "";
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
