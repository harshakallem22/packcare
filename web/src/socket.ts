import { io, Socket } from 'socket.io-client';
import { GATEWAY_URL } from './config';
import type { ServerToClientEvents, ClientToServerEvents } from './types';

// One Socket.IO connection to the Gateway. Auth rides on the HttpOnly session cookie
// (withCredentials), so we connect only after login. The Gateway joins us to a room per
// household at handshake time → we only ever receive our own households' events.
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(GATEWAY_URL, {
  withCredentials: true,
  autoConnect: false,
});
