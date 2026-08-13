# Goal Charter — First Year Out (directory `degree-roi`)

Status: **DRAFT** (drafted 2026-08-09 by work/orchestrator from the on-disk artifacts + `profile.md`;
ratification is Andrew's — flip to RATIFIED only on his word)
Last reviewed: 2026-08-09   ·   Review cadence: every 5 sessions that touch this product

> Drafted in response to the CC work-order `2026-08-09_command-center_fleet-orchestrator_three-ungated-products-no-charter`.
> Nothing here invents product reality: every claim is taken from `profile.md`, the built site, or the
> DECISIONS record. Where a number is a target rather than a measurement, it says so.

## 1. GOAL (one operational sentence)
**A visitor arrives with one program in mind and leaves knowing what it pays, what it costs to borrow,
and what the payment is as a share of that pay — without being told what to do about it.**

**Done-condition:** all four dashboards (`value-ranking`, `field-compare`, `school-profile`, `zz-about`)
answer that for any of the **38,869** programs carrying both an earnings and a debt figure, live on the
published URL, with `scripts/stress.js` green (33 checks) and every rendered figure reconciled against
`programs.parquet`.

## 2. CONVERGENCE METRIC (the one number tracked every session)
- **Metric:** **rendered figures reconciled against the parquet, as a count of unreconciled figures
  remaining** — target **0**, plus `stress.js` failures, target **0**.
- **Measured by:** `node /home/andrew/Project/work/products/degree-roi/scripts/stress.js <baseUrl>` for the
  suite, and a direct DuckDB query against `programs.parquet` for any figure the page states.
- **Recorded in:** `convergence.ledger` (one dated line per session that touches this product).
- **Current reading:** 2026-08-04 — stress suite 33/33 after the horizontal-scroll fix; two correctness
  bugs found and fixed by reconciliation (`payment_share.avg()` printing 20116 for 0.0806; a shadowed
  `pct` helper printing 19811.08 for 7.1%). Trend: improving. **Not re-measured since 2026-08-04.**

## 3. METRIC-VALIDITY CHECK ⭐
Q: **Name a way this metric could improve while the REAL goal gets worse.**
A: **A green suite and reconciled arithmetic on a site that quietly misleads.** Both bugs this product has
actually shipped printed *plausible* numbers — but the inverse failure is worse and the suite cannot see
it: correct arithmetic presented as a verdict. A median rendered accurately, next to a school's name, still
tells half of that program's graduates something false about themselves. Chasing "0 failures" would let the
site get harsher and more confident while every check stayed green.

Ruled out by: the metric is **paired with a non-negotiable presentation floor that is part of the
done-condition, not a nice-to-have** — the three duty-to-warn rules in `profile.md` (never a bare number as
a verdict; caveats inline on every dashboard, never optional; never a median presented as a prediction),
plus `<Disclaimer>` on every dashboard and `<SourcesFull>` on About. A session that improves the metric
while weakening any of those has **regressed**, and the charter says so here so it cannot be argued later.

## 4. GOAL-GATE (applied at session close)
- A session counts only if it moved unreconciled-figures or stress-failures toward 0, **or** it states
  plainly that it was enabling work (data rebuild, tooling, deploy plumbing).
- **Off-charter work (does NOT count, flag it):**
  - Adding dashboards or fields that widen scope beyond earnings-vs-debt (it is **not** a college ranking).
  - Any estimate, projection, or imputed value. Every number is the Department's; we add arithmetic only.
  - Visual iteration with no reconciliation behind it.
  - Re-litigating the shared-axis chart decision (settled 2026-08-04, see `profile.md`).

## 5. RE-CHARTER PATH
- To change the goal/metric: append to `work/DECISIONS.md` with the WHY + date, flip Status → DRAFT,
  re-ratify with Andrew.
- **Publishing is outward-facing and is Andrew's** — this site makes financial statements about named
  universities and named degree programs.
- Next scheduled review: on the next session that touches this product.
