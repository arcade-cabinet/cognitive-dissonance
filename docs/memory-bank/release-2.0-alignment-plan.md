# Release 2.0 Alignment Resolution Plan

## Purpose

This document is the authoritative execution plan to close all design/code/documentation gaps and ship a full production-grade **Cognitive Dissonance 2.0** release.

It consolidates:

- Grok design intent (`docs/memory-bank/grok-doc/`)
- Current implementation state in `src/`
- Memory-bank status/docs drift that accumulated across branches

## Success Criteria (Release Exit Gates)

The release is only considered production-ready when **all** gates below are green:

1. **Gameplay Determinism Gate**
   - buried seed simulation behavior is deterministic across runs for equivalent inputs/tick counts.
   - Determinism is validated by automated tests (simulation snapshots / seeded replay assertions).
2. **Core Loop Integrity Gate**
   - Pattern stabilization, enemy escalation, shatter flow, and restart loop remain stable for long sessions.
   - No state-machine dead zones across repeated shatter/restart cycles.
3. **Audio Lifecycle Gate**
   - Tone graph/resources are fully created/disposed across start/stop/restart without leaks or duplicate layers.
4. **Physics/XR Fidelity Gate**
   - Physics keys are true constrained mechanics (not damping-only approximation).
   - XR state is clearly marked as production-ready or explicitly staged behind a release flag.
5. **Accessibility Gate**
   - Prefers-reduced-motion behavior works in overlays + 3D motion systems.
   - Screen reader announcements, keyboard/pointer/touch interactions remain functional.
6. **Docs Alignment Gate**
   - `activeContext`, `progress`, `systemPatterns`, `techContext`, and `AGENTS.md` are internally consistent.
   - Test counts, branch status, and known issues are synchronized.
7. **Quality Gate**
   - `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm test:e2e` pass in CI-like environment.
   - Performance and reliability smoke checks pass on desktop Chrome baseline.

---

## Alignment Resolution Strategy

### Track A — Source-of-Truth Alignment (Design ↔ Code ↔ Docs)

**Goal:** eliminate ambiguity about what is complete, what is partial, and what is deferred.

#### A1. Build an explicit feature matrix

Create a single matrix (in this file or adjacent doc) with rows for every major system:

- Sphere visuals + degradation + shatter
- Platter mechanics + keycaps + garage-door animation
- Pattern stabilization and color-match logic
- Enemy spawning, behaviors, scaling, split logic
- Audio ambient engine + event SFX
- Diegetic GUI + overlays + state transitions
- Physics keys
- XR session + hand interaction
- Accessibility and mobile touch
- Test coverage and CI checks

Columns:

- Grok intent status (definitive / evolved / deprecated)
- Code status (complete / partial / placeholder)
- Test status
- Risk level
- Release action (ship / harden / defer)

#### A2. Resolve contradictory memory-bank claims

Normalize conflicting docs entries (e.g. "complete" vs "stubbed") and establish one canonical status statement.

#### A3. Define release posture for deferred features

For each non-ready item (especially XR), decide:

- Ship as hardened scaffold with explicit defer note, or
- Hide behind feature flag and remove from critical path

---

### Track B — Determinism & Simulation Hardening

**Goal:** make buried seed truly reproducible and stable.

#### B1. Fixed-step simulation

Refactor frame-dependent spawn chance logic into fixed-timestep accumulators for:

- Pattern spawning/progression
- Enemy wave scheduling
- Any deterministic simulation decision points

#### B2. Deterministic random consumption model

Ensure RNG draw order depends on simulation ticks/events, not render FPS.

#### B3. Reproducibility tests

Add deterministic replay tests asserting same-seed/same-ticks => same outputs for:

- Pattern color/index/spawn sequence
- Enemy config + wave envelopes
- Critical progression events

#### B4. Seed telemetry for debugging

Expose optional dev-only debug capture of seed + tick + key events (non-invasive, test-only helpers).

---

### Track C — State Machine & Lifecycle Reliability

**Goal:** guarantee stable repeated session loops.

#### C1. Phase model normalization

Make game phase transitions explicit across title/playing/paused/gameover/restart.

#### C2. Restart ritual resiliency

Ensure sphere rebuild and gameplay reset triggers are keyed off explicit restart semantics, not fragile implicit transitions.

#### C3. Store lifecycle audits

Audit all stores for reset completeness:

- Level, seed, input, audio, game
- No stale references after restart
- No lingering subscriptions

#### C4. Long-run governor checks

Re-run and extend 30s+ survival + multi-restart tests under E2E governor.

---

### Track D — Audio Production Hardening

**Goal:** prevent leaks/duplication and lock adaptive behavior.

#### D1. Resource registry

Track every created Tone node/loop in store-managed registry.

#### D2. Complete shutdown/dispose

On teardown/restart:

- Stop transport/loops
- Dispose all synth/noise/filter/reverb/gain nodes
- Null references and restore clean init state

#### D3. Deterministic evolution mapping

Tie audio evolution decisions to stable seeded sequences/ticks where determinism is expected.

#### D4. Audio soak tests

Add tests for repeated initialize/shutdown cycles and duplicate-init guards.

