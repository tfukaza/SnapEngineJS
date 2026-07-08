import { expect, test } from "@playwright/test";
import {
  contentBoxOrigin,
  flowAxesForDirection,
  flowLayoutPositions,
  inferFlowLayoutMetrics,
  virtualDimensions,
  type VirtualInsertion,
} from "../../assets/snapsort/core/src/layout";
import {
  makeBox,
  makeContainerSnapshot,
  makeGrid,
  makeItemSnapshot,
  simulatedRowCounts,
} from "../helpers/layout-grid";

/**
 * Unit tests for the flow-layout simulation (`layout.ts`), the pure core of
 * the drop-prediction engine. Geometry is synthetic `ItemSnapshot` trees that
 * mirror what `captureDragSnapshotTree` produces from real DOM reads,
 * including the measurement imprecision real browsers exhibit:
 *
 * - Blink/WebKit lay out on a 1/64px grid and return exactly self-consistent
 *   `getBoundingClientRect` doubles.
 * - Gecko lays out in 1/60px app units and returns doubles with ~1e-5px
 *   unit-conversion noise per value (e.g. a 90.6px pad measures alternately
 *   90.59999084 / 90.60000610).
 *
 * The wrap regression suite below locks in the invariant that measurement
 * noise far below LAYOUT_EPSILON never flips a wrap decision, while genuine
 * overflow beyond it always does. The cross-browser e2e twin of these tests
 * (the sub-pixel wrap matrix in snapsort-drag-snapshot.spec.ts) makes the
 * same row-shape assertions through the shared helpers in
 * tests/helpers/layout-grid.ts.
 */

function ghostInsertion(
  grid: ReturnType<typeof makeGrid>,
  index: number,
  entry: { width: number; height: number },
): VirtualInsertion<string> {
  return {
    container: grid,
    index,
    entry: { ...entry, margin: { top: 0, right: 0, bottom: 0, left: 0 } },
  };
}

test.describe("inferFlowLayoutMetrics", () => {
  test("infers gaps, line size, and extent from a wrapped row grid", () => {
    const grid = makeGrid({ rows: 3, cols: 4, itemW: 90, itemH: 60, gap: 4 });
    const metrics = inferFlowLayoutMetrics(grid, flowAxesForDirection("row"));
    expect(metrics.mainStart).toBeCloseTo(0, 6);
    expect(metrics.crossStart).toBeCloseTo(0, 6);
    expect(metrics.mainGap).toBeCloseTo(4, 6);
    expect(metrics.crossGap).toBeCloseTo(4, 6);
    expect(metrics.lineCrossSize).toBeCloseTo(60, 6);
    expect(metrics.lineCount).toBe(3);
    expect(metrics.measuredMainExtent).toBeCloseTo(4 * 90 + 3 * 4, 6);
  });

  test("includes trailing margins in the measured extent", () => {
    const grid = makeGrid({ rows: 1, cols: 2, itemW: 50, itemH: 20, gap: 10 });
    grid.children[1].box.margin.right = 7;
    const metrics = inferFlowLayoutMetrics(grid, flowAxesForDirection("row"));
    expect(metrics.measuredMainExtent).toBeCloseTo(110 + 7, 6);
  });
});

test.describe("flowLayoutPositions wrap decisions", () => {
  test("reproduces measured positions for an exact-fill grid", () => {
    const grid = makeGrid({ rows: 4, cols: 4, itemW: 93, itemH: 93, gap: 4 });
    const origin = contentBoxOrigin(grid.box);
    const result = flowLayoutPositions(grid, origin.x, origin.y);
    for (const child of grid.children) {
      const position = result.itemPositions.get(child)!;
      expect(position.x).toBeCloseTo(child.box.x, 4);
      expect(position.y).toBeCloseTo(child.box.y, 4);
    }
  });

  test("keeps a same-size ghost insertion at every index on the measured grid", () => {
    const grid = makeGrid({ rows: 4, cols: 4, itemW: 93, itemH: 93, gap: 4 });
    const dragged = grid.children[0];
    for (let index = 0; index <= 15; index++) {
      expect(
        simulatedRowCounts(grid, {
          rowStep: 97,
          insertion: ghostInsertion(grid, index, { width: 93, height: 93 }),
          filter: { excludeValues: new Set([dragged.value]) },
        }),
        `insertion at ${index}`,
      ).toEqual([4, 4, 4, 4]);
    }
  });

  test("wraps a genuinely oversized ghost insertion", () => {
    const grid = makeGrid({ rows: 2, cols: 4, itemW: 93, itemH: 93, gap: 4 });
    const dragged = grid.children[0];
    // Ghost twice as wide as a slot: only 3 fit per line alongside it.
    const counts = simulatedRowCounts(grid, {
      rowStep: 97,
      insertion: ghostInsertion(grid, 0, { width: 190, height: 93 }),
      filter: { excludeValues: new Set([dragged.value]) },
    });
    expect(counts[0]).toBeLessThan(4);
  });

  test("column containers with a single measured line never wrap", () => {
    const children = [0, 1, 2].map((i) =>
      makeItemSnapshot(
        `item-${i}`,
        makeBox({ x: 0, y: i * 30, width: 100, height: 26 }),
      ),
    );
    const container = makeContainerSnapshot(
      makeBox({ x: 0, y: 0, width: 100, height: 60 }),
      children,
      "column",
    );
    // Content height (60) is smaller than the stack (3 x 26 + gaps), but a
    // single-line column must keep everything on one line (it grows instead).
    const insertion: VirtualInsertion<string> = {
      container,
      index: 3,
      entry: { width: 100, height: 26, margin: children[0].box.margin },
    };
    const origin = contentBoxOrigin(container.box);
    const result = flowLayoutPositions(container, origin.x, origin.y, {
      insertions: [insertion],
    });
    const xs = new Set(
      [...result.itemPositions.values()].map((p) => Math.round(p.x)),
    );
    xs.add(Math.round(result.virtualRects.get(insertion)!.x));
    expect(xs.size).toBe(1);
  });

  test("centers lines when mainAxisAlign is center", () => {
    const grid = makeGrid({ rows: 1, cols: 2, itemW: 40, itemH: 20, gap: 10 });
    grid.mainAxisAlign = "center";
    grid.box.width = 150; // 60px slack
    const origin = contentBoxOrigin(grid.box);
    const result = flowLayoutPositions(grid, origin.x, origin.y);
    const first = result.itemPositions.get(grid.children[0])!;
    expect(first.x).toBeCloseTo((150 - 90) / 2, 4);
  });
});

