// ─────────────────────────────────────────────────────────────────────────────
// socket/chat.ts — Socket.io handlers for real-time dispute chat
//
// Every project has a chat room. Both parties (and the mediator) can join
// the room and send real-time messages.
// ─────────────────────────────────────────────────────────────────────────────

import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { config } from '../config';

interface ChatPayload {
  token:     string;
  projectId: number;
}

interface MessagePayload {
  projectId: number;
  text:      string;
}

export function registerChatHandlers(io: Server) {
  // Middleware to authenticate socket connections using JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    
    try {
      const payload = jwt.verify(token, config.jwtSecret) as any;
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    const role   = socket.data.role;

    // Join a project's chat room
    socket.on('join_project', async (data: ChatPayload) => {
      const { projectId } = data;
      
      // Verify authorization
      const project = await db.project.findUnique({ where: { id: projectId } });
      if (!project) return;
      
      const isMember = project.clientId === userId || project.freelancerId === userId;
      if (!isMember && role !== 'MEDIATOR') return;

      const roomName = `project_${projectId}`;
      socket.join(roomName);
    });

    // Handle sending a new message
    socket.on('send_message', async (data: MessagePayload) => {
      const { projectId, text } = data;
      if (!text || text.trim() === '') return;

      // 1. Save message to DB
      const msg = await db.chatMessage.create({
        data: { projectId, senderId: userId, text },
        include: { sender: { select: { name: true, role: true } } },
      });

      // 2. Broadcast to everyone in the room (including sender)
      io.to(`project_${projectId}`).emit('new_message', msg);
      
      // 3. Notify the other party if they aren't connected (simplified)
      const project = await db.project.findUnique({ where: { id: projectId } });
      if (project) {
        const otherId = project.clientId === userId ? project.freelancerId : project.clientId;
        await db.notification.create({
          data: {
            userId: otherId,
            message: `New chat message from ${msg.sender.name} in "${project.title}"`,
            link: `/projects/${projectId}/chat`
          }
        });
      }
    });

    socket.on('disconnect', () => {
      // Automatic cleanup handled by socket.io
    });
  });
}
