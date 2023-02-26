import sqlite3 from "sqlite3";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { open } from "sqlite";
import { randomUUID } from "crypto";

const db = await open({
  filename: "db.sqlite",
  driver: sqlite3.Database,
});

const checkDuplicateKey = async (key: string) => {
  const res = await db.all(`SELECT id FROM keys WHERE id = "${key}"`);
  return res.length === 0;
};

const insertKey = async (key: string) => {
  return db.run(`INSERT INTO keys(id, title) values (?, ?)`, key, "Untitled");
};

const app = new Hono();
app.get("/new", async (c) => {
  let candidate = randomUUID();
  while (1) {
    const res = await checkDuplicateKey(candidate);
    if (res) {
      break;
    } else {
      candidate = randomUUID();
    }
  }
  await insertKey(candidate);
  return c.json({ ok: true, payload: { key: candidate } });
});
serve({
  fetch: app.fetch,
  port: 12345,
});
