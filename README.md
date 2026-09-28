# SopForge

**Describe a process in plain English. Get a step-by-step SOP with a checklist.**

Small businesses run on tribal knowledge — when someone quits, chaos follows. SopForge turns a plain-English description into a structured Standard Operating Procedure: numbered steps, owner hints, time estimates, and "watch out" tips. The team then runs it as an interactive checklist with a progress bar and print view.

## The problem
- Training new hires takes weeks because "how we do things" lives in someone's head.
- Inconsistent execution → mistakes, bad reviews, wasted time.

## The solution
Type (or paste) how a process works. SopForge forges it into a reusable, printable playbook in seconds — no AI key needed, everything runs locally in the browser.

## Features
1. **Plain-English forge** — numbered lists, bullet lists, or free prose all parse into steps
2. **Smart enrichment** — each step gets an owner hint (Cashier, Manager, Kitchen team…), a time estimate, and a contextual "watch out" tip
3. **Interactive checklist** — tap steps done, watch the progress bar, reset anytime
4. **5 starter templates** — opening the shop, onboarding, returns, closing, restroom deep-clean
5. **SOP library** — save, open, duplicate, and delete SOPs (stored in `localStorage`, private to the device)
6. **Print view** — clean printed checklist for the wall or the binder
7. **Optional AI polish** — paste your own OpenAI key to sharpen wording (never required, never saved)

## Run it
No build step, no dependencies, no server needed:

```bash
# option 1: just open it
open index.html        # macOS
xdg-open index.html    # linux

# option 2: tiny static server
npx serve .            # or: python3 -m http.server 8080
```

## Tests
```bash
bash test/smoke.sh   # 11 checks: files, JS syntax, parser basics
bash test/e2e.sh     # 7 flows: prose → 5+ steps, checklist math, templates, edge cases
```

## Pricing vision
- **Free** — 3 SOPs, everything local
- **Team ($15/mo)** — unlimited SOPs, shared team library, QR code per SOP
- **Franchise ($49/mo)** — multi-location rollouts, version history, completion analytics

## Privacy
100% client-side. Nothing you type ever leaves the device. The optional OpenAI polish call goes directly from your browser to OpenAI with *your* key.

## Tech
Pure HTML/CSS/JS. `js/forge.js` is the framework-free parsing engine (shared between browser and Node tests).
