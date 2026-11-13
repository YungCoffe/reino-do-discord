'use strict';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');
const { createServer, cleanName, validRoom } = require('../server');
const instance=createServer();
const ready=new Promise(r=>instance.server.listen(0,'127.0.0.1',r));
after(()=>new Promise(r=>instance.server.close(r)));
async function connect(room,name='Teste'){await ready;const ws=new WebSocket(`ws://127.0.0.1:${instance.server.address().port}`);const events=[];ws.on('message',d=>events.push(JSON.parse(d)));await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j)});ws.send(JSON.stringify({type:'join',room,name,color:'#ff0000',banner:'sol',avatar:'mago'}));await until(()=>events.some(x=>x.type==='welcome'));return {ws,events}}
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,10))}throw Error('Tempo esgotado')}
function close(x){x.ws.close()}
test('sanitiza e limita entradas',()=>{assert.equal(cleanName('<script>\u0000'),'script');assert.equal(cleanName('a'.repeat(50)).length,20);assert.equal(validRoom('abc-12'),true);assert.equal(validRoom('../x'),false)});
test('arquivos públicos e caminhos restritos',async()=>{await ready;let base=`http://127.0.0.1:${instance.server.address().port}`;assert.equal((await fetch(base+'/')).status,200);assert.equal((await fetch(base+'/game.js')).status,200);assert.equal((await fetch(base+'/server.js')).status,404);assert.equal((await fetch(base+'/')).headers.get('x-content-type-options'),'nosniff')});
test('salas isoladas, presença, movimento limitado e saída',async()=>{let a=await connect('sala','<Ana>'),b=await connect('sala','Bia'),c=await connect('outra','Cris');try{await until(()=>a.events.some(x=>x.type==='join'));assert.equal(a.events.find(x=>x.type==='join').player.name,'Bia');assert.equal(b.events.find(x=>x.type==='welcome').players[0].name,'Ana');a.ws.send(JSON.stringify({type:'move',x:999999,y:-999999,dir:-1,action:'attack'}));await until(()=>b.events.some(x=>x.type==='move'));const move=b.events.find(x=>x.type==='move');assert.equal(move.x,6000);assert.equal(move.y,-500);assert.equal(move.action,'attack');await new Promise(r=>setTimeout(r,60));assert.equal(c.events.some(x=>x.type==='move'),false);close(a);await until(()=>b.events.some(x=>x.type==='leave'))}finally{close(b);close(c)}});
test('sala inválida é rejeitada',async()=>{await ready;const ws=new WebSocket(`ws://127.0.0.1:${instance.server.address().port}`);await new Promise(r=>ws.once('open',r));const closed=new Promise(r=>ws.once('close',(code)=>r(code)));ws.send(JSON.stringify({type:'join',room:'<x>'}));assert.equal(await closed,1008)});
