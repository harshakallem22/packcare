import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { config } from './config';
import { verifySession } from './auth/jwt';
import { COOKIE_NAME } from './auth/jwt';
import { careLog } from './clients/careLog';
import { claimPresence } from './redis';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from './events';

export type AppServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

function parseCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

export function createSocketServer(httpServer: HttpServer): AppServer {
  const io: AppServer = new Server(httpServer, {
    cors: { origin: config.webOrigin, credentials: true },
  });

  // Authenticate the JWT from the cookie at handshake time.
  io.use((socket, next) => {
    const token = parseCookie(socket.handshake.headers.cookie, COOKIE_NAME);
    const claims = token ? verifySession(token) : null;
    if (!claims) return next(new Error('unauthenticated'));
    socket.data.userId = claims.userId;
    socket.data.email = claims.email;
    socket.data.displayName = claims.displayName;
    next();
  });

  io.on('connection', async (socket) => {
    // Join one room per household the caregiver belongs to → tenant isolation at the
    // transport layer; a caregiver only ever receives their own households' events.
    try {
      const { body } = await careLog.listHouseholds(socket.data.userId);
      for (const h of (body as Array<{ _id: string }>) ?? []) {
        socket.join(`household:${h._id}`);
      }
    } catch (err) {
      console.error('[gateway] socket room join failed:', (err as Error).message);
    }

    // dose:intent → claim a 30s presence lock and tell the room "about to log this".
    socket.on('dose:intent', async ({ householdId, petId, medId }) => {
      const room = `household:${householdId}`;
      if (!socket.rooms.has(room)) return; // only for households this caregiver belongs to
      await claimPresence(`${petId}:${medId}`, socket.data.userId);
      io.to(room).emit('presence:update', {
        householdId,
        petId,
        medId,
        userId: socket.data.userId,
        displayName: socket.data.displayName,
        active: true,
      });
    });
  });

  return io;
}
