<script lang="ts">
	import type { SVGElement, TransformHandle, Point } from '$lib/types';
	import { editorStore } from '$lib/stores/editor.svelte';
	import { transformStore } from '$lib/stores/transform.svelte';
	import { getMousePosition } from '$lib/utils/svg';

	interface Props {
		element: SVGElement;
		svgElement: SVGSVGElement;
		onStartTextEdit?: (id: string) => void;
		onEndTextEdit?: () => void;
		isTextEditing?: boolean;
	}

	let { element, svgElement, onStartTextEdit, onEndTextEdit, isTextEditing = false }: Props = $props();

	let isDragging = $state(false);
	let isRotating = $state(false);
	let dragHandle = $state<TransformHandle | null>(null);
	let dragStart = $state({ x: 0, y: 0 });
	let initialBounds = $state({ x: 0, y: 0, width: 0, height: 0 });
	let initialElement = $state<any>(null);

	// 텍스트 이동용 상태
	let isMovingText = $state(false);
	let textMoveStart = $state({ x: 0, y: 0 });
	let hasMovedText = $state(false);

	// 드래그 중 고정된 회전 중심 (Rectangle용)
	let rotateCenterX = $state(0);
	let rotateCenterY = $state(0);

	// 최소 크기 제한
	const MIN_SIZE = 10;

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
		} else if (element.type === 'text') {
			// Text는 Rectangle과 동일한 좌상단 기준 좌표계
			width = element.width;
			height = element.height;
			return {
				x: x - padding,
				y: y - padding,
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
		
		// 텍스트 편집 중이면 편집 종료
		if (element.type === 'text') {
			onEndTextEdit?.();
		}
		
		isDragging = true;
		dragHandle = handle;
		const svgPoint = getMousePosition(e, svgElement);
		dragStart = { x: svgPoint.x, y: svgPoint.y };
		initialBounds = { ...bounds() };
		initialElement = JSON.parse(JSON.stringify(element));

		// Rectangle: 드래그 시작 시 현재 중심을 회전 중심으로 고정
		if (element.type === 'rectangle') {
			const center = centerPoint();
			rotateCenterX = center.x;
			rotateCenterY = center.y;
			// transformStore에도 공유 (Rectangle 렌더링과 동기화)
			transformStore.setRotateCenter(center.x, center.y);
		}

		// Ellipse: 드래그 시작 시 현재 중심을 회전 중심으로 고정
		// Ellipse는 중심 기준 좌표계이므로 transform.x/y가 회전 중심
		if (element.type === 'ellipse') {
			rotateCenterX = element.transform.x;
			rotateCenterY = element.transform.y;
			// transformStore에도 공유 (Ellipse 렌더링과 동기화)
			transformStore.setRotateCenter(element.transform.x, element.transform.y);
		}

		// Text: Rectangle과 동일한 좌상단 기준 좌표계
		if (element.type === 'text') {
			const center = centerPoint();
			rotateCenterX = center.x;
			rotateCenterY = center.y;
			// transformStore에도 공유 (Text 렌더링과 동기화)
			transformStore.setRotateCenter(center.x, center.y);
		}
	};

	const handleRotateMouseDown = (e: MouseEvent) => {
		e.stopPropagation();
		
		// 텍스트 편집 중이면 편집 종료
		if (element.type === 'text') {
			onEndTextEdit?.();
		}
		
		isRotating = true;
		const svgPoint = getMousePosition(e, svgElement);
		dragStart = { x: svgPoint.x, y: svgPoint.y };
		initialElement = JSON.parse(JSON.stringify(element));
	};

	const handleMouseMove = (e: MouseEvent) => {
		// 텍스트 이동 처리
		if (isMovingText) {
			const currentPoint = getMousePosition(e, svgElement);
			const deltaX = currentPoint.x - textMoveStart.x;
			const deltaY = currentPoint.y - textMoveStart.y;
			
			// 최소 이동 거리 확인 (3px 이상 움직여야 드래그로 인식)
			if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
				hasMovedText = true;
			}
			
			if (hasMovedText) {
				editorStore.updateElement(element.id, {
					transform: {
						...element.transform,
						x: element.transform.x + deltaX,
						y: element.transform.y + deltaY
					}
				});
				textMoveStart = currentPoint;
			}
			return;
		}
		
		if (!isDragging && !isRotating) return;

		if (isRotating) {
			handleRotate(e);
		} else if (isDragging && dragHandle) {
			handleResize(e);
		}
	};

	const handleMouseUp = () => {
		// 텍스트 이동 완료 처리
		if (isMovingText) {
			if (!hasMovedText) {
				// 이동 없이 클릭만 했으면 편집 모드 진입
				onStartTextEdit?.(element.id);
			}
			isMovingText = false;
			hasMovedText = false;
			return;
		}
		
		// Rectangle: 드래그 종료 시 회전 중심 변경에 따른 좌표 보정
		if (element.type === 'rectangle' && isDragging) {
			const rotation = element.transform.rotation;
			
			// 1. 이전 회전 중심 저장
			const oldCenter: Point = { x: rotateCenterX, y: rotateCenterY };
			
			// 2. 새 회전 중심 = 현재 로컬 중심을 글로벌 좌표로 변환
			const localCenterX = element.transform.x + element.width / 2;
			const localCenterY = element.transform.y + element.height / 2;
			const newCenter = rotatePoint(localCenterX, localCenterY, oldCenter.x, oldCenter.y, rotation);
			
			// 3. top-left의 현재 글로벌 위치 계산 (이전 회전 중심 기준)
			const topLeftGlobal = rotatePoint(element.transform.x, element.transform.y, oldCenter.x, oldCenter.y, rotation);
			
			// 4. 새 회전 중심에서 같은 글로벌 위치가 되는 로컬 좌표 계산 (역회전)
			const newTopLeftLocal = rotatePoint(topLeftGlobal.x, topLeftGlobal.y, newCenter.x, newCenter.y, -rotation);
			
			// 5. 보정된 값으로 업데이트
			editorStore.updateElement(element.id, {
				transform: { ...element.transform, x: newTopLeftLocal.x, y: newTopLeftLocal.y }
			});
			
			// 6. 회전 중심 업데이트 (로컬 상태)
			rotateCenterX = newCenter.x;
			rotateCenterY = newCenter.y;
		}

		// Ellipse: 드래그 종료 시 회전 중심 변경에 따른 좌표 보정
		// Ellipse는 중심 기준 좌표계이므로 transform.x/y가 곧 중심
		if (element.type === 'ellipse' && isDragging) {
			const rotation = element.transform.rotation;
			
			// 1. 이전 회전 중심 저장
			const oldCenter: Point = { x: rotateCenterX, y: rotateCenterY };
			
			// 2. 새 회전 중심 = 현재 로컬 중심(transform.x/y)을 글로벌 좌표로 변환
			const localCenterX = element.transform.x;
			const localCenterY = element.transform.y;
			const newCenter = rotatePoint(localCenterX, localCenterY, oldCenter.x, oldCenter.y, rotation);
			
			// 3. 현재 중심의 글로벌 위치 계산 (이전 회전 중심 기준)
			const centerGlobal = rotatePoint(localCenterX, localCenterY, oldCenter.x, oldCenter.y, rotation);
			
			// 4. 새 회전 중심에서 같은 글로벌 위치가 되는 로컬 좌표 계산 (역회전)
			const newCenterLocal = rotatePoint(centerGlobal.x, centerGlobal.y, newCenter.x, newCenter.y, -rotation);
			
			// 5. 보정된 값으로 업데이트
			editorStore.updateElement(element.id, {
				transform: { ...element.transform, x: newCenterLocal.x, y: newCenterLocal.y }
			});
			
			// 6. 회전 중심 업데이트 (로컬 상태)
			rotateCenterX = newCenter.x;
			rotateCenterY = newCenter.y;
		}

		// Text: Rectangle과 동일한 좌표 보정 로직
		if (element.type === 'text' && isDragging) {
			const rotation = element.transform.rotation;
			
			// 1. 이전 회전 중심 저장
			const oldCenter: Point = { x: rotateCenterX, y: rotateCenterY };
			
			// 2. 새 회전 중심 = 현재 로컬 중심을 글로벌 좌표로 변환
			const localCenterX = element.transform.x + element.width / 2;
			const localCenterY = element.transform.y + element.height / 2;
			const newCenter = rotatePoint(localCenterX, localCenterY, oldCenter.x, oldCenter.y, rotation);
			
			// 3. top-left의 현재 글로벌 위치 계산 (이전 회전 중심 기준)
			const topLeftGlobal = rotatePoint(element.transform.x, element.transform.y, oldCenter.x, oldCenter.y, rotation);
			
			// 4. 새 회전 중심에서 같은 글로벌 위치가 되는 로컬 좌표 계산 (역회전)
			const newTopLeftLocal = rotatePoint(topLeftGlobal.x, topLeftGlobal.y, newCenter.x, newCenter.y, -rotation);
			
			// 5. 보정된 값으로 업데이트
			editorStore.updateElement(element.id, {
				transform: { ...element.transform, x: newTopLeftLocal.x, y: newTopLeftLocal.y }
			});
			
			// 6. 회전 중심 업데이트 (로컬 상태)
			rotateCenterX = newCenter.x;
			rotateCenterY = newCenter.y;
		}

		// transformStore 정리 (도형 렌더링과 동기화 해제)
		transformStore.rotateCenterX = null;
		transformStore.rotateCenterY = null;

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
			// Circle: 중심 고정, 반지름만 변경
			handleCircleResize(currentPoint);
		} else if (element.type === 'ellipse') {
			// Ellipse uses absolute mouse position to handle rotation correctly
			handleEllipseResize(currentPoint);
		} else if (element.type === 'rectangle') {
			// Rectangle uses absolute mouse position to handle rotation correctly
			handleRectangleResize(currentPoint);
		} else if (element.type === 'text') {
			// Text: Rectangle과 동일한 방식
			handleTextResize(currentPoint);
		} else if (element.type === 'line') {
			// Line: 끝점을 마우스 위치로 직접 이동
			handleLineResize(currentPoint);
		}
	};

	/**
	 * Rectangle 크기 조절 핸들러 (검증된 로직 적용)
	 * 
	 * 핵심 원리:
	 * 1. 마우스 글로벌 좌표를 로컬 좌표로 변환 (회전 중심 기준)
	 * 2. 현재 핸들의 widthId/heightId로 반대쪽 핸들의 로컬 좌표 참조
	 * 3. left/top 핸들: newX/newY 조정 + width/height 계산
	 * 4. right/bottom 핸들: width/height만 계산
	 */
	const handleRectangleResize = (mouseGlobalPos: Point) => {
		if (element.type !== 'rectangle' || !dragHandle) return;

		const rotation = element.transform.rotation;
		const rotateCenter: Point = { x: rotateCenterX, y: rotateCenterY };

		// 1. 마우스 글로벌 좌표를 로컬 좌표로 변환 (회전의 역변환)
		const mouseLocalPos = rotatePoint(mouseGlobalPos.x, mouseGlobalPos.y, rotateCenter.x, rotateCenter.y, -rotation);

		// 2. 현재 핸들의 로컬 좌표 기준 계산 (padding 제외)
		// bounds()는 padding이 포함되어 있으므로, element의 실제 좌표 사용
		const rectX = element.transform.x;
		const rectY = element.transform.y;
		const rectWidth = element.width;
		const rectHeight = element.height;

		// 로컬 좌표계에서의 8개 핸들 위치 (padding 없이)
		const localHandles: Record<TransformHandle, { x: number; y: number }> = {
			'top-left': { x: rectX, y: rectY },
			'top': { x: rectX + rectWidth / 2, y: rectY },
			'top-right': { x: rectX + rectWidth, y: rectY },
			'right': { x: rectX + rectWidth, y: rectY + rectHeight / 2 },
			'bottom-right': { x: rectX + rectWidth, y: rectY + rectHeight },
			'bottom': { x: rectX + rectWidth / 2, y: rectY + rectHeight },
			'bottom-left': { x: rectX, y: rectY + rectHeight },
			'left': { x: rectX, y: rectY + rectHeight / 2 },
			'rotate': { x: rectX + rectWidth / 2, y: rectY }
		};

		// 현재 핸들의 widthId, heightId 찾기
		const currentHandleInfo = handles().find(h => h.type === dragHandle);
		if (!currentHandleInfo) return;

		let newX = rectX;
		let newY = rectY;
		let newWidth = rectWidth;
		let newHeight = rectHeight;

		// 3. Width 계산
		if (currentHandleInfo.widthId) {
			const widthHandlePos = localHandles[currentHandleInfo.widthId];
			if (dragHandle.includes('left')) {
				// LEFT 계열 핸들: 오른쪽 경계를 넘어가지 않도록 제한
				const maxX = widthHandlePos.x - MIN_SIZE;
				newX = Math.min(mouseLocalPos.x, maxX);
				newWidth = widthHandlePos.x - newX;
			} else {
				// RIGHT 계열 핸들: 최소 크기 이상 유지
				newWidth = Math.max(mouseLocalPos.x - widthHandlePos.x, MIN_SIZE);
			}
		}

		// 4. Height 계산
		if (currentHandleInfo.heightId) {
			const heightHandlePos = localHandles[currentHandleInfo.heightId];
			if (dragHandle.includes('top')) {
				// TOP 계열 핸들: 아래쪽 경계를 넘어가지 않도록 제한
				const maxY = heightHandlePos.y - MIN_SIZE;
				newY = Math.min(mouseLocalPos.y, maxY);
				newHeight = heightHandlePos.y - newY;
			} else {
				// BOTTOM 계열 핸들: 최소 크기 이상 유지
				newHeight = Math.max(mouseLocalPos.y - heightHandlePos.y, MIN_SIZE);
			}
		}

		// 5. 업데이트
		editorStore.updateElement(element.id, {
			transform: { ...element.transform, x: newX, y: newY },
			width: newWidth,
			height: newHeight
		});
	};

	/**
	 * Text 크기 조절 핸들러 (Rectangle과 동일한 로직)
	 * 
	 * Text의 특성:
	 * - Rectangle과 동일한 좌상단 기준 좌표계
	 * - width, height 속성 사용
	 */
	const handleTextResize = (mouseGlobalPos: Point) => {
		if (element.type !== 'text' || !dragHandle) return;

		const rotation = element.transform.rotation;
		const rotateCenter: Point = { x: rotateCenterX, y: rotateCenterY };

		// 1. 마우스 글로벌 좌표를 로컬 좌표로 변환 (회전의 역변환)
		const mouseLocalPos = rotatePoint(mouseGlobalPos.x, mouseGlobalPos.y, rotateCenter.x, rotateCenter.y, -rotation);

		// 2. 현재 핸들의 로컬 좌표 기준 계산 (padding 제외)
		const textX = element.transform.x;
		const textY = element.transform.y;
		const textWidth = element.width;
		const textHeight = element.height;

		// 로컬 좌표계에서의 8개 핸들 위치 (padding 없이)
		const localHandles: Record<TransformHandle, { x: number; y: number }> = {
			'top-left': { x: textX, y: textY },
			'top': { x: textX + textWidth / 2, y: textY },
			'top-right': { x: textX + textWidth, y: textY },
			'right': { x: textX + textWidth, y: textY + textHeight / 2 },
			'bottom-right': { x: textX + textWidth, y: textY + textHeight },
			'bottom': { x: textX + textWidth / 2, y: textY + textHeight },
			'bottom-left': { x: textX, y: textY + textHeight },
			'left': { x: textX, y: textY + textHeight / 2 },
			'rotate': { x: textX + textWidth / 2, y: textY }
		};

		// 현재 핸들의 widthId, heightId 찾기
		const currentHandleInfo = handles().find(h => h.type === dragHandle);
		if (!currentHandleInfo) return;

		let newX = textX;
		let newY = textY;
		let newWidth = textWidth;
		let newHeight = textHeight;

		// 3. Width 계산
		if (currentHandleInfo.widthId) {
			const widthHandlePos = localHandles[currentHandleInfo.widthId];
			if (dragHandle.includes('left')) {
				// LEFT 계열 핸들: 오른쪽 경계를 넘어가지 않도록 제한
				const maxX = widthHandlePos.x - MIN_SIZE;
				newX = Math.min(mouseLocalPos.x, maxX);
				newWidth = widthHandlePos.x - newX;
			} else {
				// RIGHT 계열 핸들: 최소 크기 이상 유지
				newWidth = Math.max(mouseLocalPos.x - widthHandlePos.x, MIN_SIZE);
			}
		}

		// 4. Height 계산
		if (currentHandleInfo.heightId) {
			const heightHandlePos = localHandles[currentHandleInfo.heightId];
			if (dragHandle.includes('top')) {
				// TOP 계열 핸들: 아래쪽 경계를 넘어가지 않도록 제한
				const maxY = heightHandlePos.y - MIN_SIZE;
				newY = Math.min(mouseLocalPos.y, maxY);
				newHeight = heightHandlePos.y - newY;
			} else {
				// BOTTOM 계열 핸들: 최소 크기 이상 유지
				newHeight = Math.max(mouseLocalPos.y - heightHandlePos.y, MIN_SIZE);
			}
		}

		// 5. 업데이트
		editorStore.updateElement(element.id, {
			transform: { ...element.transform, x: newX, y: newY },
			width: newWidth,
			height: newHeight
		});
	};

	/**
	 * Circle 크기 조절 핸들러
	 * 
	 * 원의 특성:
	 * - 반대쪽 핸들 위치 고정 (드래그한 핸들 방향으로만 크기 변경)
	 * - 중심과 반지름이 함께 조정됨
	 * - 상하좌우 핸들만 사용 (코너 핸들 없음)
	 * - 회전 불필요 (회전해도 동일한 형태)
	 */
	const handleCircleResize = (dragHandlePos: Point) => {
		if (element.type !== 'circle' || !dragHandle) return;

		const cx = element.transform.x;
		const cy = element.transform.y;
		const radius = element.radius;

		let newCx = cx;
		let newCy = cy;
		let newRadius = radius;

		switch (dragHandle) {
			case 'left': {
				// 오른쪽 핸들 위치 고정
				const oppositeX = cx + radius;
				newCx = (dragHandlePos.x + oppositeX) / 2;
				newRadius = Math.abs(oppositeX - dragHandlePos.x) / 2;
				break;
			}
			case 'right': {
				// 왼쪽 핸들 위치 고정
				const oppositeX = cx - radius;
				newCx = (dragHandlePos.x + oppositeX) / 2;
				newRadius = Math.abs(dragHandlePos.x - oppositeX) / 2;
				break;
			}
			case 'top': {
				// 아래쪽 핸들 위치 고정
				const oppositeY = cy + radius;
				newCy = (dragHandlePos.y + oppositeY) / 2;
				newRadius = Math.abs(oppositeY - dragHandlePos.y) / 2;
				break;
			}
			case 'bottom': {
				// 위쪽 핸들 위치 고정
				const oppositeY = cy - radius;
				newCy = (dragHandlePos.y + oppositeY) / 2;
				newRadius = Math.abs(dragHandlePos.y - oppositeY) / 2;
				break;
			}
			default:
				return; // 코너 핸들은 무시 (Circle에서는 사용하지 않음)
		}

		// 최소 반지름 제한
		const finalRadius = Math.max(MIN_SIZE / 2, newRadius);

		editorStore.updateElement(element.id, {
			transform: { ...element.transform, x: newCx, y: newCy },
			radius: finalRadius
		});
	};

	/**
	 * Ellipse 크기 조절 핸들러 (검증된 로직 적용)
	 * 
	 * 핵심 원리:
	 * 1. 마우스 글로벌 좌표를 로컬 좌표로 변환 (회전 중심 기준)
	 * 2. 현재 핸들의 widthId/heightId로 반대쪽 핸들의 로컬 좌표 참조
	 * 3. 새 중심과 반지름 계산 (Ellipse는 중심 기준 좌표계)
	 */
	const handleEllipseResize = (mouseGlobalPos: Point) => {
		if (element.type !== 'ellipse' || !dragHandle) return;

		const rotation = element.transform.rotation;
		const rotateCenter: Point = { x: rotateCenterX, y: rotateCenterY };

		// 1. 마우스 글로벌 좌표를 로컬 좌표로 변환 (회전의 역변환)
		const mouseLocalPos = rotatePoint(mouseGlobalPos.x, mouseGlobalPos.y, rotateCenter.x, rotateCenter.y, -rotation);

		// 2. 현재 Ellipse의 로컬 핸들 위치 계산
		// Ellipse는 중심(transform.x/y) 기준 좌표계
		const cx = element.transform.x;
		const cy = element.transform.y;
		const rx = element.radiusX;
		const ry = element.radiusY;

		// 로컬 좌표계에서의 8개 핸들 위치
		const localHandles: Record<TransformHandle, { x: number; y: number }> = {
			'top-left': { x: cx - rx, y: cy - ry },
			'top': { x: cx, y: cy - ry },
			'top-right': { x: cx + rx, y: cy - ry },
			'right': { x: cx + rx, y: cy },
			'bottom-right': { x: cx + rx, y: cy + ry },
			'bottom': { x: cx, y: cy + ry },
			'bottom-left': { x: cx - rx, y: cy + ry },
			'left': { x: cx - rx, y: cy },
			'rotate': { x: cx, y: cy - ry }
		};

		// 현재 핸들의 widthId, heightId 찾기
		const currentHandleInfo = handles().find(h => h.type === dragHandle);
		if (!currentHandleInfo) return;

		let newCx = cx;
		let newCy = cy;
		let newRx = rx;
		let newRy = ry;

		// 3. RadiusX 계산 (수평 방향)
		if (currentHandleInfo.widthId) {
			const widthHandlePos = localHandles[currentHandleInfo.widthId];
			// Ellipse는 중심 기준이므로 새 중심과 반지름을 동시에 계산
			newCx = (mouseLocalPos.x + widthHandlePos.x) / 2;
			newRx = Math.abs(mouseLocalPos.x - widthHandlePos.x) / 2;
			// 최소 크기 제한
			if (newRx < MIN_SIZE / 2) {
				newRx = MIN_SIZE / 2;
				// 중심 위치도 조정
				if (dragHandle.includes('left')) {
					newCx = widthHandlePos.x - newRx;
				} else {
					newCx = widthHandlePos.x + newRx;
				}
			}
		}

		// 4. RadiusY 계산 (수직 방향)
		if (currentHandleInfo.heightId) {
			const heightHandlePos = localHandles[currentHandleInfo.heightId];
			// Ellipse는 중심 기준이므로 새 중심과 반지름을 동시에 계산
			newCy = (mouseLocalPos.y + heightHandlePos.y) / 2;
			newRy = Math.abs(mouseLocalPos.y - heightHandlePos.y) / 2;
			// 최소 크기 제한
			if (newRy < MIN_SIZE / 2) {
				newRy = MIN_SIZE / 2;
				// 중심 위치도 조정
				if (dragHandle.includes('top')) {
					newCy = heightHandlePos.y - newRy;
				} else {
					newCy = heightHandlePos.y + newRy;
				}
			}
		}

		// 5. 업데이트
		editorStore.updateElement(element.id, {
			transform: { ...element.transform, x: newCx, y: newCy },
			radiusX: newRx,
			radiusY: newRy
		});
	};

	/**
	 * Line 끝점 드래그 핸들러
	 * 
	 * Line의 특성:
	 * - 양 끝점에만 핸들 배치
	 * - 각 핸들을 드래그하면 해당 끝점만 마우스 따라 이동
	 * - 반대쪽 끝점은 고정
	 * - 회전 불필요 (끝점 위치로 방향 결정)
	 * 
	 * 핸들 매핑:
	 * - 'top-left' = 첫 번째 끝점 (x1, y1)
	 * - 'bottom-right' = 두 번째 끝점 (x2, y2)
	 */
	const handleLineResize = (mousePos: Point) => {
		if (element.type !== 'line' || !dragHandle) return;

		// Line의 좌표는 transform.x/y 기준 상대 좌표
		// 글로벌 좌표 = transform + 상대 좌표
		const baseX = element.transform.x;
		const baseY = element.transform.y;

		switch (dragHandle) {
			case 'top-left':
				// 첫 번째 끝점 이동 (x1, y1)
				editorStore.updateElement(element.id, {
					x1: mousePos.x - baseX,
					y1: mousePos.y - baseY
				});
				break;
			case 'bottom-right':
				// 두 번째 끝점 이동 (x2, y2)
				editorStore.updateElement(element.id, {
					x2: mousePos.x - baseX,
					y2: mousePos.y - baseY
				});
				break;
			default:
				return; // 다른 핸들은 무시
		}
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
		// widthId: 너비 계산 시 기준이 되는 반대쪽 핸들 (수평 방향)
		// heightId: 높이 계산 시 기준이 되는 반대쪽 핸들 (수직 방향)
		return [
			{ type: 'top-left' as TransformHandle, x: b.x, y: b.y, widthId: 'top-right' as TransformHandle, heightId: 'bottom-left' as TransformHandle },
			{ type: 'top-right' as TransformHandle, x: b.x + b.width, y: b.y, widthId: 'top-left' as TransformHandle, heightId: 'bottom-right' as TransformHandle },
			{ type: 'bottom-left' as TransformHandle, x: b.x, y: b.y + b.height, widthId: 'bottom-right' as TransformHandle, heightId: 'top-left' as TransformHandle },
			{ type: 'bottom-right' as TransformHandle, x: b.x + b.width, y: b.y + b.height, widthId: 'bottom-left' as TransformHandle, heightId: 'top-right' as TransformHandle },
			{ type: 'top' as TransformHandle, x: b.x + b.width / 2, y: b.y, widthId: null, heightId: 'bottom' as TransformHandle },
			{ type: 'bottom' as TransformHandle, x: b.x + b.width / 2, y: b.y + b.height, widthId: null, heightId: 'top' as TransformHandle },
			{ type: 'left' as TransformHandle, x: b.x, y: b.y + b.height / 2, widthId: 'right' as TransformHandle, heightId: null },
			{ type: 'right' as TransformHandle, x: b.x + b.width, y: b.y + b.height / 2, widthId: 'left' as TransformHandle, heightId: null }
		];
	});
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

