'use strict';
// Smoke test of the browser script with a simulated DOM and animation clock.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

test('cliente entra, move, pula e evita múltiplos loops ao reentrar', () => {
  let queue=[], now=0, sockets=[]; const handlers={};
  const ctx=new Proxy({}, {get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  ctx.createLinearGradient=()=>({addColorStop(){}});
  class Element {
    constructor(id){this.id=id;this.value='';this.hidden=false;this.style={};this.listeners={};this.textContent='';this.options=[];this.dataset={};this.classList={add(){},remove(){}}}
    addEventListener(n,f){(this.listeners[n]??=[]).push(f)}
    fire(n,e={}){for(const f of this.listeners[n]||[])f({preventDefault(){},...e})}
    getContext(){return ctx} setCustomValidity(){} reportValidity(){} setPointerCapture(){}
  }
  const elements={};for(const id of ['canvas','form','name','room','color','banner','theme','notice','victory','boss-ui','objective','hp-fill','hp-text','boss-fill','status','setup','game','display-name','room-label','avatar-icon','exit','again'])elements[id]=new Element(id);
  elements.room.value='discord';elements.color.value='#70e1d3';elements.banner.value='sol';elements.theme.value='aurora';elements.form.elements={class:{value:'cavaleiro'}};
  elements.banner.options=['sol','lua','estrela'].map(value=>({value}));elements.theme.options=['aurora','violeta','floresta'].map(value=>({value}));
  const buttons=['left','right','jump','attack'].map(key=>{let e=new Element(key);e.dataset.key=key;return e});
  class Socket {static OPEN=1;constructor(){this.readyState=1;this.sent=[];sockets.push(this)}send(s){this.sent.push(JSON.parse(s))}close(){this.readyState=3}}
  const context={document:{getElementById:id=>elements[id],querySelectorAll:()=>buttons},window:{addEventListener:(n,f)=>{(handlers[n]??=[]).push(f)}},localStorage:{getItem:()=>null,setItem(){}},location:{protocol:'http:',host:'localhost:3000'},WebSocket:Socket,requestAnimationFrame:f=>queue.push(f),performance:{now:()=>now},Math,Map,JSON};
  const game = ['game.part1','game.part2','game.part3'].map(f => fs.readFileSync(path.join(__dirname,'../public',f))).reduce((a,b) => Buffer.concat([a,b]), Buffer.alloc(0)).toString('utf8');
  vm.runInNewContext(game,context);
  function frame(){const callbacks=queue;queue=[];now+=50;for(const f of callbacks)f(now)}
  elements.form.fire('submit');assert.equal(elements.game.hidden,false);sockets[0].onopen();assert.equal(sockets[0].sent[0].type,'join');
  frame();frame();buttons[1].fire('pointerdown',{pointerId:1});for(let i=0;i<8;i++)frame();buttons[1].fire('pointerup');const moves=sockets[0].sent.filter(m=>m.type==='move');assert(moves.at(-1).x>130);
  buttons[2].fire('pointerdown',{pointerId:2});for(let i=0;i<4;i++)frame();buttons[2].fire('pointerup');assert(sockets[0].sent.filter(m=>m.type==='move').some(m=>m.y<436));
  elements.exit.onclick();elements.form.fire('submit');frame();assert.equal(queue.length,1,'reentrada deve manter apenas um loop');
  buttons[3].fire('pointerdown',{pointerId:3});for(let i=0;i<3;i++)frame();assert(sockets[1].sent.some(m=>m.action==='attack'));
});
