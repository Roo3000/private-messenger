import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    path: "/api/socketio",
    addTrailingSlash: false,
    cors: { origin: "*" },
  });

  // Expose io for API routes
  (global as any).__io = io;

  io.on("connection", (socket) => {
    socket.on("join", (conversationId: string) => {
      if (typeof conversationId === "string") {
        socket.join(`conv:${conversationId}`);
      }
    });

    socket.on("leave", (conversationId: string) => {
      if (typeof conversationId === "string") {
        socket.leave(`conv:${conversationId}`);
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});