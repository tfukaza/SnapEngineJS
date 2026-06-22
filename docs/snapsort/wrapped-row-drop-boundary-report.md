# Wrapped Row Drop Boundary Investigation

Date: 2026-06-21

## Summary

A Kiokun sentence-builder case exposed an unintuitive drop target choice in
SnapSort wrapped row containers. The layout engine did advance the cross axis
correctly when rows wrapped. The issue was not that row two was missing from the
virtual layout.

The observed issue was a mismatch between:

- the visual insertion boundary the user is aiming at, and
- the final ghost box position after same-container reflow.

The attempted implementation fix was rolled back because it changed the drop
index independently of the visible ghost location and caused regressions in
other SnapSort demos/tests.

## Reproduction Shape

Use a row container with wrapping and this visual layout at drag start:

```text
row 1: [A] [B] [C] [D] [E] [F]
row 2: [G dragged] [H] |
                       ^
                       user aims here: after H
```

In the Kiokun repro, `G` was the wide `toiawase` tile and `H` was the short
`ta` tile. At a narrow viewport, the answer area rendered as:

```text
row 1: kare no keireki wo kaisha ni
row 2: toiawase ta
```

Then drag `toiawase` to the right of `ta`.

## What Happens

SnapSort simulates candidates after removing the dragged item from the same
container. That can make later siblings reflow:

```text
row 1: [A] [B] [C] [D] [E] [F] [H]
row 2:
```

When the virtual ghost for `G` is inserted after `H`, flex wrapping can place
the final ghost box back at the start of row two:

```text
row 1: [A] [B] [C] [D] [E] [F] [H]
row 2: [G ghost]
        ^
        final ghost center
```

So the candidate has two meaningful positions:

```text
frozen visual boundary: after H on row two
final ghost position:   start of row two after reflow
```

The current algorithm scores by Euclidean distance to the final ghost center.
In this repro, that final ghost center is far from the user's hovered boundary,
so a top-row slot can be numerically closer even though the user is visually
hovering after the lower-row item.

## Concrete Geometry From The Repro Test

The diagnostic test uses this simplified geometry:

```text
container width: 488
row 1 y: 14
row 2 y: 65.8
dragged width: 124
drag center: (235.6, 89.7)
```

For the same-container drag of the wide row-two item:

```text
candidate before dragged item: final ghost center ~= (76, 89.7)
candidate after lower-row item: final ghost center ~= (76, 89.7)
```

Those two candidate indices collapse to the same final ghost center. However,
the visual boundary after the lower-row item is much closer to the drag center
than a top-row candidate.

## Tests Added

Two tests were added to `tests/e2e/snapsort-drag-snapshot.spec.ts`:

- `places append ghost on the short second row in a wrapped row layout`
  - Confirms the layout engine can place an append ghost on row two.
  - This guards against the incorrect hypothesis that wrapped rows do not
    advance the Y/cross axis.

- `reproduces same-container row drag where final ghost centers collapse`
  - Captures the problematic same-container reflow shape.
  - Shows that two lower-row candidate indices can share the same final ghost
    center, while the frozen visual boundary after the lower-row item is closer
    to the drag center than a top-row slot.

## Attempted Fix And Why It Was Reverted

An attempted fix scored the problematic trailing row candidate against the
frozen visual insertion boundary while keeping the rendered ghost at the final
flex position. This made the Kiokun repro behave as intended in Playwright:

```text
before: kare no keireki wo kaisha ni toiawase ta
drop after ta
after:  kare no keireki wo kaisha ni ta toiawase
```

However, that approach can make the selected drop index diverge from the visual
ghost position. It also disturbed existing SnapSort behavior, including nested
and wrapped-row alignment tests. For that reason, the implementation change was
removed and only the diagnostic tests/report were kept.

## Next Questions

Potential future fixes should preserve the invariant that the selected drop
index and visible ghost location stay understandable together. Options to
investigate:

- Model insertion boundaries explicitly as first-class candidate geometry.
- Render an insertion marker separately from the full-size ghost when the two
  positions diverge.
- Keep Euclidean final-ghost scoring but improve UX affordances around wrapped
  row trailing positions.
- Add a browser-backed fixture for this exact Kiokun-style row shape before
  changing the scoring algorithm.