test.describe("wrap robustness against browser measurement noise", () => {
  /**
   * Regression for the fractional-width over-wrap bug: Firefox app-unit
   * conversion noise (~1e-5px per measured value) must not push a zero-slack
   * line over capacity. Observed real values from the landing hero grid at
   * card width 430.398px: pad widths alternating 90.59999084 / 90.60000610,
   * measured gaps 4.000030517578125, parsed content 374.3999938964844.
   */
  test("does not over-wrap a zero-slack grid under Gecko-style jitter", () => {
    const jitterW = (i: number) =>
      i % 2 === 0 ? -0.00000915527344 : 0.00000610351562;
    const grid = makeGrid({
      rows: 4,
      cols: 4,
      itemW: 90.6,
      itemH: 90.6,
      gap: 4.000030517578125,
      jitter: (i) => ({ w: jitterW(i), x: (i % 4) * 0.00001525878906 }),
    });
    // Parsed container width fractionally *below* the measured extent, as
    // Gecko reports it.
    grid.box.width = 374.3999938964844;
    const dragged = grid.children[0];
    for (let index = 0; index <= 15; index++) {
      expect(
        simulatedRowCounts(grid, {
          rowStep: 94.6,
          insertion: ghostInsertion(grid, index, {
            width: dragged.box.width,
            height: dragged.box.height,
          }),
          filter: { excludeValues: new Set([dragged.value]) },
        }),
        `insertion at ${index}`,
      ).toEqual([4, 4, 4, 4]);
    }
  });

  test("does not over-wrap when parsed capacity is fractionally below the measured extent", () => {
    // Specified-vs-snapped: parsed padding 5.6px vs snapped 5.59375px makes
    // the parsed content width smaller than what the browser demonstrably
    // fit on one line. measuredMainExtent must win.
    const grid = makeGrid({ rows: 2, cols: 4, itemW: 90, itemH: 60, gap: 4 });
    grid.box.width += 0.0125; // snapped outer width
    grid.box.padding.left = 5.6;
    grid.box.padding.right = 5.6;
    for (const child of grid.children) child.box.x += 5.59375;
    const dragged = grid.children[0];
    expect(
      simulatedRowCounts(grid, {
        rowStep: 64,
        insertion: ghostInsertion(grid, 3, { width: 90, height: 60 }),
        filter: { excludeValues: new Set([dragged.value]) },
      }),
    ).toEqual([4, 4]);
  });

  test("still wraps genuine overflow just past the tolerance", () => {
    // Guards the other direction: LAYOUT_EPSILON must stay far below real
    // layout features, or lines that truly overflow would under-wrap.
    const grid = makeGrid({ rows: 2, cols: 4, itemW: 90, itemH: 60, gap: 4 });
    const dragged = grid.children[0];
    const counts = simulatedRowCounts(grid, {
      rowStep: 64,
      // 0.5px wider than the slot: genuinely overflows the zero-slack line.
      insertion: ghostInsertion(grid, 3, { width: 90.5, height: 60 }),
      filter: { excludeValues: new Set([dragged.value]) },
    });
    expect(counts[0]).toBe(3);
  });

  test("wrap decisions are stable across seeded jitter fuzz", () => {
    // Deterministic LCG so failures are reproducible.
    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let round = 0; round < 50; round++) {
      const noise = () => (rand() - 0.5) * 4e-5;
      const grid = makeGrid({
        rows: 4,
        cols: 4,
        itemW: 90.6,
        itemH: 90.6,
        gap: 4,
        jitter: () => ({ w: noise(), x: noise() }),
      });
      grid.box.width += noise();
      const dragged = grid.children[5];
      expect(
        simulatedRowCounts(grid, {
          rowStep: 94.6,
          insertion: ghostInsertion(grid, Math.floor(rand() * 16), {
            width: dragged.box.width,
            height: dragged.box.height,
          }),
          filter: { excludeValues: new Set([dragged.value]) },
        }),
        `fuzz round ${round}`,
      ).toEqual([4, 4, 4, 4]);
    }
  });
});

test.describe("virtualDimensions", () => {
  test("grows a row container's height when an insertion adds a line", () => {
    const grid = makeGrid({ rows: 1, cols: 4, itemW: 93, itemH: 93, gap: 4 });
    const insertion = ghostInsertion(grid, 4, { width: 93, height: 93 });
    const dims = virtualDimensions(grid, { insertions: [insertion] });
    expect(dims.width).toBeCloseTo(grid.box.width, 4);
    expect(dims.height).toBeGreaterThan(grid.box.height + 90);
  });

  test("returns the snapshot size when nothing is inserted or removed", () => {
    const grid = makeGrid({ rows: 2, cols: 4, itemW: 93, itemH: 93, gap: 4 });
    const dims = virtualDimensions(grid);
    expect(dims.width).toBeCloseTo(grid.box.width, 4);
    expect(dims.height).toBeCloseTo(grid.box.height, 4);
  });
});
