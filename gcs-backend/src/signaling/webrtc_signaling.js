// backend/src/signaling/webrtc_signaling.js
import { WebSocketServer } from 'ws';

/**
 * Simple WebRTC signaling server.
 * Mounts on server upgrade path '/signal' (noServer).
 *
 * Protocol (JSON messages):
 *  { type: 'join', room: 'demo', role: 'streamer' | 'viewer' }
 *  { type: 'offer', room: 'demo', sdp: <offer> }
 *  { type: 'answer', room: 'demo', sdp: <answer> }
 *  { type: 'candidate', room: 'demo', candidate: <ice> }
 *
 * The server relays messages between streamer and viewer(s) in the same room.
 *
 * This module exports startSignaling(server).
 */

export function startSignaling(server) {
  const wss = new WebSocketServer({ noServer: true });

  // Room => Set of ws clients with metadata { ws, role }
  const rooms = new Map();

  function joinRoom(roomId, ws, role) {
    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    const set = rooms.get(roomId);
    set.add({ ws, role });
    ws._roomId = roomId;
    ws._role = role;
  }

  function leaveRoom(ws) {
    const roomId = ws._roomId;
    if (!roomId) return;
    const set = rooms.get(roomId);
    if (!set) return;
    // remove entry for ws
    for (const item of set) {
      if (item.ws === ws) {
        set.delete(item);
        break;
      }
    }
    if (set.size === 0) rooms.delete(roomId);
  }

  server.on('upgrade', (request, socket, head) => {
    // route only '/signal' upgrades to this wss
    const { url } = request;
    if (url === '/signal') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
    // other upgrades are handled elsewhere (telemetry WS)
  });

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => (ws.isAlive = true));

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch (e) {
        console.warn('Invalid signaling message', e);
        return;
      }

      // join message
      if (msg.type === 'join' && msg.room) {
        const role = msg.role || 'viewer';
        joinRoom(msg.room, ws, role);
        ws.send(JSON.stringify({ type: 'joined', room: msg.room, role }));
        return;
      }

      const roomId = msg.room || ws._roomId;
      if (!roomId) {
        ws.send(JSON.stringify({ type: 'error', message: 'not in room' }));
        return;
      }

      // Relay messages to all other clients in the room
      const set = rooms.get(roomId);
      if (!set) return;

      // offer / answer / candidate messages: forward to other clients
      if (msg.type === 'offer' || msg.type === 'answer' || msg.type === 'candidate') {
        for (const item of set) {
          // skip sender
          if (item.ws === ws) continue;
          try {
            item.ws.send(JSON.stringify(msg));
          } catch (e) { /* ignore */ }
        }
      }
    });

    ws.on('close', () => {
      leaveRoom(ws);
    });
  });

  // periodic ping to detect dead clients
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));

  console.log('WebRTC signaling server mounted at /signal');
}
