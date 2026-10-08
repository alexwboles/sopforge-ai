#!/usr/bin/env bash
# SopForge smoke tests — quick sanity checks. Must all pass.
set -u
cd "$(dirname "$0")/.."
PASS=0; FAIL=0
check() { # $1 = description, $2.. = command
  local desc="$1"; shift
  if "$@" >/dev/null 2>&1; then echo "PASS: $desc"; PASS=$((PASS+1));
  else echo "FAIL: $desc"; FAIL=$((FAIL+1)); fi
}
check_file() { # $1 = description, $2 = file
  if [ -f "$2" ]; then echo "PASS: $1"; PASS=$((PASS+1));
  else echo "FAIL: $1 (missing $2)"; FAIL=$((FAIL+1)); fi
}

check_file "index.html exists" index.html
check_file "forge.js exists" js/forge.js
check_file "app.js exists" js/app.js
check_file "style.css exists" css/style.css
check_file "README exists" README.md
check "forge.js syntax valid" node --check js/forge.js
check "app.js syntax valid" node --check js/app.js

# parser basics via node
check "numbered list parses to 3 steps" node -e "
const F=require('./js/forge.js');
const s=F.splitSentences('1. Unlock door.\n2. Turn on lights.\n3. Count cash.');
if(s.length!==3) process.exit(1);"

check "prose parses to 3+ steps" node -e "
const F=require('./js/forge.js');
const s=F.splitSentences('Unlock the front door. Turn on all the lights. Count the cash in the register and log it.');
if(s.length<3) process.exit(1);"

check "forgeSOP enriches every step" node -e "
const F=require('./js/forge.js');
const sop=F.forgeSOP('Open','Opener','Unlock the door. Count the cash in the register.');
if(sop.steps.length!==2) process.exit(1);
sop.steps.forEach(st=>{ if(!st.owner||!st.time||!st.tip||!st.text) process.exit(1); });"

check "5 starter templates load" node -e "
const F=require('./js/forge.js');
if(F.TEMPLATES.length!==5) process.exit(1);
F.TEMPLATES.forEach(t=>{ if(!t.name||!t.description) process.exit(1); });"

check "addStep enriches + renumbers" node -e "
const F=require('./js/forge.js');
const sop=F.forgeSOP('T','R','Wipe the counter. Mop the floor.');
const s=F.addStep(sop,'Count the cash in the register');
if(!s) process.exit(1);
if(s.n!==3) process.exit(1);
if(s.owner!=='Cashier'||!s.time||!s.tip) process.exit(1);
if(F.addStep(sop,'ok')!==null) process.exit(1);"

check "removeStep splices + renumbers" node -e "
const F=require('./js/forge.js');
const sop=F.forgeSOP('T','R','Do a first thing. Do a second thing. Do a third thing.');
if(!F.removeStep(sop,1)) process.exit(1);
if(sop.steps.length!==2||sop.steps[0].n!==1||sop.steps[1].n!==2) process.exit(1);
if(F.removeStep(sop,9)!==false) process.exit(1);"

check "sopToCSV has header + all steps" node -e "
const F=require('./js/forge.js');
const sop=F.forgeSOP('T','R','Wipe the counter. Mop the floor.');
sop.steps[0].done=true;
const csv=F.sopToCSV(sop);
const lines=csv.trim().split('\r\n');
if(lines.length!==3) process.exit(1);
if(!lines[0].includes('\"Step\",\"Text\",\"Owner\"')) process.exit(1);
if(!csv.includes('\"yes\"')) process.exit(1);"

check "sopToMarkdown renders checklist" node -e "
const F=require('./js/forge.js');
const sop=F.forgeSOP('Closing','Closer','Wipe the counter. Mop the floor.');
const md=F.sopToMarkdown(sop);
if(!md.startsWith('# Closing')) process.exit(1);
if((md.match(/- \[ \]/g)||[]).length!==2) process.exit(1);
if(!md.includes('Watch out:')) process.exit(1);"

check "totalTimeFor recomputed after edits" node -e "
const F=require('./js/forge.js');
const sop=F.forgeSOP('T','R','Wipe the counter.');
const before=sop.totalTime;
F.addStep(sop,'Let the floor dry for 15 minutes');
if(sop.totalTime===before) process.exit(1);
if(!/min/.test(sop.totalTime)) process.exit(1);"

# UI wiring for the new tools
for id in add-step-btn csv-btn md-btn complete-banner library-search library-role; do
  if grep -q "id=\"$id\"" index.html; then echo "PASS: index.html has #$id"; PASS=$((PASS+1));
  else echo "FAIL: index.html missing #$id"; FAIL=$((FAIL+1)); fi
done
for fn in sopToCSV sopToMarkdown addStep removeStep renderLibrary saveCurrent complete-banner; do
  if grep -q "$fn" js/app.js; then echo "PASS: app.js uses $fn"; PASS=$((PASS+1));
  else echo "FAIL: app.js missing $fn"; FAIL=$((FAIL+1)); fi
done

echo "----"
echo "smoke: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