{#if element.type === 'rectangle' || element.type === 'text'}
	<!-- Rectangle/Text: Rotated selection box and handles -->
	<!-- 드래그 중에는 고정된 rotateCenterX/Y 사용, 그 외에는 centerPoint() 사용 -->
	{@const rotCenterX = isDragging ? rotateCenterX : centerPoint().x}
	{@const rotCenterY = isDragging ? rotateCenterY : centerPoint().y}
	<g
		class="transform-controls"
		transform="rotate({element.transform.rotation} {rotCenterX} {rotCenterY})"
	>
		<!-- Selection box -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<rect
			x={bounds().x}
			y={bounds().y}
			width={bounds().width}
			height={bounds().height}
			fill={element.type === 'text' ? 'rgba(255,255,255,0.01)' : 'none'}
			stroke="#4f46e5"
			stroke-width="1"
			stroke-dasharray="4 2"
			pointer-events={element.type === 'text' && !isTextEditing ? 'fill' : 'none'}
			onmousedown={(e: MouseEvent) => {
				if (element.type === 'text' && !isTextEditing) {
					e.stopPropagation();
					// 텍스트 이동 시작 (클릭 vs 드래그 구분은 mouseup에서)
					isMovingText = true;
					hasMovedText = false;
					textMoveStart = getMousePosition(e, svgElement);
				}
			}}
			ondblclick={(e: MouseEvent) => {
				if (element.type === 'text' && !isTextEditing) {
					e.stopPropagation();
					onStartTextEdit?.(element.id);
				}
			}}
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
{:else if element.type === 'line'}
	<!-- Line: 양 끝점에만 핸들 배치, 회전/선택 박스 없음 -->
	{@const baseX = element.transform.x}
	{@const baseY = element.transform.y}
	{@const point1 = { x: baseX + element.x1, y: baseY + element.y1 }}
	{@const point2 = { x: baseX + element.x2, y: baseY + element.y2 }}
	
	<!-- 선 연결 표시 (점선) -->
	<line
		x1={point1.x}
		y1={point1.y}
		x2={point2.x}
		y2={point2.y}
		stroke="#4f46e5"
		stroke-width="1"
		stroke-dasharray="4 2"
		pointer-events="none"
	/>

	<!-- 첫 번째 끝점 핸들 -->
	<circle
		cx={point1.x}
		cy={point1.y}
		r="5"
		fill="white"
		stroke="#4f46e5"
		stroke-width="1.5"
		class="cursor-pointer"
		role="button"
		tabindex="0"
		aria-label="Line endpoint 1"
		onmousedown={(e) => handleMouseDown('top-left', e)}
	/>

	<!-- 두 번째 끝점 핸들 -->
	<circle
		cx={point2.x}
		cy={point2.y}
		r="5"
		fill="white"
		stroke="#4f46e5"
		stroke-width="1.5"
		class="cursor-pointer"
		role="button"
		tabindex="0"
		aria-label="Line endpoint 2"
		onmousedown={(e) => handleMouseDown('bottom-right', e)}
	/>
{:else if element.type === 'circle'}
	<!-- Circle: 상하좌우 핸들만, 회전 핸들 없음 (원은 회전해도 동일) -->
	{@const b = bounds()}
	
	<!-- Selection box (회전 불필요) -->
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

	<!-- 상하좌우 핸들만 (코너 핸들 제외) -->
	{#each handles().filter(h => ['top', 'bottom', 'left', 'right'].includes(h.type)) as handle}
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
{:else}
	<!-- Ellipse: Rotated selection box, non-rotated handles, rotation handle -->
	{@const b = bounds()}
	<!-- Ellipse 드래그 중에는 고정된 rotateCenterX/Y 사용, 그 외에는 centerPoint() 사용 -->
	{@const rotCenterX = isDragging ? rotateCenterX : centerPoint().x}
	{@const rotCenterY = isDragging ? rotateCenterY : centerPoint().y}
	
	<!-- Rotated group: Selection box and rotation handle only -->
	<g
		class="transform-controls"
		transform="rotate({element.transform.rotation} {rotCenterX} {rotCenterY})"
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
