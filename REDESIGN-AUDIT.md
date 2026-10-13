# SopForge AI — Redesign Audit (2026-10-13)

Competitors researched: Trainual (playbook-style platform; hierarchy of Subjects →
Topics → Steps; searchable hub; structured training paths assigned to roles/groups;
progress reporting — who completed what; 400+ SOP templates; AI drafting assistance),
Whale/UseWhale (playbook, process documentation with step assignments), SweetProcess.

## Visual gaps
- Forge form, template chips, and the entire SOP library are stacked on ONE long
  page — Trainual separates "create" from the "playbook hub" dashboard.
- Library is a flat list of text cards; Trainual groups content into Subjects
  (roles) with progress per item — no sense of a playbook.
- SOP detail has 10 toolbar buttons in one row (Add step, owner filter, Snapshot,
  version select, Restore, Export CSV, Export .md, Reset, Print) — overwhelming,
  no hierarchy.
- Identity ("The Blueprint", blueprint-blue, spec sheets) is already
  category-appropriate and distinctive — keep and extend.

## Functional gaps
- No subject/role grouping in the library (Trainual's core mental model).
- Library cards show "3/8 done" text but no visual progress; no per-SOP time
  or last-run info at a glance.
- Toolbar actions not prioritized: run/reset (daily actions) sit next to
  version-restore (rare action) with equal weight.

## Redesign plan — "the playbook"
- Top tab nav: **Forge** (create) | **Playbook** (library hub). Library moves to its
  own view.
- Playbook: SOPs grouped by role as "subjects" (Trainual pattern); each SOP card
  gets a progress bar, total time, step count, last-run timestamp; search + role
  filter stay; import stays.
- SOP detail: toolbar split — primary row (Back, Reset checklist, Add step) +
  "More tools" disclosure (owner filter, Snapshot, version select/restore,
  Export CSV/.md, Print). All features preserved.
- Keep the Blueprint identity; extend with subject headers and progress bars.

## QA notes
- Desktop 1440 + mobile 390; iterate until commercial-grade.
