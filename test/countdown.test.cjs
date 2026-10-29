const {test}=require('node:test'),assert=require('node:assert/strict'),{create,format}=require('../countdown');
function fixture(){let at=0,next=0;const active=new Map(),events=[];const clock=create({now:()=>at,onChange:value=>events.push(value),schedule:fn=>{active.set(++next,fn);return next;},cancel:id=>active.delete(id)});return {clock,events,active,advance(ms,tick=true){at+=ms;if(tick)for(const fn of [...active.values()])fn();}};}
test('countdown formats whole minutes and validates a new duration without interrupting a running one',()=>{
  assert.deepEqual([0,59,60,3661,-1,NaN].map(format),['0:00','0:59','1:00','61:01','0:00','0:00']);const f=fixture();f.clock.start(60000);
  for(const value of [0,-1,NaN,Infinity,10800001])assert.throws(()=>f.clock.start(value),/duration/);assert.equal(f.clock.snapshot().seconds,60);assert.equal(f.active.size,1);
});
test('pause retains exact remaining time, ignores time spent paused and resumes with one timer',()=>{
  const f=fixture();f.clock.start(5000);f.advance(1250,false);assert.equal(f.clock.pause(),true);assert.equal(f.clock.snapshot().remainingMs,3750);assert.equal(f.active.size,0);f.advance(8000);assert.equal(f.clock.snapshot().remainingMs,3750);
  assert.equal(f.clock.pause(),false);assert.equal(f.clock.resume(),true);assert.equal(f.clock.resume(),false);assert.equal(f.active.size,1);f.advance(1000);assert.equal(f.clock.snapshot().remainingMs,2750);assert.equal(f.clock.snapshot().seconds,3);
});
test('late ticks derive remaining duration and complete once without accumulating tick drift',()=>{
  const f=fixture();f.clock.start(5000);f.advance(3700);assert.equal(f.clock.snapshot().seconds,2);f.advance(10000);assert.deepEqual(f.clock.snapshot(),{phase:'finished',remainingMs:0,seconds:0});assert.equal(f.active.size,0);f.advance(5000);assert.equal(f.events.filter(e=>e.phase==='finished').length,1);assert.equal(f.clock.resume(),false);
});
test('restart and stop cancel prior timers, and unchanged seconds do not repaint repeatedly',()=>{
  const f=fixture();f.clock.start(5000);f.advance(50);f.advance(50);assert.equal(f.events.length,1);f.clock.start(2000);assert.equal(f.active.size,1);f.clock.stop();assert.equal(f.active.size,0);const count=f.events.length;f.advance(10000);assert.equal(f.events.length,count);assert.equal(f.clock.snapshot().phase,'idle');
});
test('pausing at the deadline completes instead of allowing a zero-length resume',()=>{
  const f=fixture();f.clock.start(1000);f.advance(1000,false);f.clock.pause();assert.equal(f.clock.snapshot().phase,'finished');assert.equal(f.clock.resume(),false);assert.equal(f.active.size,0);
});
