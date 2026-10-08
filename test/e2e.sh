#!/usr/bin/env bash
# SopForge e2e tests — exercise full flows through the real logic in Node.
set -u
cd "$(dirname "$0")/.."
PASS=0; FAIL=0
t() { # $1 = name, $2.. = node -e script (exit 0 = pass)
  local name="$1"; shift
  if node -e "$1" >/dev/null 2>&1; then echo "PASS: $name"; PASS=$((PASS+1));
  else echo "FAIL: $name"; FAIL=$((FAIL+1)); fi
}

t "flow 1: description -> 5+ steps" "
const F=require('./js/forge.js');
const sop=F.forgeSOP('Closing','Closer','Count the register and drop the cash in the safe. Turn off the open sign and lock the front door. Wipe down all counters. Take out the trash. Set the alarm and text the manager.');
if(sop.steps.length<5) throw new Error('only '+sop.steps.length+' steps');"

t "flow 2: checklist progress math" "
const F=require('./js/forge.js');
const sop=F.forgeSOP('T','R','Do a. Do b. Do c. Do d.');
sop.steps[0].done=true; sop.steps[1].done=true;
const done=sop.steps.filter(s=>s.done).length;
const pct=Math.round(done/sop.steps.length*100);
if(pct!==50) throw new Error('pct='+pct);"

t "flow 3: every template forges cleanly" "
const F=require('./js/forge.js');
F.TEMPLATES.forEach(tpl=>{
  const sop=F.forgeSOP(tpl.name,tpl.role,tpl.description);
  if(sop.steps.length<4) throw new Error(tpl.name+' -> '+sop.steps.length);
  sop.steps.forEach(s=>{ if(!s.tip||!s.owner) throw new Error('missing enrichment'); });
});"

t "flow 4: cash step gets Cashier owner + money tip" "
const F=require('./js/forge.js');
const sop=F.forgeSOP('T','R','Count the cash in the register and log the float.');
const s=sop.steps[0];
if(s.owner!=='Cashier') throw new Error('owner='+s.owner);
if(!/cash/i.test(s.tip)) throw new Error('tip='+s.tip);"

t "flow 5: explicit time honored, default sane" "
const F=require('./js/forge.js');
if(F.estimateTime('Let it dry for 15 minutes')!=='15 min') throw new Error('explicit');
if(F.estimateTime('Wipe the counter')!=='10 min') throw new Error('default');"

t "flow 6: empty/garbage input -> zero steps, no crash" "
const F=require('./js/forge.js');
if(F.forgeSOP('T','R','').steps.length!==0) throw new Error('empty');
if(F.forgeSOP('T','R','   ').steps.length!==0) throw new Error('blank');
if(F.forgeSOP('T','R','ok').steps.length!==0) throw new Error('single word');"

t "flow 7: totalTime computed and steps numbered" "
const F=require('./js/forge.js');
const sop=F.forgeSOP('T','R','Do a. Do b. Do c.');
if(!sop.totalTime) throw new Error('no totalTime');
sop.steps.forEach((s,i)=>{ if(s.n!==i+1) throw new Error('numbering'); });"

t "flow 8: add two steps then remove one -> numbering stays clean" "
const F=require('./js/forge.js');
const sop=F.forgeSOP('Close','Closer','Count the register. Lock the front door.');
F.addStep(sop,'Take out the trash');
F.addStep(sop,'Set the alarm');
if(sop.steps.length!==4) throw new Error('count '+sop.steps.length);
F.removeStep(sop,0);
if(sop.steps.length!==3) throw new Error('remove');
sop.steps.forEach((s,i)=>{ if(s.n!==i+1) throw new Error('renumber'); });
if(sop.steps[0].text.indexOf('Lock the front door')!==0) throw new Error('order');"

t "flow 9: exports reflect done-state and enrichment" "
const F=require('./js/forge.js');
const sop=F.forgeSOP('Close','Closer','Count the cash in the register. Lock the front door.');
sop.steps[0].done=true;
const csv=F.sopToCSV(sop);
if(!/\"Cashier\"/.test(csv)) throw new Error('owner missing');
if((csv.match(/\"yes\"/g)||[]).length!==1) throw new Error('done flag');
const md=F.sopToMarkdown(sop);
if(!md.includes('- [x]')) throw new Error('md checked box');
if(!md.includes('- [ ]')) throw new Error('md unchecked box');"

t "flow 10: addStep enrichment matches forge-time enrichment" "
const F=require('./js/forge.js');
const a=F.forgeSOP('T','R','Count the cash in the register.');
const sop=F.forgeSOP('T','R','Wipe the counter.');
const b=F.addStep(sop,'Count the cash in the register');
if(a.steps[0].owner!==b.owner||a.steps[0].tip!==b.tip) throw new Error('mismatch');"

echo "----"
echo "e2e: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
