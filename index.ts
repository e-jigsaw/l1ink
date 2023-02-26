import { Server } from "@hocuspocus/server";
import { SQLite } from "@hocuspocus/extension-sqlite";
import { Logger } from "@hocuspocus/extension-logger";

const server = Server.configure({
  extensions: [
    new SQLite({
      database: "db.sqlite",
    }),
    new Logger(),
  ],
  port: 1234,
});

server.listen();