---

### Track E — Physics, XR, and Input Fidelity

**Goal:** align interaction systems with intended mechanical quality.

#### E1. Physics keys true constraints

Implement actual movement constraints/joints so keycaps behave as vertical switch travel with spring return.

#### E2. Touch/keycap interaction parity

Confirm touch targets and physics-driven visible caps remain semantically aligned.

#### E3. XR production decision

Choose one:

- **Release-ready XR MVP**: pinch-to-keycap mapping + basic feedback; or
- **Deferred XR**: stable scaffold, disabled by default, documented clearly

#### E4. Device matrix spot checks

Desktop + mobile touch baseline validation for interaction hit reliability.

---

### Track F — Accessibility & UX Compliance

**Goal:** deliver accessible production behavior, not just hooks.

#### F1. Reduced motion implementation

Apply prefers-reduced-motion branches to:

- Overlay transitions
- Sphere/platter jitter intensity
- Post-process corruption intensity

#### F2. Announcements and semantics audit

Validate SR live region events and dialog/button semantics across game-over and restart.

#### F3. Input fallback expectations

Document minimum accessible control expectations (pointer/touch baseline, keyboard where applicable).

---

### Track G — Visual Quality & Performance Validation

**Goal:** human-eye validated shipping baseline.

#### G1. Art direction pass

Perform manual QA pass for visual readability:

- Sphere shader readability by tension level
- Enemy silhouette/clarity under postfx
- Diegetic ring visibility and legibility

#### G2. Performance budget pass

Capture rough FPS/memory baseline in representative scenes.

#### G3. Regression screenshot set

Capture key scenes (title, gameplay low/high tension, clarity, game over) for release validation record.

---

### Track H — Test, CI, and Release Operations

**Goal:** lock confidence before tagging 2.0.

#### H1. Test inventory alignment

Synchronize stated unit/E2E counts with actual suite.

#### H2. Add missing tests for high-risk areas

Priority:

1. Determinism and fixed-step simulation
2. Restart lifecycle/state-machine transitions
3. Audio resource lifecycle
4. Reduced-motion behavior

#### H3. CI release checklist

Standard pre-tag checklist:

- lint/test/build/e2e
- docs consistency check
- manual smoke checklist

#### H4. Release notes and rollback plan

Prepare clear changelog summary + known limitations + rollback procedure.

---

## Prioritized Backlog (P0/P1/P2)

### P0 — Must complete before release tag

1. Deterministic simulation model (Track B)
2. Restart/state-machine robustness (Track C)
3. Audio resource lifecycle cleanup (Track D)
4. Physics key constraints correctness (Track E1)
5. Memory-bank/docs alignment cleanup (Track A)
6. Full gate run: lint/test/build/e2e (Track H)

### P1 — Strongly recommended for release quality

1. Reduced-motion complete implementation (Track F1)
2. Accessibility semantic validation (Track F2)
3. Visual quality human pass + screenshot pack (Track G)
4. Extended governor reliability runs (Track C4)

### P2 — Post-release or feature-flagged

1. Full XR hand-tracking gameplay integration (Track E3, if not selected for MVP)
2. Additional platform-specific tuning (mobile edge cases, deep performance tuning)

---

## Execution Phases (Suggested)

### Phase 1: Alignment Baseline (1–2 days)

- Build feature matrix
- Resolve docs contradictions
- Freeze canonical status snapshot

### Phase 2: Core Technical Hardening (3–5 days)

- Determinism refactor
- State-machine/restart fixes
- Audio lifecycle refactor
- Physics constraints implementation

### Phase 3: Verification & UX Quality (2–3 days)

- Accessibility and reduced-motion implementation
- Manual visual/perf pass
- Screenshot and QA evidence capture

### Phase 4: Release Readiness (1–2 days)

- Full automated gate runs
- Docs final sync
- Release notes and tag prep

---

## Risk Register

1. **High:** Determinism refactor changes gameplay feel.
   - Mitigation: snapshot expected ranges and tune constants post-refactor.
2. **High:** Lifecycle fixes regress restart flow.
   - Mitigation: add explicit multi-cycle E2E assertions.
3. **Medium:** Physics constraints affect interaction responsiveness.
   - Mitigation: iterate spring/damping values with touch target QA.
4. **Medium:** Reduced-motion branches create inconsistent visuals.
   - Mitigation: keep one centralized reduced-motion signal in state.
5. **Low/Medium:** Docs drift reappears.
   - Mitigation: add "last verified" metadata and update policy per release.

---

## Definition of Done (Production 2.0)

All are required:

- ✅ Exit gates all pass
- ✅ P0 backlog complete
- ✅ P1 either complete or explicitly documented as accepted risk
- ✅ Deferred items clearly feature-flagged or excluded from release critical path
- ✅ Memory-bank and AGENTS context reflect final shipped truth

---

## Immediate Next Actions

1. Create and populate the feature alignment matrix (Track A1).
2. Open implementation tickets for each P0 item with clear acceptance criteria.
3. Execute P0 workstreams in order: **B → C → D → E → A/H sync**.
4. Run full quality gates and produce release evidence bundle.
