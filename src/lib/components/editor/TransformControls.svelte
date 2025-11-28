<script lang="ts">
	import type { SVGElement, TransformHandle, Point } from '$lib/types';
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

	// Helper function: Rotate a point around a center by a given angle (in degrees)
	const rotatePoint = (pointX: number, pointY: number, centerX: number, centerY: number, angleDeg: number): Point => {
		const angleRad = angleDeg * (Math.PI / 180);
		const cos = Math.cos(angleRad);
		const sin = Math.sin(angleRad);
		
		const relX = pointX - centerX;
		const relY = pointY - centerY;
		
		return {
			x: centerX + relX * cos - relY * sin,
			y: centerY + relX * sin + relY * cos
		};
	};

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
		} else if (element.type === 'ellipse') {
			// For ellipse, calculate based on initial center and radii (without padding)
			const initialCenterX = initialElement.transform.x;
			const initialCenterY = initialElement.transform.y;
			const initialRadiusX = initialElement.radiusX;
			const initialRadiusY = initialElement.radiusY;
			
			// Actual bounding box (without padding)
			const actualTopLeftX = initialCenterX - initialRadiusX;
			const actualTopLeftY = initialCenterY - initialRadiusY;
			const actualWidth = initialRadiusX * 2;
			const actualHeight = initialRadiusY * 2;
			
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
		// console.log('=== Handle Drag Info ===');
		// console.log('Handle Type:', dragHandle);
		// console.log('Current Handle Position:', currentHandle ? { x: currentHandle.x, y: currentHandle.y } : 'N/A');
		// console.log('Element Position:', { x: element.transform.x, y: element.transform.y });
		// console.log('Opposite Handle Position:', oppositeHandlePos);

		if (element.type === 'circle') {
			// Circle uses absolute mouse position (no rotation compensation needed)
			handleCircleResize(currentPoint, oppositeHandlePos);
		} else if (element.type === 'ellipse') {
			// Ellipse uses absolute mouse position (no rotation compensation needed)
			handleEllipseResize(currentPoint, oppositeHandlePos);
		} else {
			if (element.type === 'rectangle') {
				// Rectangle uses absolute mouse position to handle rotation correctly
				handleRectangleResize(currentPoint);
			} else if (element.type === 'line') {
				handleLineResize(rotatedDx, rotatedDy);
			}
		}
	};

	const handleRectangleResize = (dragGlobalPos: Point) => {
		if (element.type !== 'rectangle') return;

		console.log('=== Rectangle Resize (Global Anchor Point Method) ===');
		console.log('Drag Handle:', dragHandle);
		console.log('Drag Global Position:', dragGlobalPos);

		// Initial state (local coordinates)
		const initialX = initialElement.transform.x;
		const initialY = initialElement.transform.y;
		const initialWidth = initialElement.width;
		const initialHeight = initialElement.height;
		const rotation = initialElement.transform.rotation;

		// 1. Calculate initial center (local coordinates)
		const initialCenterX = initialX + initialWidth / 2;
		const initialCenterY = initialY + initialHeight / 2;

		// 2. Determine opposite handle(s) position in LOCAL coordinates
		let anchorLocalX: number;
		let anchorLocalY: number;
		let useDoubleAnchor = false;
		let anchor2LocalX: number = 0;
		let anchor2LocalY: number = 0;

		switch (dragHandle) {
			case 'top-left':
				anchorLocalX = initialX + initialWidth;
				anchorLocalY = initialY + initialHeight;
				break;
			case 'top-right':
				anchorLocalX = initialX;
				anchorLocalY = initialY + initialHeight;
				break;
			case 'bottom-left':
				anchorLocalX = initialX + initialWidth;
				anchorLocalY = initialY;
				break;
			case 'bottom-right':
				anchorLocalX = initialX;
				anchorLocalY = initialY;
				break;
			case 'top':
				// Fix bottom edge: bottom-left + bottom-right
				useDoubleAnchor = true;
				anchorLocalX = initialX;
				anchorLocalY = initialY + initialHeight;
				anchor2LocalX = initialX + initialWidth;
				anchor2LocalY = initialY + initialHeight;
				break;
			case 'bottom':
				// Fix top edge: top-left + top-right
				useDoubleAnchor = true;
				anchorLocalX = initialX;
				anchorLocalY = initialY;
				anchor2LocalX = initialX + initialWidth;
				anchor2LocalY = initialY;
				break;
			case 'left':
				// Fix right edge: top-right + bottom-right
				useDoubleAnchor = true;
				anchorLocalX = initialX + initialWidth;
				anchorLocalY = initialY;
				anchor2LocalX = initialX + initialWidth;
				anchor2LocalY = initialY + initialHeight;
				break;
			case 'right':
				// Fix left edge: top-left + bottom-left
				useDoubleAnchor = true;
				anchorLocalX = initialX;
				anchorLocalY = initialY;
				anchor2LocalX = initialX;
				anchor2LocalY = initialY + initialHeight;
				break;
			default:
				return;
		}

		// 3. Transform anchor(s) to GLOBAL coordinates (rotate around initial center)
		let anchorGlobalX: number;
		let anchorGlobalY: number;

		if (useDoubleAnchor) {
			// For edge handles: use midpoint of two fixed corners
			const anchor1Global = rotatePoint(
				anchorLocalX,
				anchorLocalY,
				initialCenterX,
				initialCenterY,
				rotation
			);
			const anchor2Global = rotatePoint(
				anchor2LocalX,
				anchor2LocalY,
				initialCenterX,
				initialCenterY,
				rotation
			);
			
			// Use midpoint as the effective anchor
			anchorGlobalX = (anchor1Global.x + anchor2Global.x) / 2;
			anchorGlobalY = (anchor1Global.y + anchor2Global.y) / 2;
			
			console.log('Anchor1 Local:', { x: anchorLocalX, y: anchorLocalY });
			console.log('Anchor1 Global:', anchor1Global);
			console.log('Anchor2 Local:', { x: anchor2LocalX, y: anchor2LocalY });
			console.log('Anchor2 Global:', anchor2Global);
			console.log('Fixed Edge Center (Global):', { x: anchorGlobalX, y: anchorGlobalY });
		} else {
			// For corner handles: single anchor point
			const anchorGlobal = rotatePoint(
				anchorLocalX,
				anchorLocalY,
				initialCenterX,
				initialCenterY,
				rotation
			);
			anchorGlobalX = anchorGlobal.x;
			anchorGlobalY = anchorGlobal.y;
			
			console.log('Anchor Local:', { x: anchorLocalX, y: anchorLocalY });
			console.log('Anchor Global (Fixed):', { x: anchorGlobalX, y: anchorGlobalY });
		}

		// 4. Calculate new center in GLOBAL coordinates
		let newCenterGlobalX: number;
		let newCenterGlobalY: number;

		if (useDoubleAnchor) {
			// For edge handles: only one dimension changes, the other is fixed
			// Determine if it's a vertical or horizontal edge
			const isVerticalEdge = Math.abs(anchorLocalX - anchor2LocalX) < 0.01;
			
			if (isVerticalEdge) {
				// Vertical edge (left/right handle): X changes, Y is fixed
				newCenterGlobalX = (anchorGlobalX + dragGlobalPos.x) / 2;
				newCenterGlobalY = anchorGlobalY;  // Fixed at anchor midpoint
			} else {
				// Horizontal edge (top/bottom handle): Y changes, X is fixed
				newCenterGlobalX = anchorGlobalX;  // Fixed at anchor midpoint
				newCenterGlobalY = (anchorGlobalY + dragGlobalPos.y) / 2;
			}
		} else {
			// Corner handle: both dimensions change
			newCenterGlobalX = (anchorGlobalX + dragGlobalPos.x) / 2;
			newCenterGlobalY = (anchorGlobalY + dragGlobalPos.y) / 2;
		}

		console.log('New Center Global:', { x: newCenterGlobalX, y: newCenterGlobalY });

		// 5. Transform both handles to LOCAL coordinates (rotate around NEW center)
		// Since the rectangle hasn't rotated yet, new center in global = new center in local
		const newCenterLocalX = newCenterGlobalX;
		const newCenterLocalY = newCenterGlobalY;

		// Transform anchor back to local (reverse rotation around new center)
		const anchorNewLocal = rotatePoint(
			anchorGlobalX,
			anchorGlobalY,
			newCenterLocalX,
			newCenterLocalY,
			-rotation
		);

		// Transform drag handle to local (reverse rotation around new center)
		const dragNewLocal = rotatePoint(
			dragGlobalPos.x,
			dragGlobalPos.y,
			newCenterLocalX,
			newCenterLocalY,
			-rotation
		);

		console.log('Anchor New Local:', anchorNewLocal);
		console.log('Drag New Local:', dragNewLocal);

		// 6. Calculate new rectangle dimensions in LOCAL coordinates
		let newWidth: number;
		let newHeight: number;

		if (useDoubleAnchor) {
			// For edge handles: need to calculate the fixed dimension correctly
			// Transform both fixed corners back to local coordinates
			const anchor1Global = rotatePoint(
				anchorLocalX,
				anchorLocalY,
				initialCenterX,
				initialCenterY,
				rotation
			);
			const anchor2Global = rotatePoint(
				anchor2LocalX,
				anchor2LocalY,
				initialCenterX,
				initialCenterY,
				rotation
			);
			
			const anchor1NewLocal = rotatePoint(
				anchor1Global.x,
				anchor1Global.y,
				newCenterLocalX,
				newCenterLocalY,
				-rotation
			);
			const anchor2NewLocal = rotatePoint(
				anchor2Global.x,
				anchor2Global.y,
				newCenterLocalX,
				newCenterLocalY,
				-rotation
			);

			// Calculate which dimension is fixed based on the two corners
			// If X coordinates are the same, it's a vertical edge (width changes, height fixed)
			// If Y coordinates are the same, it's a horizontal edge (height changes, width fixed)
			const isVerticalEdge = Math.abs(anchor1NewLocal.x - anchor2NewLocal.x) < 0.01;
			
			if (isVerticalEdge) {
				// Vertical edge (left or right handle): height is fixed
				newHeight = Math.abs(anchor2NewLocal.y - anchor1NewLocal.y);
				newWidth = Math.abs(dragNewLocal.x - anchorNewLocal.x);
			} else {
				// Horizontal edge (top or bottom handle): width is fixed
				newWidth = Math.abs(anchor2NewLocal.x - anchor1NewLocal.x);
				newHeight = Math.abs(dragNewLocal.y - anchorNewLocal.y);
			}
			
			console.log('Fixed Edge Corners (New Local):', { anchor1: anchor1NewLocal, anchor2: anchor2NewLocal });
			console.log('Is Vertical Edge:', isVerticalEdge);
		} else {
			// Corner handle: both dimensions change
			newWidth = Math.abs(dragNewLocal.x - anchorNewLocal.x);
			newHeight = Math.abs(dragNewLocal.y - anchorNewLocal.y);
		}

		// Minimum size constraints
		if (newWidth < 10) newWidth = 10;
		if (newHeight < 10) newHeight = 10;

		// 7. Calculate new top-left position (new center - half size)
		const newX = newCenterLocalX - newWidth / 2;
		const newY = newCenterLocalY - newHeight / 2;

		console.log('New Rectangle:', { x: newX, y: newY, width: newWidth, height: newHeight });
		console.log('Center moved by:', {
			dx: newCenterLocalX - initialCenterX,
			dy: newCenterLocalY - initialCenterY
		});

		editorStore.updateElement(element.id, {
			transform: { ...element.transform, x: newX, y: newY },
			width: newWidth,
			height: newHeight
		});
	};

	const handleCircleResize = (dragHandlePos: Point, oppositePos: Point) => {
		if (element.type !== 'circle') return;

		console.log('=== Circle Resize (Anchor Point Method) ===');
		console.log('Drag Handle:', dragHandle);
		console.log('Drag Handle Position:', dragHandlePos);
		console.log('Opposite Handle Position (Fixed):', oppositePos);

		// Calculate new center as midpoint between drag handle and opposite handle
		const newX = (dragHandlePos.x + oppositePos.x) / 2;
		const newY = (dragHandlePos.y + oppositePos.y) / 2;

		// Calculate new radius based on handle type
		let newRadius: number;

		switch (dragHandle) {
			case 'top-left':
			case 'top-right':
			case 'bottom-left':
			case 'bottom-right':
				// Corner handles: use diagonal distance / 2
				const diagonalDist = Math.sqrt(
					Math.pow(dragHandlePos.x - oppositePos.x, 2) +
					Math.pow(dragHandlePos.y - oppositePos.y, 2)
				);
				newRadius = diagonalDist / 2;
				break;

			case 'top':
			case 'bottom':
				// Vertical handles: use vertical distance / 2
				newRadius = Math.abs(dragHandlePos.y - oppositePos.y) / 2;
				break;

			case 'left':
			case 'right':
				// Horizontal handles: use horizontal distance / 2
				newRadius = Math.abs(dragHandlePos.x - oppositePos.x) / 2;
				break;

			default:
				newRadius = initialElement.radius;
		}

		// Minimum radius constraint
		const finalRadius = Math.max(5, newRadius);

		console.log('New Center:', { x: newX, y: newY });
		console.log('New Radius:', finalRadius);
		console.log('Center moved by:', {
			dx: newX - initialElement.transform.x,
			dy: newY - initialElement.transform.y
		});

		editorStore.updateElement(element.id, {
			transform: { ...element.transform, x: newX, y: newY },
			radius: finalRadius
		});
	};

	const handleEllipseResize = (dragHandlePos: Point, oppositePos: Point) => {
		if (element.type !== 'ellipse') return;

		console.log('=== Ellipse Resize (Anchor Point Method) ===');
		console.log('Drag Handle:', dragHandle);
		console.log('Drag Handle Position:', dragHandlePos);
		console.log('Opposite Handle Position (Fixed):', oppositePos);

		// Calculate new center as midpoint between drag handle and opposite handle
		const newX = (dragHandlePos.x + oppositePos.x) / 2;
		const newY = (dragHandlePos.y + oppositePos.y) / 2;

		// Calculate new radii based on distances
		const newRadiusX = Math.abs(dragHandlePos.x - oppositePos.x) / 2;
		const newRadiusY = Math.abs(dragHandlePos.y - oppositePos.y) / 2;

		// Minimum radius constraints
		const finalRadiusX = Math.max(5, newRadiusX);
		const finalRadiusY = Math.max(5, newRadiusY);

		console.log('New Center:', { x: newX, y: newY });
		console.log('New Radii:', { radiusX: finalRadiusX, radiusY: finalRadiusY });
		console.log('Center moved by:', {
			dx: newX - initialElement.transform.x,
			dy: newY - initialElement.transform.y
		});

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
	<!-- For Circle and Ellipse: Rotated selection box, non-rotated handles -->
	{@const b = bounds()}
	
	<!-- Rotated group: Selection box and rotation handle only -->
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
	</g>

	<!-- Transform handles (non-rotated, always axis-aligned) -->
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
{/if}
