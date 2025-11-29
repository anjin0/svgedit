<script lang="ts">
	import type { RectangleElement } from '$lib/types';

	interface Props {
		element: RectangleElement;
		isSelected?: boolean;
		onSelect?: (id: string, e?: MouseEvent) => void;
		// 외부에서 전달되는 회전 중심 (TransformControls와 동기화용)
		rotateCenterX?: number | null;
		rotateCenterY?: number | null;
	}

	let { element, isSelected = false, onSelect, rotateCenterX = null, rotateCenterY = null }: Props = $props();

	// 회전 중심: 외부에서 전달되면 사용, 아니면 현재 로컬 중심 사용
	const effectiveRotateCenterX = $derived(rotateCenterX ?? (element.transform.x + element.width / 2));
	const effectiveRotateCenterY = $derived(rotateCenterY ?? (element.transform.y + element.height / 2));

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

<rect
	x={element.transform.x}
	y={element.transform.y}
	width={element.width}
	height={element.height}
	rx={element.rx}
	ry={element.ry}
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
