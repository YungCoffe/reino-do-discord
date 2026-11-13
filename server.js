'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { WebSocketServer, WebSocket } = require('ws');

const files = { '/': ['index.html', 'text/html; charset=utf-8'], '/index.html': ['index.html', 'text/html; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'], '/game.js': ['game.js', 'text/javascript; charset=utf-8'] };
const MAX_ROOM = 12, MAX_CONNECTIONS = 120;
const cleanName = v => typeof v === 'string' ? v.replace(/[\x00-\x1f\x7f<>]/g, '').trim().slice(0, 20) || 'Aventureiro' : 'Aventureiro';
const validRoom = v => typeof v === 'string' && /^[a-z0-9-]{1,16}$/.test(v);
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const finite = n => typeof n === 'number' && Number.isFinite(n);
function createServer() {
  const rooms = new Map(); // Isolated per server instance.
  const server = http.createServer((req, res) => {
    const entry = files[(req.url || '').split('?')[0]];
    if (req.method !== 'GET' || !entry) { res.writeHead(404); return res.end('Não encontrado'); }
    fs.readFile(path.join(__dirname, 'public', entry[0]), (err, data) => {
      if (err) { res.writeHead(500); return res.end('Erro'); }
      res.writeHead(200, { 'Content-Type': entry[1], 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; connect-src 'self' ws: wss:; style-src 'self'; script-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'", 'Cache-Control': 'no-store' }); res.end(data);
    });
  });
  const wss = new WebSocketServer({ server, maxPayload: 1024, perMessageDeflate: false });
  function send(ws, obj) {
    if (ws.readyState !== WebSocket.OPEN) return;
    if (ws.bufferedAmount > 65536) return ws.terminate();
    ws.send(JSON.stringify(obj));
  }
  function broadcast(room, obj, except) { const peers = rooms.get(room); if (peers) for (const p of peers) if (p !== except) send(p, obj); }
  wss.on('connection', ws => {
    if (wss.clients.size > MAX_CONNECTIONS) return ws.close(1013, 'Servidor cheio');
    let player = null, room = null, count = 0, reset = Date.now(), alive = true;
    const joinTimeout = setTimeout(() => { if (!player) ws.terminate(); }, 10000);
    ws.on('pong', () => { alive = true; });
    const heartbeat = setInterval(() => { if (!alive) return ws.terminate(); alive = false; ws.ping(); }, 30000);
    ws.on('message', (data, binary) => {
      if (binary) return ws.close(1003, 'Somente texto');
      const now = Date.now(); if (now - reset >= 1000) { reset = now; count = 0; }
      if (++count > 30) return ws.close(1008, 'Limite de mensagens');
      let msg; try { msg = JSON.parse(data.toString()); } catch { return; }
      if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return;
      if (!player) {
        if (msg.type !== 'join' || !validRoom(msg.room)) return ws.close(1008, 'Sala inválida');
        room = msg.room; const peers = rooms.get(room) || new Set();
        if (peers.size >= MAX_ROOM) return ws.close(1013, 'Sala cheia');
        player = { id: randomUUID(), name: cleanName(msg.name), color: typeof msg.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(msg.color) ? msg.color : '#70e1d3', banner: ['sol','lua','estrela'].includes(msg.banner) ? msg.banner : 'sol', avatar: ['cavaleiro','arqueira','mago'].includes(msg.avatar) ? msg.avatar : 'cavaleiro', x: 130, y: 400, dir: 1, action: 'idle' };
        clearTimeout(joinTimeout);
        const others = [...peers].map(p => p.player); ws.player = player; peers.add(ws); rooms.set(room, peers);
        send(ws, { type:'welcome', id: player.id, room, players: others }); broadcast(room, { type:'join', player }, ws); return;
      }
      if (msg.type === 'move' && finite(msg.x) && finite(msg.y)) {
        player.x = clamp(msg.x, 0, 6000); player.y = clamp(msg.y, -500, 1200); player.dir = msg.dir === -1 ? -1 : 1;
        player.action = ['idle','run','jump','attack'].includes(msg.action) ? msg.action : 'idle';
        broadcast(room, { type:'move', id:player.id, x:player.x, y:player.y, dir:player.dir, action:player.action }, ws);
      }
    });
    ws.on('error', () => {});
    ws.on('close', () => { clearTimeout(joinTimeout); clearInterval(heartbeat); if (!player) return; const peers = rooms.get(room); if (!peers) return; peers.delete(ws); broadcast(room, { type:'leave', id:player.id }); if (!peers.size) rooms.delete(room); });
  });
  server.on('close', () => { for (const ws of wss.clients) ws.terminate(); });
  return { server, wss, rooms };
}
if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer().server.listen(port, '0.0.0.0', () => console.log(`Reino dos Ecos em http://localhost:${port}`));
}
module.exports = { createServer, cleanName, validRoom };
