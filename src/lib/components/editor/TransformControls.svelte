<script lang="ts">
	import type { SVGElement, TransformHandle } from '$lib/types';
	import { editorStore } from '$lib/stores/editor.svelte';
	import { getMousePosition } from '$lib/utils/svg';

	interface Props {
		element: SVGElement;
		svgElement: SVGSVGElement;
	}

	let { element, svgElement }: Props = $props();

	let isDragging = $state(false);
	let isRotating = $state(false);
	let dragHandle = $state<TransformHandle | null>(null);
	let dragStart = $state({ x: 0, y: 0 });
	let initialBounds = $state({ x: 0, y: 0, width: 0, height: 0 });
	let initialElement = $state<any>(null);

	const bounds = $derived(() => {
		const { x, y } = element.transform;
		const padding = 2; // 선택 상자 여백
		let width = 0;
		let height = 0;

		if (element.type === 'rectangle') {
			width = element.width;
			height = element.height;
			return {
				x: x - padding,
				y: y - padding,
				width: width + padding * 2,
				height: height + padding * 2
			};
		} else if (element.type === 'circle') {
			width = element.radius * 2;
			height = element.radius * 2;
			return {
				x: x - element.radius - padding,
				y: y - element.radius - padding,
				width: width + padding * 2,
				height: height + padding * 2
			};
		} else if (element.type === 'ellipse') {
			width = element.radiusX * 2;
			height = element.radiusY * 2;
			return {
				x: x - element.radiusX - padding,
				y: y - element.radiusY - padding,
				width: width + padding * 2,
				height: height + padding * 2
			};
		} else if (element.type === 'line') {
			const minX = Math.min(element.x1, element.x2);
			const minY = Math.min(element.y1, element.y2);
			width = Math.abs(element.x2 - element.x1);
			height = Math.abs(element.y2 - element.y1);
			return {
				x: x + minX - padding,
				y: y + minY - padding,
				width: width + padding * 2,
				height: height + padding * 2
			};
		}

		return { x, y, width, height };
	});

	// Calculate center point for rotation
	const centerPoint = $derived(() => {
		const b = bounds();
		return {
			x: b.x + b.width / 2,
			y: b.y + b.height / 2
		};
	});

	const handleMouseDown = (handle: TransformHandle, e: MouseEvent) => {
		e.stopPropagation();
		isDragging = true;
		dragHandle = handle;
		const svgPoint = getMousePosition(e, svgElement);
		dragStart = { x: svgPoint.x, y: svgPoint.y };
		initialBounds = { ...bounds() };
		initialElement = JSON.parse(JSON.stringify(element));
	};

	const handleRotateMouseDown = (e: MouseEvent) => {
		e.stopPropagation();
		isRotating = true;
		const svgPoint = getMousePosition(e, svgElement);
		dragStart = { x: svgPoint.x, y: svgPoint.y };
		initialElement = JSON.parse(JSON.stringify(element));
	};

	const handleMouseMove = (e: MouseEvent) => {
		if (!isDragging && !isRotating) return;

		if (isRotating) {
			handleRotate(e);
		} else if (isDragging && dragHandle) {
			handleResize(e);
		}
	};

	const handleMouseUp = () => {
		isDragging = false;
		isRotating = false;
		dragHandle = null;
	};

	const handleRotate = (e: MouseEvent) => {
		const center = centerPoint();
		const currentPoint = getMousePosition(e, svgElement);

		// Calculate angles in SVG coordinate system
		const startAngle = Math.atan2(dragStart.y - center.y, dragStart.x - center.x);
		const currentAngle = Math.atan2(currentPoint.y - center.y, currentPoint.x - center.x);
		const deltaAngle = (currentAngle - startAngle) * (180 / Math.PI);

		const newRotation = initialElement.transform.rotation + deltaAngle;

		editorStore.updateElement(element.id, {
			transform: {
				...element.transform,
				rotation: newRotation
			}
		});
	};

	const handleResize = (e: MouseEvent) => {
		if (!dragHandle) return;

		const currentPoint = getMousePosition(e, svgElement);

		// Calculate delta and apply rotation for all shape types
		const dx = currentPoint.x - dragStart.x;
		const dy = currentPoint.y - dragStart.y;
		const rotation = -element.transform.rotation * (Math.PI / 180);
		const cos = Math.cos(rotation);
		const sin = Math.sin(rotation);
		const rotatedDx = dx * cos - dy * sin;
		const rotatedDy = dx * sin + dy * cos;

		// Get current handle positions
		const currentHandles = handles();
		const currentHandle = currentHandles.find((h) => h.type === dragHandle);
		
		// Calculate opposite handle position based on initial element state (fixed position)
		// Need to account for padding in bounds() - padding is 2
		const padding = 2;
		let oppositeHandlePos = { x: 0, y: 0 };
		
		if (element.type === 'circle') {
			// For circle, calculate based on initial center and radius (without padding)
			const initialCenterX = initialElement.transform.x;
			const initialCenterY = initialElement.transform.y;
			const initialRadius = initialElement.radius;
			
			// Actual bounding box (without padding)
			const actualTopLeftX = initialCenterX - initialRadius;
			const actualTopLeftY = initialCenterY - initialRadius;
			const actualWidth = initialRadius * 2;
			const actualHeight = initialRadius * 2;
			
			switch (dragHandle) {
				case 'top-left':
					oppositeHandlePos = { x: actualTopLeftX + actualWidth, y: actualTopLeftY + actualHeight };
					break;
				case 'top-right':
					oppositeHandlePos = { x: actualTopLeftX, y: actualTopLeftY + actualHeight };
					break;
				case 'bottom-left':
					oppositeHandlePos = { x: actualTopLeftX + actualWidth, y: actualTopLeftY };
					break;
				case 'bottom-right':
					oppositeHandlePos = { x: actualTopLeftX, y: actualTopLeftY };
					break;
				case 'top':
					oppositeHandlePos = { x: actualTopLeftX + actualWidth / 2, y: actualTopLeftY + actualHeight };
					break;
				case 'bottom':
					oppositeHandlePos = { x: actualTopLeftX + actualWidth / 2, y: actualTopLeftY };
					break;
				case 'left':
					oppositeHandlePos = { x: actualTopLeftX + actualWidth, y: actualTopLeftY + actualHeight / 2 };
					break;
				case 'right':
					oppositeHandlePos = { x: actualTopLeftX, y: actualTopLeftY + actualHeight / 2 };
					break;
			}
		} else {
			// For other shapes, use initialBounds but account for padding
			const b = initialBounds;
			const actualX = b.x + padding;
			const actualY = b.y + padding;
			const actualWidth = b.width - padding * 2;
			const actualHeight = b.height - padding * 2;
			
			switch (dragHandle) {
				case 'top-left':
					oppositeHandlePos = { x: actualX + actualWidth, y: actualY + actualHeight };
					break;
				case 'top-right':
					oppositeHandlePos = { x: actualX, y: actualY + actualHeight };
					break;
				case 'bottom-left':
					oppositeHandlePos = { x: actualX + actualWidth, y: actualY };
					break;
				case 'bottom-right':
					oppositeHandlePos = { x: actualX, y: actualY };
					break;
				case 'top':
					oppositeHandlePos = { x: actualX + actualWidth / 2, y: actualY + actualHeight };
					break;
				case 'bottom':
					oppositeHandlePos = { x: actualX + actualWidth / 2, y: actualY };
					break;
				case 'left':
					oppositeHandlePos = { x: actualX + actualWidth, y: actualY + actualHeight / 2 };
					break;
				case 'right':
					oppositeHandlePos = { x: actualX, y: actualY + actualHeight / 2 };
					break;
			}
		}

		// Log handle positions
		console.log('=== Handle Drag Info ===');
		console.log('Handle Type:', dragHandle);
		console.log('Current Handle Position:', currentHandle ? { x: currentHandle.x, y: currentHandle.y } : 'N/A');
		console.log('Element Position:', { x: element.transform.x, y: element.transform.y });
		console.log('Opposite Handle Position:', oppositeHandlePos);

		if (element.type === 'circle') {
			// Circle uses delta with rotation
			handleCircleResize(rotatedDx, rotatedDy);
		} else if (element.type === 'ellipse') {
			// Ellipse uses delta with rotation
			handleEllipseResize(rotatedDx, rotatedDy);
		} else {
			if (element.type === 'rectangle') {
				handleRectangleResize(rotatedDx, rotatedDy);
			} else if (element.type === 'line') {
				handleLineResize(rotatedDx, rotatedDy);
			}
		}
	};

	const handleRectangleResize = (dx: number, dy: number) => {
		if (element.type !== 'rectangle') return;

		let newX = initialElement.transform.x;
		let newY = initialElement.transform.y;
		let newWidth = initialElement.width;
		let newHeight = initialElement.height;

		switch (dragHandle) {
			case 'top-left':
				newX += dx;
				newY += dy;
				newWidth -= dx;
				newHeight -= dy;
				break;
			case 'top-right':
				newY += dy;
				newWidth += dx;
				newHeight -= dy;
				break;
			case 'bottom-left':
				newX += dx;
				newWidth -= dx;
				newHeight += dy;
				break;
			case 'bottom-right':
				newWidth += dx;
				newHeight += dy;
				break;
			case 'top':
				newY += dy;
				newHeight -= dy;
				break;
			case 'bottom':
				newHeight += dy;
				break;
			case 'left':
				newX += dx;
				newWidth -= dx;
				break;
			case 'right':
				newWidth += dx;
				break;
		}

		if (newWidth < 10) newWidth = 10;
		if (newHeight < 10) newHeight = 10;

		editorStore.updateElement(element.id, {
			transform: { ...element.transform, x: newX, y: newY },
			width: newWidth,
			height: newHeight
		});
	};

	const handleCircleResize = (dx: number, dy: number) => {
		if (element.type !== 'circle') return;

		// Initial state from when drag started
		const initialCenterX = initialElement.transform.x;
		const initialCenterY = initialElement.transform.y;
		const initialRadius = initialElement.radius;

		// Calculate as if it's a rectangle (bounding box)
		// Rectangle uses top-left corner, circle uses center
		// So we need to convert: topLeftX = centerX - radius
		let topLeftX = initialCenterX - initialRadius;
		let topLeftY = initialCenterY - initialRadius;
		let newWidth = initialRadius * 2;
		let newHeight = initialRadius * 2;

		console.log('=== Circle Resize Debug ===');
		console.log('Initial:', { centerX: initialCenterX, centerY: initialCenterY, radius: initialRadius });
		console.log('Initial topLeft:', { x: topLeftX, y: topLeftY });
		console.log('Delta:', { dx, dy });
		console.log('Drag Handle:', dragHandle);

		// Use same logic as Rectangle for bounding box
		switch (dragHandle) {
			case 'top-left':
				topLeftX += dx;
				topLeftY += dy;
				newWidth -= dx;
				newHeight -= dy;
				break;
			case 'top-right':
				topLeftY += dy;
				newWidth += dx;
				newHeight -= dy;
				break;
			case 'bottom-left':
				topLeftX += dx;
				newWidth -= dx;
				newHeight += dy;
				break;
			case 'bottom-right':
				newWidth += dx;
				newHeight += dy;
				break;
			case 'top':
				topLeftY += dy;
				newHeight -= dy;
				break;
			case 'bottom':
				newHeight += dy;
				break;
			case 'left':
				topLeftX += dx;
				newWidth -= dx;
				break;
			case 'right':
				newWidth += dx;
				break;
		}

		console.log('After switch - topLeft:', { x: topLeftX, y: topLeftY });
		console.log('After switch - size:', { width: newWidth, height: newHeight });

		// Convert back to circle: center = topLeft + (width/2, height/2)
		const newX = topLeftX + newWidth / 2;
		const newY = topLeftY + newHeight / 2;

		console.log('New center:', { x: newX, y: newY });
		console.log('Center moved by:', { dx: newX - initialCenterX, dy: newY - initialCenterY });

		// For circle, use the average of width and height to maintain circular shape
		const avgSize = (newWidth + newHeight) / 2;
		const newRadius = avgSize / 2;

		// Minimum radius constraint
		const finalRadius = Math.max(5, newRadius);

		console.log('New radius:', finalRadius);
		console.log('Opposite handle should be at:', {
			topLeft: { x: topLeftX, y: topLeftY },
			bottomRight: { x: topLeftX + newWidth, y: topLeftY + newHeight }
		});

		editorStore.updateElement(element.id, {
			transform: { ...element.transform, x: newX, y: newY },
			radius: finalRadius
		});
	};

	const handleEllipseResize = (dx: number, dy: number) => {
		if (element.type !== 'ellipse') return;

		// Initial state from when drag started
		const initialCenterX = initialElement.transform.x;
		const initialCenterY = initialElement.transform.y;
		const initialRadiusX = initialElement.radiusX;
		const initialRadiusY = initialElement.radiusY;

		// Calculate as if it's a rectangle (bounding box)
		// Rectangle uses top-left corner, ellipse uses center
		// So we need to convert: topLeftX = centerX - radiusX
		let topLeftX = initialCenterX - initialRadiusX;
		let topLeftY = initialCenterY - initialRadiusY;
		let newWidth = initialRadiusX * 2;
		let newHeight = initialRadiusY * 2;

		// Use same logic as Rectangle for bounding box
		switch (dragHandle) {
			case 'top-left':
				topLeftX += dx;
				topLeftY += dy;
				newWidth -= dx;
				newHeight -= dy;
				break;
			case 'top-right':
				topLeftY += dy;
				newWidth += dx;
				newHeight -= dy;
				break;
			case 'bottom-left':
				topLeftX += dx;
				newWidth -= dx;
				newHeight += dy;
				break;
			case 'bottom-right':
				newWidth += dx;
				newHeight += dy;
				break;
			case 'top':
				topLeftY += dy;
				newHeight -= dy;
				break;
			case 'bottom':
				newHeight += dy;
				break;
			case 'left':
				topLeftX += dx;
				newWidth -= dx;
				break;
			case 'right':
				newWidth += dx;
				break;
		}

		// Convert back to ellipse: center = topLeft + (width/2, height/2)
		const newX = topLeftX + newWidth / 2;
		const newY = topLeftY + newHeight / 2;
		const newRadiusX = newWidth / 2;
		const newRadiusY = newHeight / 2;

		// Minimum radius constraints
		const finalRadiusX = Math.max(5, newRadiusX);
		const finalRadiusY = Math.max(5, newRadiusY);

		editorStore.updateElement(element.id, {
			transform: { ...element.transform, x: newX, y: newY },
			radiusX: finalRadiusX,
			radiusY: finalRadiusY
		});
	};

	const handleLineResize = (dx: number, dy: number) => {
		if (element.type !== 'line') return;

		// Line uses relative coordinates, so we need to adjust the transform origin
		// and the relative endpoints to maintain the anchor point
		const initialX = initialElement.transform.x;
		const initialY = initialElement.transform.y;
		const initialX1 = initialElement.x1;
		const initialY1 = initialElement.y1;
		const initialX2 = initialElement.x2;
		const initialY2 = initialElement.y2;

		let newX = initialX;
		let newY = initialY;
		let newX1 = initialX1;
		let newY1 = initialY1;
		let newX2 = initialX2;
		let newY2 = initialY2;

		// Determine which end is which
		const isX1Left = initialX1 < initialX2;
		const isY1Top = initialY1 < initialY2;

		// For lines, we adjust both the transform origin and the relative coordinates
		// so that the opposite endpoint stays fixed
		switch (dragHandle) {
			case 'top-left':
				// Anchor: bottom-right
				newX = initialX + dx / 2;
				newY = initialY + dy / 2;
				if (isX1Left) {
					newX1 = initialX1 - dx / 2;
					newX2 = initialX2 - dx / 2;
				} else {
					newX1 = initialX1 - dx / 2;
					newX2 = initialX2 - dx / 2;
				}
				if (isY1Top) {
					newY1 = initialY1 - dy / 2;
					newY2 = initialY2 - dy / 2;
				} else {
					newY1 = initialY1 - dy / 2;
					newY2 = initialY2 - dy / 2;
				}
				break;
			case 'top-right':
				// Anchor: bottom-left
				newX = initialX + dx / 2;
				newY = initialY + dy / 2;
				newX1 = initialX1 + dx / 2;
				newX2 = initialX2 + dx / 2;
				newY1 = initialY1 - dy / 2;
				newY2 = initialY2 - dy / 2;
				break;
			case 'bottom-left':
				// Anchor: top-right
				newX = initialX + dx / 2;
				newY = initialY + dy / 2;
				newX1 = initialX1 - dx / 2;
				newX2 = initialX2 - dx / 2;
				newY1 = initialY1 + dy / 2;
				newY2 = initialY2 + dy / 2;
				break;
			case 'bottom-right':
				// Anchor: top-left
				newX = initialX + dx / 2;
				newY = initialY + dy / 2;
				newX1 = initialX1 + dx / 2;
				newX2 = initialX2 + dx / 2;
				newY1 = initialY1 + dy / 2;
				newY2 = initialY2 + dy / 2;
				break;
			case 'top':
				// Anchor: bottom
				newY = initialY + dy / 2;
				newY1 = initialY1 - dy / 2;
				newY2 = initialY2 - dy / 2;
				break;
			case 'bottom':
				// Anchor: top
				newY = initialY + dy / 2;
				newY1 = initialY1 + dy / 2;
				newY2 = initialY2 + dy / 2;
				break;
			case 'left':
				// Anchor: right
				newX = initialX + dx / 2;
				newX1 = initialX1 - dx / 2;
				newX2 = initialX2 - dx / 2;
				break;
			case 'right':
				// Anchor: left
				newX = initialX + dx / 2;
				newX1 = initialX1 + dx / 2;
				newX2 = initialX2 + dx / 2;
				break;
		}

		editorStore.updateElement(element.id, {
			transform: { ...element.transform, x: newX, y: newY },
			x1: newX1,
			y1: newY1,
			x2: newX2,
			y2: newY2
		});
	};

	$effect(() => {
		if (isDragging || isRotating) {
			window.addEventListener('mousemove', handleMouseMove);
			window.addEventListener('mouseup', handleMouseUp);

			return () => {
				window.removeEventListener('mousemove', handleMouseMove);
				window.removeEventListener('mouseup', handleMouseUp);
			};
		}
	});

	const handles = $derived(() => {
		// Use bounds() to update handles in real-time during drag
		const b = bounds();
		return [
			{ type: 'top-left' as TransformHandle, x: b.x, y: b.y },
			{ type: 'top-right' as TransformHandle, x: b.x + b.width, y: b.y },
			{ type: 'bottom-left' as TransformHandle, x: b.x, y: b.y + b.height },
			{ type: 'bottom-right' as TransformHandle, x: b.x + b.width, y: b.y + b.height },
			{ type: 'top' as TransformHandle, x: b.x + b.width / 2, y: b.y },
			{ type: 'bottom' as TransformHandle, x: b.x + b.width / 2, y: b.y + b.height },
			{ type: 'left' as TransformHandle, x: b.x, y: b.y + b.height / 2 },
			{ type: 'right' as TransformHandle, x: b.x + b.width, y: b.y + b.height / 2 }
		];
	});
