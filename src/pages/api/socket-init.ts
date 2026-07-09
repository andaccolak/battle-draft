import type { NextApiRequest, NextApiResponse } from "next";
import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { registerSocketHandlers } from "@/server/socket";
import { ensureSchema } from "@/server/ensureSchema";

interface SocketServerHolder {
  __bdIo?: Server;
  __bdSchema?: boolean;
}

export default function handler(req: NextApiRequest, res: NextApiResponse): void {
  const g = globalThis as unknown as SocketServerHolder;
  const httpServer = (res.socket as unknown as { server?: HttpServer } | null)?.server;
  if (!g.__bdIo && httpServer) {
    const io = new Server(httpServer, {
      path: "/api/socket",
      cors: { origin: "*" }
    });
    registerSocketHandlers(io);
    g.__bdIo = io;
  }
  if (!g.__bdSchema) {
    g.__bdSchema = true;
    void ensureSchema();
  }
  res.status(200).json({ ready: Boolean(g.__bdIo) });
}
