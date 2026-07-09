import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./src/server/socket";
import { ensureSchema } from "./src/server/ensureSchema";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  void ensureSchema();
  const httpServer = createServer((req, res) => {
    void handle(req, res);
  });

  const io = new Server(httpServer, {
    path: "/api/socket",
    cors: { origin: "*" }
  });

  registerSocketHandlers(io);

  httpServer.listen(port, hostname, () => {
    console.log(`⚔️  Battle Draft ready on http://${hostname}:${port}`);
  });
});
