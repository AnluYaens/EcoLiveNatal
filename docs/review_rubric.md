# EcoLiveNatal Review Rubric

Use this rubric when reviewing real generations from `v1.5` telemetry samples. Review outputs in small batches grouped by region, scan type, and provider path.

## Review Unit

For each reviewed sample, record:

- date reviewed
- anatomical region
- scan type
- mode
- provider
- telemetry status
- reviewer initials

Do not copy raw image payloads into logs or notes. Keep any image review outside app telemetry.

## Scorecard

Score each category from `1` to `5`.

### 1. Geometry Fidelity

- `5`: structure placement, crop, tilt, and sidedness closely match the source scan
- `3`: mostly aligned but with some drift or over-cleaning
- `1`: major repositioning, flipped layout, invented completion, or obvious reframing

### 2. Region Correctness

- `5`: the output clearly represents the chosen anatomical region and view plane
- `3`: region is mostly correct but with mixed or ambiguous structures
- `1`: wrong region emphasis or output reads as a generic anatomy render

### 3. Overlay Leakage

- `5`: no visible text, calipers, labels, or crosshair remnants
- `3`: minor leakage that does not dominate the output
- `1`: overlays are still prominent or distort the anatomy

### 4. Artifact Severity

- `5`: no uncanny anatomy, duplicated structures, waxy skin, or texture collapse
- `3`: small artifacts visible on close inspection
- `1`: obvious generation artifacts that break trust immediately

### 5. Clinical Plausibility

- `5`: anatomy mode remains plausible and restrained, with no invented textbook completion
- `3`: plausible overall but some structures feel overcommitted relative to the scan
- `1`: output confidently invents anatomy not supported by the source

## Failure Tags

Add zero or more tags for each sample:

- `overlay-leak`
- `wrong-plane`
- `wrong-sidedness`
- `over-completed-anatomy`
- `off-center-drift`
- `pose-drift`
- `provider-texture-failure`
- `low-input-quality`
- `uncanny-artifact`

## Decision Guidance

Patterns that suggest staying on the current stack a bit longer:

- failures cluster around low-quality crops
- failures improve after prompt/preprocess changes
- one region is weak while others are stable

Patterns that suggest a `v2` backend is justified:

- high-quality inputs still drift structurally
- organs keep re-centering or being “completed” despite strong prompts
- provider behavior remains inconsistent across the same region/view plane
- overlay suppression and vision anchoring are no longer the main bottleneck
