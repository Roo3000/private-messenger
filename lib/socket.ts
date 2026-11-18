import type { Server as SocketIOServer } from "socket.io";

export function getIO(): SocketIOServer | null {
  return (global as any).__io ?? null;
}

export function emitNewMessage(conversationId: string, message: unknown) {
  const io = getIO();
  if (!io) return;
  io.to(`conv:${conversationId}`).emit("message:new", message);
}