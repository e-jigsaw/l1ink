import sqlite3 from "sqlite3";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { open } from "sqlite";
import { randomUUID } from "crypto";
import { cors } from "hono/cors";

type Key = {
  id: string;
  title: string;
};

const db = await open({
  filename: "db.sqlite",
  driver: sqlite3.Database,
});

const checkDuplicateKey = async (key: string) => {
  const res = await db.all(`SELECT id FROM keys WHERE id = "${key}"`);
  return res.length === 0;
};

const insertKey = async (key: string) => {
  return db.run(
    `INSERT INTO keys(id, title, created) values (?, ?, ?)`,
    key,
    "Untitled",
    new Date().getTime()
  );
};

const upsertKey = async (id: string, title: string) => {
  return db.run(
    `UPDATE keys SET title = ?, updated = ? WHERE id = ?`,
    title,
    new Date().getTime(),
    id
  );
};

const latestKeys = () => {
  return db.all(`SELECT id, title FROM keys LIMIT 20`);
};

const app = new Hono();
app.use(
  "*",
  cors({
    origin: "http://localhost:3000",
  })
);
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
app.post("/title", async (c) => {
  const body = await c.req.json();
  if (body.id && body.title) {
    await upsertKey(body.id, body.title);
    return c.json({ ok: true });
  }
  return c.json({ ok: false });
});
app.get("/keys", async (c) => {
  const payload = (await latestKeys()) as Key[];
  return c.json({ ok: true, payload });
});
serve({
  fetch: app.fetch,
  port: 12345,
});
