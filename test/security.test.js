'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');
const { createServer } = require('../server');

async function fixture() {
  const instance = createServer();
  await new Promise(resolve => instance.server.listen(0, '127.0.0.1', resolve));
  const url = `ws://127.0.0.1:${instance.server.address().port}`;
  async function open() {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
    return ws;
  }
  async function stop() {
    for (const ws of instance.wss.clients) ws.terminate();
    await new Promise(resolve => instance.server.close(resolve));
  }
  return { instance, open, stop };
}
function message(ws) { return new Promise(resolve => ws.once('message', data => resolve(JSON.parse(data)))); }
function closed(ws) { return new Promise(resolve => ws.once('close', code => resolve(code))); }

test('cor não textual maliciosa não derruba servidor', async () => {
  const f = await fixture();
  try {
    const ws = await f.open();
    const welcome = message(ws);
    ws.send(JSON.stringify({type:'join', room:'teste', color:{toString:1}}));
    assert.equal((await welcome).type, 'welcome');
    assert.equal([...f.instance.rooms.get('teste')][0].player.color, '#70e1d3');
    assert.equal((await fetch(`http://127.0.0.1:${f.instance.server.address().port}/`)).status, 200);
  } finally { await f.stop(); }
});

test('limite de sala e mensagens excessivas são aplicados', async () => {
  const f = await fixture();
  try {
    for (let i=0; i<12; i++) {
      const ws = await f.open(); const welcome = message(ws);
      ws.send(JSON.stringify({type:'join', room:'cheia'}));
      assert.equal((await welcome).type, 'welcome');
    }
    const extra = await f.open(); const full = closed(extra);
    extra.send(JSON.stringify({type:'join', room:'cheia'}));
    assert.equal(await full, 1013);
    const noisy = await f.open(); const limited = closed(noisy);
    noisy.send(JSON.stringify({type:'join', room:'outra'}));
    for (let i=0; i<31; i++) noisy.send('{}');
    assert.equal(await limited, 1008);
  } finally { await f.stop(); }
});

test('binário e payload excessivo são rejeitados', async () => {
  const f = await fixture();
  try {
    const binary = await f.open(); const bclosed = closed(binary); binary.send(Buffer.from('x'));
    assert.equal(await bclosed, 1003);
    const large = await f.open(); const lclosed = closed(large); large.send('x'.repeat(1025));
    assert.equal(await lclosed, 1009);
  } finally { await f.stop(); }
});

test('instâncias independentes não compartilham salas', async () => {
  const a = await fixture(), b = await fixture();
  try {
    const ws = await a.open(); const welcome = message(ws);
    ws.send(JSON.stringify({type:'join', room:'separada'})); await welcome;
    assert.equal(a.instance.rooms.size, 1);
    assert.equal(b.instance.rooms.size, 0);
  } finally { await a.stop(); await b.stop(); }
});
