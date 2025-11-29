<script lang="ts">
	import type { EllipseElement } from '$lib/types';

	interface Props {
		element: EllipseElement;
		isSelected?: boolean;
		onSelect?: (id: string, e?: MouseEvent) => void;
		// 외부에서 전달되는 회전 중심 (TransformControls와 동기화용)
		rotateCenterX?: number | null;
		rotateCenterY?: number | null;
	}

	let { element, isSelected = false, onSelect, rotateCenterX = null, rotateCenterY = null }: Props = $props();

	// 회전 중심: 외부에서 전달되면 사용, 아니면 현재 중심(transform.x/y) 사용
	// Ellipse는 중심 기준 좌표계이므로 transform.x/y가 곧 회전 중심
	const effectiveRotateCenterX = $derived(rotateCenterX ?? element.transform.x);
	const effectiveRotateCenterY = $derived(rotateCenterY ?? element.transform.y);

	const handleMouseDown = (e: MouseEvent) => {
		e.stopPropagation();
		onSelect?.(element.id, e);
	};

	const fillStyle = $derived(() => {
		if (element.fill.type === 'solid') {
			return element.fill.color || 'none';
		} else if (element.fill.type === 'gradient' && element.fill.gradient) {
			return `url(#gradient-${element.id})`;
		}
		return 'none';
	});

	const transform = $derived(() => {
		const { x, y, rotation } = element.transform;
		return `translate(${x}, ${y}) rotate(${rotation})`;
	});
</script>

<defs>
	{#if element.fill.type === 'gradient' && element.fill.gradient}
		<linearGradient id="gradient-{element.id}" x1="{element.fill.gradient.x1 || 0}%" y1="{element.fill.gradient.y1 || 0}%" x2="{element.fill.gradient.x2 || 100}%" y2="{element.fill.gradient.y2 || 0}%">
			{#each element.fill.gradient.stops as stop}
				<stop offset="{stop.offset * 100}%" stop-color={stop.color} stop-opacity={stop.opacity} />
			{/each}
		</linearGradient>
	{/if}
</defs>

<ellipse
	cx={element.transform.x}
	cy={element.transform.y}
	rx={element.radiusX}
	ry={element.radiusY}
	fill={fillStyle()}
	fill-opacity={element.fill.opacity || 1}
	stroke={element.stroke.color}
	stroke-width={element.stroke.width}
	opacity={element.opacity}
	transform="rotate({element.transform.rotation} {effectiveRotateCenterX} {effectiveRotateCenterY})"
	class="cursor-pointer"
	onmousedown={handleMouseDown}
	visibility={element.visible ? 'visible' : 'hidden'}
/>
