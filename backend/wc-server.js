// backend/ws-server.js
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');

function createHttpAndWsServers({ port = process.env.PORT || 3000 } = {}) {
  const app = express();

  // Simple health endpoint for Render
  app.get('/health', (req, res) => res.status(200).send('OK - GCS Backend'));

  // You can serve a static status page or simple JSON if you want
  app.get('/', (req, res) => res.send('GCS Backend is running'));

  const server = http.createServer(app);

  // Create three WS servers but don't bind them to ports (noServer)
  const wssSignaling = new WebSocketServer({ noServer: true, clientTracking: true });
  const wssTelemetry  = new WebSocketServer({ noServer: true, clientTracking: true });
  const wssCommands   = new WebSocketServer({ noServer: true, clientTracking: true });

  // Upgrade routing
  server.on('upgrade', (req, socket, head) => {
    const { url } = req;
    if (url === '/ws/signaling') {
      wssSignaling.handleUpgrade(req, socket, head, (ws) => {
        wssSignaling.emit('connection', ws, req);
      });
    } else if (url === '/ws/telemetry') {
      wssTelemetry.handleUpgrade(req, socket, head, (ws) => {
        wssTelemetry.emit('connection', ws, req);
      });
    } else if (url === '/ws/commands') {
      wssCommands.handleUpgrade(req, socket, head, (ws) => {
        wssCommands.emit('connection', ws, req);
      });
    } else {
      // Unknown path -> destroy socket
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
    }
  });

  function listen() {
    return new Promise((resolve, reject) => {
      server.listen(port, () => {
        console.log(`🌐 HTTP+WS Server listening on port ${port}`);
        resolve(server);
      });
      server.on('error', reject);
    });
  }

  function close() {
    return new Promise((resolve) => {
      try {
        wssSignaling.clients.forEach(c => c.terminate());
        wssTelemetry.clients.forEach(c => c.terminate());
        wssCommands.clients.forEach(c => c.terminate());
      } catch (e) { /* ignore */ }
      server.close(() => resolve());
    });
  }

  return {
    server,
    wssSignaling,
    wssTelemetry,
    wssCommands,
    listen,
    close
  };
}

module.exports = { createHttpAndWsServers };
