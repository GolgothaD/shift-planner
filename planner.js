// Pure planning logic (shared by app + tests)
const DAY=1440;
function toMin(t){const[h,m]=t.split(':').map(Number);return h*60+m;}
function fmt(m){m=((m%DAY)+DAY)%DAY;let h=Math.floor(m/60),mm=m%60,ap=h<12?'AM':'PM';h=h%12||12;return h+':'+String(mm).padStart(2,'0')+' '+ap;}
// shifts: [{day:0-6 (Mon=0), start:'HH:MM', end:'HH:MM'}]; returns absolute minutes in week
function shiftAbs(s){const st=s.day*DAY+toMin(s.start);let en=s.day*DAY+toMin(s.end);if(en<=st)en+=DAY;return{st,en};}
function plan(shifts,tasks,set,nowAbs){
  nowAbs=nowAbs||0;const blocks=[];const busy=[];
  const sh=shifts.map(shiftAbs).sort((a,b)=>a.st-b.st);
  sh.forEach(s=>{blocks.push({type:'shift',st:s.st,en:s.en,label:'Shift'});
    const pre=set.commute+set.bufferBefore,post=set.commute+set.bufferAfter;
    if(pre)blocks.push({type:'buffer',st:s.st-pre,en:s.st,label:'Commute / get ready'});
    if(post)blocks.push({type:'buffer',st:s.en,en:s.en+post,label:'Commute / wind down'});
    busy.push([s.st-pre,s.en+post]);});
  // sleep: one block per night; after a late/overnight shift, sleep right after it, else default bedtime
  const sl=set.sleepHours*60,bed=toMin(set.bedtime||'23:00');
  for(let d=-1;d<7;d++){let st=d*DAY+bed;
    const ends=busy.filter(b=>b[1]>st-6*60&&b[1]<st+10*60).map(b=>b[1]);
    if(ends.length){const e=Math.max(...ends);if(e>st)st=e;}
    // don't overlap next shift: move earlier if needed
    const next=busy.filter(b=>b[0]>=st-60&&b[0]<st+sl).map(b=>b[0]);
    if(next.length){const n=Math.min(...next);if(n<st+sl)st=Math.max(n-sl,st-6*60);}
    let en=Math.min(st+sl,next.length?Math.min(...next):Infinity);
    if(en>st){blocks.push({type:'sleep',st,en,label:'Sleep'});busy.push([st,en]);}}
  // free windows in week [0,7*DAY), from now
  busy.sort((a,b)=>a[0]-b[0]);const free=[];let cur=Math.max(0,nowAbs);
  for(const[a,b]of busy){if(a>cur)free.push([cur,Math.min(a,7*DAY)]);cur=Math.max(cur,b);if(cur>=7*DAY)break;}
  if(cur<7*DAY)free.push([cur,7*DAY]);
  const fw=free.filter(f=>f[1]-f[0]>=15).map(f=>({st:f[0],en:f[1]}));
  fw.forEach(f=>blocks.push({type:'free',st:f.st,en:f.en,label:'Free'}));
  // schedule tasks: priority (1 high) then deadline
  const pend=tasks.filter(t=>!t.done).slice().sort((a,b)=>(a.priority-b.priority)||((a.deadline??1e9)-(b.deadline??1e9)));
  const slots=fw.map(f=>({...f}));const sched=[],unsched=[];
  for(const t of pend){let ok=false;
    for(const s of slots){if(s.en-s.st>=t.duration){const dl=t.deadline!=null?t.deadline:Infinity;
      if(s.st+t.duration<=dl){sched.push({type:'task',st:s.st,en:s.st+t.duration,label:t.title,task:t});s.st+=t.duration+10;ok=true;break;}}}
    if(!ok)unsched.push(t);}
  blocks.push(...sched);blocks.sort((a,b)=>a.st-b.st);
  return{blocks,sched,unsched,free:fw};}
function ics(shifts,weekStart){// weekStart: Date (Monday 00:00 local)
  const p=n=>String(n).padStart(2,'0');
  const f=d=>d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'T'+p(d.getHours())+p(d.getMinutes())+'00';
  let o='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//ShiftPlanner//EN\r\n';
  shifts.forEach((s,i)=>{const{st,en}=shiftAbs(s);const a=new Date(weekStart.getTime()+st*60000),b=new Date(weekStart.getTime()+en*60000);
    o+='BEGIN:VEVENT\r\nUID:shift-'+f(a)+'-'+i+'@shiftplanner\r\nDTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z'+'\r\nDTSTART:'+f(a)+'\r\nDTEND:'+f(b)+'\r\nSUMMARY:Work shift\r\nEND:VEVENT\r\n';});
  return o+'END:VCALENDAR\r\n';}
if(typeof module!=='undefined')module.exports={plan,ics,shiftAbs,toMin,fmt};
