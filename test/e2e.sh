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

t "flow 11: moveStep reorders steps and renumbers" "
const F=require('./js/forge.js');
const sop=F.forgeSOP('T','R','1. Count the cash\n2. Wipe the counter\n3. Lock the door');
if(!F.moveStep(sop,1,-1)) throw new Error('move up failed');
if(sop.steps[0].text.indexOf('Wipe')!==0) throw new Error('wrong order: '+sop.steps[0].text);
if(sop.steps[0].n!==1||sop.steps[1].n!==2) throw new Error('not renumbered');
if(!F.moveStep(sop,0,1)) throw new Error('move down failed');
if(sop.steps[0].text.indexOf('Count')!==0) throw new Error('move down wrong');
if(F.moveStep(sop,0,-1)) throw new Error('move past top should fail');
if(F.moveStep(sop,2,1)) throw new Error('move past bottom should fail');
if(F.moveStep(sop,5,-1)) throw new Error('out of range should fail');"

t "flow 12: stepMinutes parses time labels" "
const F=require('./js/forge.js');
if(F.stepMinutes('10 min')!==10) throw new Error('10 min');
if(F.stepMinutes('1h 30m')!==90) throw new Error('1h 30m');
if(F.stepMinutes('2 hours')!==120) throw new Error('2 hours');
if(F.stepMinutes('5 mins')!==5) throw new Error('5 mins');
if(F.stepMinutes('whatever')!==10) throw new Error('fallback should be 10');"

t "flow 13: snapshotSOP deep-copies; restoreVersion rolls back" "
const F=require('./js/forge.js');
const sop=F.forgeSOP('T','R','1. Count the cash\n2. Wipe the counter');
const v=F.snapshotSOP(sop);
if(!v.at||v.stepCount!==2) throw new Error('bad snapshot');
F.addStep(sop,'Lock the door now');
if(sop.steps.length!==3) throw new Error('add failed');
if(v.steps.length!==2) throw new Error('snapshot mutated by later edit');
if(!F.restoreVersion(sop,v)) throw new Error('restore failed');
if(sop.steps.length!==2||sop.steps[0].text.indexOf('Count')!==0) throw new Error('restore wrong');
if(!F.restoreVersion(sop,{steps:[]})) throw new Error('restore to empty should work');
if(F.restoreVersion(sop,null)) throw new Error('null version should fail');
if(F.restoreVersion(null,v)) throw new Error('null sop should fail');"

t "flow 12: CSV export -> re-import round-trips" "
const F=require('./js/forge.js');
const sop=F.forgeSOP('Closing','Closer','Count the register and drop the cash in the safe. Turn off the open sign and lock the front door. Wipe down all counters.');
const csv=F.sopToCSV(sop);
const back=F.sopFromCSV('Closing copy',csv);
if(!back) throw new Error('import returned null');
if(back.steps.length!==sop.steps.length) throw new Error('step count '+back.steps.length+' vs '+sop.steps.length);
if(back.steps[0].text!==sop.steps[0].text) throw new Error('text mismatch: '+back.steps[0].text);
if(back.steps[0].owner!==sop.steps[0].owner) throw new Error('owner lost: '+back.steps[0].owner);
if(F.sopFromCSV('x','not,a,real\nsop')!==null) throw new Error('garbage should fail');
if(F.sopFromCSV('x','Step,Text')!==null) throw new Error('header-only should fail');"

t "flow 13: Markdown export -> re-import round-trips" "
const F=require('./js/forge.js');
const sop=F.forgeSOP('Opening','Opener','Unlock the front door and disarm the alarm. Turn on all lights and the open sign. Count the cash in the register.');
const md=F.sopToMarkdown(sop);
const back=F.sopFromMarkdown(md);
if(!back) throw new Error('import returned null');
if(back.name!=='Opening') throw new Error('name lost: '+back.name);
if(back.steps.length!==sop.steps.length) throw new Error('step count mismatch');
back.steps.forEach((s,i)=>{ if(s.text!==sop.steps[i].text) throw new Error('step '+i+' text lost'); });
if(F.sopFromMarkdown('just some prose\nno checklist here')!==null) throw new Error('prose should fail');
if(F.sopFromMarkdown('# Empty\n\n## Checklist\n')!==null) throw new Error('empty checklist should fail');"

t "flow 14: CSV import tolerates quoted commas + re-derives missing fields" "
const F=require('./js/forge.js');
const csv='Step,Text,Owner,Time estimate,Watch-out tip,Done\r\n\"1\",\"Wipe the counter, then the sink\",\"\",\"\",\"\",no';
const back=F.sopFromCSV('Q',csv);
if(!back||back.steps.length!==1) throw new Error('quoted comma broke parsing');
if(back.steps[0].text!=='Wipe the counter, then the sink') throw new Error('text wrong: '+back.steps[0].text);
if(!back.steps[0].owner||!back.steps[0].time||!back.steps[0].tip) throw new Error('missing fields not re-derived');"

echo "----"
echo "e2e: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