</script>

{#if element.type === 'rectangle' || element.type === 'line'}
	<!-- For Rectangle and Line: Rotated selection box and handles -->
	<g
		class="transform-controls"
		transform="rotate({element.transform.rotation} {centerPoint().x} {centerPoint().y})"
	>
		<!-- Selection box -->
		<rect
			x={bounds().x}
			y={bounds().y}
			width={bounds().width}
			height={bounds().height}
			fill="none"
			stroke="#4f46e5"
			stroke-width="1"
			stroke-dasharray="4 2"
			pointer-events="none"
		/>

		<!-- Rotation handle line -->
		<line
			x1={bounds().x + bounds().width / 2}
			y1={bounds().y}
			x2={bounds().x + bounds().width / 2}
			y2={bounds().y - 30}
			stroke="#4f46e5"
			stroke-width="1"
			pointer-events="none"
		/>

		<!-- Rotation handle -->
		<circle
			cx={bounds().x + bounds().width / 2}
			cy={bounds().y - 30}
			r="6"
			fill="white"
			stroke="#4f46e5"
			stroke-width="1.5"
			class="cursor-pointer"
			role="button"
			tabindex="0"
			aria-label="Rotate element"
			onmousedown={handleRotateMouseDown}
		/>

		<!-- Transform handles -->
		{#each handles() as handle}
			<rect
				x={handle.x - 4}
				y={handle.y - 4}
				width="8"
				height="8"
				fill="white"
				stroke="#4f46e5"
				stroke-width="1.5"
				class="cursor-pointer"
				role="button"
				tabindex="0"
				aria-label="Resize handle: {handle.type}"
				onmousedown={(e) => handleMouseDown(handle.type, e)}
			/>
		{/each}
	</g>
{:else}
	<!-- For Circle and Ellipse: Rotated selection box and handles -->
	{@const b = bounds()}
	<g
		class="transform-controls"
		transform="rotate({element.transform.rotation} {centerPoint().x} {centerPoint().y})"
	>
		<!-- Selection box -->
		<rect
			x={b.x}
			y={b.y}
			width={b.width}
			height={b.height}
			fill="none"
			stroke="#4f46e5"
			stroke-width="1"
			stroke-dasharray="4 2"
			pointer-events="none"
		/>

		<!-- Rotation handle line -->
		<line
			x1={b.x + b.width / 2}
			y1={b.y}
			x2={b.x + b.width / 2}
			y2={b.y - 30}
			stroke="#4f46e5"
			stroke-width="1"
			pointer-events="none"
		/>

		<!-- Rotation handle -->
		<circle
			cx={b.x + b.width / 2}
			cy={b.y - 30}
			r="6"
			fill="white"
			stroke="#4f46e5"
			stroke-width="1.5"
			class="cursor-pointer"
			role="button"
			tabindex="0"
			aria-label="Rotate element"
			onmousedown={handleRotateMouseDown}
		/>

		<!-- Transform handles -->
		{#each handles() as handle}
			<rect
				x={handle.x - 4}
				y={handle.y - 4}
				width="8"
				height="8"
				fill="white"
				stroke="#4f46e5"
				stroke-width="1.5"
				class="cursor-pointer"
				role="button"
				tabindex="0"
				aria-label="Resize handle: {handle.type}"
				onmousedown={(e) => handleMouseDown(handle.type, e)}
			/>
		{/each}
	</g>
{/if}
