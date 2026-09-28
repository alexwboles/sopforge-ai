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

echo "----"
echo "smoke: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
