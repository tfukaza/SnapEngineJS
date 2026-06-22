# SnapSort Algorithm Design Notes

SnapSort uses the phrase "drag and drop" for a family of related item
placement behaviors, not one universal algorithm. Each algorithm should define
how a dragged item leaves its source container, how preview geometry is shown,
and how the final drop target is selected.

The layout engine is intentionally lower level than those algorithms. It only
simulates virtual item placement. It does not know whether a virtual item is a
drag ghost, insertion marker, placeholder, or some future preview object.

This document is a working design note. It centralizes terminology, current
findings, pros and cons, and open questions before the material is moved into a
more formal documentation structure.

The current supported algorithm is SnapSort Euclidean. The next proposed
algorithm is SnapSort Progressive Placement.

## SnapSort Euclidean

SnapSort Euclidean is the current SnapSort behavior. Its underlying rule is:
while an item is being dragged, evaluate every valid ghost placement and choose
the placement whose final ghost position is closest to the dragged item by
Euclidean distance.

### Drag Lifecycle

When the user starts dragging an item, SnapSort temporarily removes that item
from normal container layout and replaces it with a ghost item. The ghost is a
layout clone of the dragged item. It previews the slot where the item would land
if the user released the pointer at the current position.

As the pointer moves, SnapSort updates the ghost location. The dragged item
itself follows the pointer independently from the normal layout flow.

On drop, SnapSort moves the original item to the container and index represented
by the active ghost.

### Drop Target Selection

For a drag operation, SnapSort Euclidean treats each valid ghost placement as a
candidate. A candidate is valid when it respects the active container layout and
behavior, including details such as row or column direction, wrapping, locked
items, nested containers, and cross-container group constraints.

For each candidate, SnapSort predicts the final layout with the ghost inserted
at that position. It then compares the dragged item's current position against
the predicted final ghost position. The candidate with the shortest Euclidean
distance wins.

This means the algorithm is intentionally global: it is not only asking which
neighbor the pointer is nearest to. It asks which complete ghost placement would
put the final ghost closest to the dragged item.

### Pros

This design is straightforward to implement and easy to reason about. It works
well when items have the same size or similar sizes, and it remains useful when
item sizes vary moderately rather than forming a strict grid.

The main UX advantage is the full-size ghost preview. Users can usually see the
resulting layout before they drop the item, which makes simple reorder and
cross-container moves feel direct.

### Cons

SnapSort Euclidean can feel unintuitive when a large item is moved within a
multi-row or multi-column container.

The surprising case appears when removing the dragged item causes later siblings
to reflow before candidate scoring happens. For example, a user may try to drag
a large item after item C on a lower row. Once the large item is removed from
the flow, items A, B, C, and D may shift back into the previous row. The
candidate that is algorithmically after C or D can now have a final ghost
position somewhere other than the visual boundary the user was aiming at.

One English sentence-builder version of the problem looks like this:

```text
Drag start:

row 1: [Sort] [the] [cards] [into]
row 2: [correct order] [today]
       ^ dragged item  ^ user aims after this item

User intent:

row 1: [Sort] [the] [cards] [into]
row 2: [today] [correct order ghost]

But after removing the wide dragged item from normal flow, "today" can wrap
back to row 1:

row 1: [Sort] [the] [cards] [into] [today]
row 2:

Candidate A: place the ghost after "today", matching the user's intended
sequence.

row 1: [Sort] [the] [cards] [into] [today]
row 2: [correct order ghost]
       ^ final ghost center is now far from the row-2 boundary the user aimed at

Candidate B: place the ghost between "into" and "today". This can be closer to
the dragged item's current pointer position, so Euclidean scoring may choose it.

row 1: [Sort] [the] [cards] [into] [correct order ghost]
row 2: [today]
       ^ "today" is pushed back to row 2 after the selected ghost is inserted
```

In those cases, SnapSort Euclidean may choose the numerically closest final
ghost position even when a human expected the drop to follow the visible row
boundary under the pointer.

The core tension is that final-layout correctness and perceived insertion
intent are not always the same thing. The current algorithm is internally
consistent, but users often think in terms of the visible sequence and local
row boundary they are hovering near.

The known wrapped-row boundary investigation is documented in
`docs/snapsort/wrapped-row-drop-boundary-report.md`.

## SnapSort Progressive Placement

SnapSort Progressive Placement is a proposed algorithm for ordered, variable
size items. It is meant for layouts where users think in a reading or traversal
order rather than in freeform geometric proximity.

The primary example is a Duolingo-like sentence builder. Item widths can vary
widely, rows are usually wrapped, and the order is meaningful. In English, that
order is generally top-left to bottom-right. Other languages or layout modes may
use a different direction or cardinality, but the central idea is the same: the
drop algorithm follows the user's expected progression through the layout.

### Design Principle

Progressive Placement fundamentally differs from SnapSort Euclidean. Instead of
trying every valid ghost placement and choosing the final ghost center closest
to the dragged item, it virtually places items in progression order through the
layout engine. The ghost should go at the placement whose virtual region
collides with the center point of the item currently being dragged.

This makes the center of the dragged item act like a cursor moving through the
ordered layout. The selected insertion point comes from the progression slot the
dragged item is currently occupying, not from global distance to a final ghost
center.

### Example Setup

Using the same sentence-builder shape from the Euclidean example:

```text
Drag start:

row 1: [Sort] [the] [cards] [into]
row 2: [correct order] [today]
       ^ dragged item  ^ user aims after this item

User intent:

row 1: [Sort] [the] [cards] [into] [today]
row 2: [correct order ghost]

Progressive Placement view:

The layout is read as a sequence of placement regions:

       1      2       3       4       5
row 1: [Sort] [the]   [cards] [into]  [today]
row 2: [correct order ghost]
       6

If the dragged item's center collides with the virtual placement rectangle
after "today", the ghost is placed at that slot.
```

The region boundary is the virtual rectangle produced by inserting the dragged
item's dimensions at a candidate slot. If the dragged item's center does not
collide with any virtual placement rectangle, Progressive Placement falls back
to the nearest rectangle by edge distance. The important difference is that
Progressive Placement asks "which ordered placement region is the dragged item
occupying?" rather than "which final ghost center is closest?"

### Pros

This should feel more natural for ordered token layouts where users already
have a subconscious understanding of progression direction. In English sentence
builders, users expect movement from left to right and then top to bottom, so
drop placement should follow that mental model.

It should also handle large width differences better than raw Euclidean scoring
because the selected slot is based on progression occupancy, not on whichever
final ghost center happens to be closest after reflow.

### Cons

Progressive Placement depends on virtual placement rectangles feeling natural
as hit regions. Those regions must keep working for rows, columns, wrapping,
nested containers, and alternate reading directions.

The main implementation risk is that region boundaries can feel jumpy if they
are too small, too large, or inconsistent with the rendered ghost preview.
