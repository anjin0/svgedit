<script lang="ts">
	import type { LineElement } from '$lib/types';

	interface Props {
		element: LineElement;
		isSelected?: boolean;
		onSelect?: (id: string, e?: MouseEvent) => void;
	}

	let { element, isSelected = false, onSelect }: Props = $props();

	const handleMouseDown = (e: MouseEvent) => {
		e.stopPropagation();
		onSelect?.(element.id, e);
	};

	// Calculate center point for rotation
	const centerPoint = $derived(() => {
		const x1 = element.transform.x + element.x1;
		const y1 = element.transform.y + element.y1;
		const x2 = element.transform.x + element.x2;
		const y2 = element.transform.y + element.y2;
		return {
			x: (x1 + x2) / 2,
			y: (y1 + y2) / 2
		};
	});
</script>

<line
	x1={element.transform.x + element.x1}
	y1={element.transform.y + element.y1}
	x2={element.transform.x + element.x2}
	y2={element.transform.y + element.y2}
	stroke={element.stroke.color}
	stroke-width={element.stroke.width}
	opacity={element.opacity}
	transform="rotate({element.transform.rotation} {centerPoint().x} {centerPoint().y})"
	class="cursor-pointer"
	role="button"
	tabindex="0"
	onmousedown={handleMouseDown}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onSelect?.(element.id);
		}
	}}
	visibility={element.visible ? 'visible' : 'hidden'}
/>
