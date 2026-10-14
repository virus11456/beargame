import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,step,serialize,parseSave,config} from '../src/sim.js';
import {buildPads,updateAssistant,weaponStats} from '../src/progression.js';
import {loadGame,SAVE_KEY} from '../src/storage.js';
const run=(s,seconds)=>{for(let i=0;i<seconds*30;i++)step(s,1/30);};
test('ground construction charges once until player leaves',()=>{
 const s=fresh(),pad=buildPads.find(p=>p.id==='bag');s.x=pad.x;s.z=pad.z;
 run(s,3);assert.equal(s.upgrades.bag,0);s.coins=500;
 run(s,3);assert.equal(s.upgrades.bag,1);assert.equal(s.coins,452);
 run(s,3);assert.equal(s.coins,452);s.z=7;run(s,.1);s.z=pad.z;
 run(s,2);assert.equal(s.upgrades.bag,2);assert.equal(s.coins,356);
});
test('leaving a construction pad cancels partial progress',()=>{
 const s=fresh();s.coins=500;s.x=-8;s.z=10.5;run(s,1);s.z=7;run(s,.1);s.z=10.5;run(s,1);
 assert.equal(s.upgrades.weapon,0);assert.equal(s.coins,500);
});
test('assistant travels, collects and deposits without losing meat',()=>{
 const s=fresh();s.helper=true;s.x=13;s.z=8;
 s.drops=Array.from({length:12},()=>({x:-12,z:-8,type:'raw'}));
 run(s,1);assert.ok(s.assistant.z<6);assert.equal(s.sold,0);
 run(s,60);assert.equal(s.sold,12);assert.equal(s.assistant.load,0);assert.equal(s.drops.length,0);
 assert.equal(s.queues.cut.length+s.queues.grill.length+s.queues.sell.length+s.outputs.cut+s.outputs.grill,0);
});
test('assistant waits with its cargo at a full receiving queue',()=>{
 const s=fresh();s.helper=true;Object.assign(s.assistant,{x:-6,z:4.7,load:12,phase:'return'});
 s.queues.cut=Array(config.queueLimit).fill('raw');updateAssistant(s,1,config.queueLimit,[]);
 assert.equal(s.assistant.load,12);s.queues.cut.pop();updateAssistant(s,1,config.queueLimit,[]);
 assert.equal(s.assistant.load,11);assert.equal(s.queues.cut.length,config.queueLimit);
 assert.equal(parseSave(serialize(s)).assistant.load,11);
});
test('version 2 saves migrate through storage without losing progress',()=>{
 const old=fresh();old.version=2;delete old.assistant;delete old.buildHold;old.coins=777;old.bag=['raw'];old.helper=true;
 const loaded=loadGame({getItem:key=>key===SAVE_KEY?JSON.stringify(old):null});
 assert.equal(loaded.state.version,3);assert.equal(loaded.state.coins,777);assert.deepEqual(loaded.state.bag,['raw']);assert.equal(loaded.state.helper,true);assert.equal(loaded.notice,'');
});
test('loading does not resume a pending automatic purchase',()=>{
 const s=fresh();s.buildHold={id:'weapon',t:1.7,latched:false};
 assert.deepEqual(parseSave(serialize(s)).buildHold,{id:null,t:0,latched:false});
});
test('weapon progression enables ranged hits outside spear reach',()=>{
 for(const [level,z,hits] of [[0,-1,false],[2,-1,true],[4,.5,true]]){
 const s=fresh();s.z=z;s.upgrades.weapon=level;
 const events=step(s,1/30);assert.equal(events.some(e=>e.type==='hit'),hits);
 }
 assert.equal(weaponStats(4).tier,'crossbow');assert.ok(weaponStats(4).interval<weaponStats(2).interval);
});
