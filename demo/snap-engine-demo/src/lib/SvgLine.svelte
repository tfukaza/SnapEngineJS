<script lang="ts">
	export let x1 = 0;
	export let y1 = 0;
	export let x2 = 60;
	export let y2 = 60;
	export let x3 = 120;
	export let y3 = 0;
	export let x4: number | null = null;
	export let y4: number | null = null;

	export let stroke = 'currentColor';
	export let strokeWidth = 2;
	export let strokeLinecap: 'butt' | 'round' | 'square' = 'round';
	export let strokeLinejoin: 'miter' | 'round' | 'bevel' = 'round';
	export let padding = 8;
	export let ariaLabel = 'Line through three points';
	export let ariaHidden = false;
	export let className = '';
	export let viewport: { minX: number; minY: number; width: number; height: number } | null = null;
	export let cornerRadius = 0;

	type Point = { x: number; y: number };
	let pointList: Point[] = [];

	$: pointList = (
		[
			{ x: x1, y: y1 },
			{ x: x2, y: y2 },
			{ x: x3, y: y3 },
			...(x4 != null && y4 != null ? [{ x: x4, y: y4 }] : [])
		] as Point[]
	);
	$: xs = pointList.map((point) => point.x);
	$: ys = pointList.map((point) => point.y);

	$: naturalMinX = Math.min(...xs) - padding;
	$: naturalMaxX = Math.max(...xs) + padding;
	$: naturalMinY = Math.min(...ys) - padding;
	$: naturalMaxY = Math.max(...ys) + padding;

	$: naturalWidth = Math.max(1, naturalMaxX - naturalMinX);
	$: naturalHeight = Math.max(1, naturalMaxY - naturalMinY);

	$: effectiveViewport = viewport ?? {
		minX: naturalMinX,
		minY: naturalMinY,
		width: naturalWidth,
		height: naturalHeight
	};

	$: viewBox = `${effectiveViewport.minX} ${effectiveViewport.minY} ${effectiveViewport.width} ${effectiveViewport.height}`;
	$: points = pointList.map((point) => `${point.x},${point.y}`).join(" ");
	$: roundedPath =
		cornerRadius > 0 ? buildRoundedPath(pointList, cornerRadius) : null;
	$: useRoundedPath = Boolean(roundedPath);

	$: ariaHiddenValue = ariaHidden;

	function buildRoundedPath(points: readonly Point[], radius: number): string | null {
		if (points.length < 2) return null;
		const normalizedRadius = Math.max(0, radius);
		if (!normalizedRadius) return null;

		let path = `M ${points[0].x} ${points[0].y}`;

		for (let i = 1; i < points.length; i++) {
			const current = points[i];
			const isCorner = i < points.length - 1;
			const prev = points[i - 1];

			if (!isCorner) {
				path += ` L ${current.x} ${current.y}`;
				continue;
			}

			const next = points[i + 1];
			const lenToCorner = distance(prev, current);
			const lenFromCorner = distance(current, next);
			if (!lenToCorner || !lenFromCorner) {
				path += ` L ${current.x} ${current.y}`;
				continue;
			}

			const clampedRadius = Math.min(normalizedRadius, lenToCorner / 2, lenFromCorner / 2);
			if (clampedRadius <= 0) {
				path += ` L ${current.x} ${current.y}`;
				continue;
			}

			const dirToCorner = unitVector(prev, current);
			const dirFromCorner = unitVector(current, next);
			if (!dirToCorner || !dirFromCorner) {
				path += ` L ${current.x} ${current.y}`;
				continue;
			}

			const entryPoint: Point = {
				x: current.x - dirToCorner.x * clampedRadius,
				y: current.y - dirToCorner.y * clampedRadius
			};
			const exitPoint: Point = {
				x: current.x + dirFromCorner.x * clampedRadius,
				y: current.y + dirFromCorner.y * clampedRadius
			};

			path += ` L ${entryPoint.x} ${entryPoint.y} Q ${current.x} ${current.y} ${exitPoint.x} ${exitPoint.y}`;
		}

		return path;
	}

	function distance(a: Point, b: Point) {
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		return Math.hypot(dx, dy);
	}

	function unitVector(from: Point, to: Point): Point | null {
		const dx = to.x - from.x;
		const dy = to.y - from.y;
		const length = Math.hypot(dx, dy);
		if (!length) return null;
		return { x: dx / length, y: dy / length };
	}
</script>

<svg
	class={`svg-line ${className}`.trim()}
	width={effectiveViewport.width}
	height={effectiveViewport.height}
	viewBox={viewBox}
	role="img"
	aria-label={ariaLabel}
	aria-hidden={ariaHiddenValue}
	preserveAspectRatio="xMidYMid meet"
>
	{#if useRoundedPath}
		<path
			d={roundedPath!}
			fill="none"
			stroke={stroke}
			stroke-width={strokeWidth}
			stroke-linecap={strokeLinecap}
			stroke-linejoin={strokeLinejoin}
		/>
	{:else}
		<polyline
			points={points}
			fill="none"
			stroke={stroke}
			stroke-width={strokeWidth}
			stroke-linecap={strokeLinecap}
			stroke-linejoin={strokeLinejoin}
		/>
	{/if}
</svg>

<style>
	:global(:root) {
		--svg-line-default-stroke: currentColor;
	}

	svg.svg-line {
		display: block;
		overflow: visible;
	}
</style>
