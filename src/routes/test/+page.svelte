<script lang="ts">
	import type { Point } from '$lib/types';
	import { getMousePosition } from '$lib/utils/svg';

	// SVG Element reference
	let svgElement: SVGSVGElement;

	// Rectangle state
	let rectX = $state(200);
	let rectY = $state(150);
	let rectWidth = $state(200);
	let rectHeight = $state(100);
	let rotation = $state(0);

	// Drag state
	let isDragging = $state(false);
	let dragHandle = $state<string | null>(null);
	let dragStart = $state<Point>({ x: 0, y: 0 });
	let initialRect = $state({ x: 0, y: 0, width: 0, height: 0, rotation: 0 });

	// 헬퍼: 점을 중심(cx, cy) 기준으로 angleDeg만큼 회전 (시계 방향이 +)
	const rotatePoint = (px: number, py: number, cx: number, cy: number, angleDeg: number): Point => {
		const angleRad = angleDeg * (Math.PI / 180);
		const cos = Math.cos(angleRad);
		const sin = Math.sin(angleRad);
		const relX = px - cx;
		const relY = py - cy;
		return {
			x: cx + relX * cos - relY * sin,
			y: cy + relX * sin + relY * cos
		};
	};

	// Calculate center
	const centerX = $derived(rectX + rectWidth / 2);
	const centerY = $derived(rectY + rectHeight / 2);

	// Calculate handles (always axis-aligned, no rotation)
	const handles = $derived(() => {
		const padding = 4;
		// Bounding box in local coordinates
		const localX = rectX - padding;
		const localY = rectY - padding;
		const localWidth = rectWidth + padding * 2;
		const localHeight = rectHeight + padding * 2;

		return [
			{ id: 'top-left', x: localX, y: localY },
			{ id: 'top', x: localX + localWidth / 2, y: localY },
			{ id: 'top-right', x: localX + localWidth, y: localY },
			{ id: 'right', x: localX + localWidth, y: localY + localHeight / 2 },
			{ id: 'bottom-right', x: localX + localWidth, y: localY + localHeight },
			{ id: 'bottom', x: localX + localWidth / 2, y: localY + localHeight },
			{ id: 'bottom-left', x: localX, y: localY + localHeight },
			{ id: 'left', x: localX, y: localY + localHeight / 2 }
		];
	});

	// Handle mouse down on handles
	const handleMouseDown = (handleId: string, e: MouseEvent) => {
		e.stopPropagation();
		isDragging = true;
		dragHandle = handleId;
		// Convert mouse position to SVG coordinates
		const mousePos = getMousePosition(e, svgElement);
		dragStart = { x: mousePos.x, y: mousePos.y };
		initialRect = { x: rectX, y: rectY, width: rectWidth, height: rectHeight, rotation };
	};

	// 마우스 이동 핸들러 (변형 로직의 핵심)
	const handleMouseMove = (e: MouseEvent) => {
		if (!isDragging || !dragHandle) return;

		// Convert mouse position to SVG coordinates
		const mousePos = getMousePosition(e, svgElement);
		const currentX = mousePos.x;
		const currentY = mousePos.y;

		console.log('=== Drag Info ===');
		console.log('Handle:', dragHandle);
		console.log('Mouse (SVG):', { x: currentX, y: currentY });
		console.log('Drag Start:', $state.snapshot(dragStart));
		console.log('Initial Rect:', $state.snapshot(initialRect));

		// 1. 마우스 위치는 이미 전역(Global) 좌표계 (SVG 사용자 좌표계)
		const mouseGlobal = { x: currentX, y: currentY };

		// 2. 핸들 타입에 따라 '고정점(Anchor)'을 로컬(Local) 좌표계에서 결정
		//    (회전하기 전의 순수한 사각형 좌표 기준)
		let anchor1LocalX: number, anchor1LocalY: number;
		let anchor2LocalX: number = 0, anchor2LocalY: number = 0;
		let useDoubleAnchor = false; // 변 핸들(Edge handle)인 경우 두 모서리를 고정점으로 사용

		const initialCenterX = initialRect.x + initialRect.width / 2;
		const initialCenterY = initialRect.y + initialRect.height / 2;

		switch (dragHandle) {
			case 'top-left': // 대각선 반대편인 bottom-right가 고정
				anchor1LocalX = initialRect.x + initialRect.width;
				anchor1LocalY = initialRect.y + initialRect.height;
				break;
			case 'top-right': // bottom-left 고정
				anchor1LocalX = initialRect.x;
				anchor1LocalY = initialRect.y + initialRect.height;
				break;
			case 'bottom-left': // top-right 고정
				anchor1LocalX = initialRect.x + initialRect.width;
				anchor1LocalY = initialRect.y;
				break;
			case 'bottom-right': // top-left 고정
				anchor1LocalX = initialRect.x;
				anchor1LocalY = initialRect.y;
				break;
			case 'top': // 아래쪽 변(bottom edge) 전체 고정 (bottom-left & bottom-right)
				anchor1LocalX = initialRect.x + initialRect.width / 2;
				anchor1LocalY = initialRect.y + initialRect.height;
				break;
			case 'bottom': // 위쪽 변(top edge) 전체 고정
				anchor1LocalX = initialRect.x + initialRect.width / 2;
				anchor1LocalY = initialRect.y;
				break;
			case 'left': // 오른쪽 변(right edge) 전체 고정
				anchor1LocalX = initialRect.x + initialRect.width;
				anchor1LocalY = initialRect.y + initialRect.height / 2;
				break;
			case 'right': // 왼쪽 변(left edge) 전체 고정
				anchor1LocalX = initialRect.x;
				anchor1LocalY = initialRect.y + initialRect.height / 2;
				break;
			default:
				return;
		}

		// 3. 로컬 앵커를 전역(Global) 좌표로 변환 (초기 중심 기준 회전)
		//    이 전역 앵커 좌표는 변형 중에도 화면상에서 절대 움직이지 않아야 함!
		let anchorGlobalX: number, anchorGlobalY: number;

		if (useDoubleAnchor) {
			// 두 앵커의 전역 좌표를 각각 구하고, 그 중점을 실질적인 앵커로 사용
			const anchor1Global = rotatePoint(anchor1LocalX, anchor1LocalY, initialCenterX, initialCenterY, initialRect.rotation);
			const anchor2Global = rotatePoint(anchor2LocalX, anchor2LocalY, initialCenterX, initialCenterY, initialRect.rotation);
			anchorGlobalX = (anchor1Global.x + anchor2Global.x) / 2;
			anchorGlobalY = (anchor1Global.y + anchor2Global.y) / 2;
		} else {
			const anchorGlobal = rotatePoint(anchor1LocalX, anchor1LocalY, initialCenterX, initialCenterY, initialRect.rotation);
			anchorGlobalX = anchorGlobal.x;
			anchorGlobalY = anchorGlobal.y;
		}

		// 4. 새로운 중심점(New Center) 계산 (전역 좌표계)
		//    기본적으로 (앵커 + 마우스) / 2 이지만, 변 핸들은 한 축이 고정됨
		let newCenterGlobalX: number, newCenterGlobalY: number;

		if (useDoubleAnchor) {
			// 변 핸들: 고정된 변의 축은 중심도 고정되어야 함 (흔들림 방지)
			const isVerticalEdge = Math.abs(anchor1LocalX - anchor2LocalX) < 0.01;
			if (isVerticalEdge) {
				// 수직 변(좌/우) 핸들: Y축 중심은 고정, X축만 변경
				newCenterGlobalX = (anchorGlobalX + mouseGlobal.x) / 2;
				newCenterGlobalY = anchorGlobalY; 
			} else {
				// 수평 변(상/하) 핸들: X축 중심은 고정, Y축만 변경
				newCenterGlobalX = anchorGlobalX;
				newCenterGlobalY = (anchorGlobalY + mouseGlobal.y) / 2;
			}
		} else {
			// 모서리 핸들: X, Y 모두 변경
			newCenterGlobalX = (anchorGlobalX + mouseGlobal.x) / 2;
			newCenterGlobalY = (anchorGlobalY + mouseGlobal.y) / 2;
		}

		// 5. 로컬 좌표계로 복귀 (역회전)
		//    새로운 중심을 기준으로, 전역 좌표들을 다시 로컬 좌표로 변환 (회전을 풂)
		const newCenterLocalX = newCenterGlobalX;
		const newCenterLocalY = newCenterGlobalY;

		// 앵커와 드래그(마우스) 위치를 새 중심 기준으로 역회전(-rotation)
		const anchorNewLocal = rotatePoint(anchorGlobalX, anchorGlobalY, newCenterLocalX, newCenterLocalY, -initialRect.rotation);
		const dragNewLocal = rotatePoint(mouseGlobal.x, mouseGlobal.y, newCenterLocalX, newCenterLocalY, -initialRect.rotation);

		// 6. 최종 크기 계산 (로컬 좌표계)
		let newWidth: number, newHeight: number;

		if (useDoubleAnchor) {
			// 변 핸들의 경우, 고정된 변의 길이를 정확히 계산하기 위해 두 앵커를 모두 역회전
			const anchor1Global = rotatePoint(anchor1LocalX, anchor1LocalY, initialCenterX, initialCenterY, initialRect.rotation);
			const anchor2Global = rotatePoint(anchor2LocalX, anchor2LocalY, initialCenterX, initialCenterY, initialRect.rotation);
			
			const anchor1NewLocal = rotatePoint(anchor1Global.x, anchor1Global.y, newCenterLocalX, newCenterLocalY, -initialRect.rotation);
			const anchor2NewLocal = rotatePoint(anchor2Global.x, anchor2Global.y, newCenterLocalX, newCenterLocalY, -initialRect.rotation);

			const isVerticalEdge = Math.abs(anchor1NewLocal.x - anchor2NewLocal.x) < 0.01;
			
			if (isVerticalEdge) {
				// 수직 변: 높이는 고정된 변의 길이, 너비는 드래그 거리
				newHeight = Math.abs(anchor2NewLocal.y - anchor1NewLocal.y);
				newWidth = Math.abs(dragNewLocal.x - anchorNewLocal.x);
			} else {
				// 수평 변: 너비는 고정된 변의 길이, 높이는 드래그 거리
				newWidth = Math.abs(anchor2NewLocal.x - anchor1NewLocal.x);
				newHeight = Math.abs(dragNewLocal.y - anchorNewLocal.y);
			}
		} else {
			// 모서리 핸들: 단순히 앵커와 드래그 지점 사이의 거리
			newWidth = Math.abs(dragNewLocal.x - anchorNewLocal.x);
			newHeight = Math.abs(dragNewLocal.y - anchorNewLocal.y);
		}

		// Minimum constraints
		if (newWidth < 20) newWidth = 20;
		if (newHeight < 20) newHeight = 20;

		// Calculate new top-left
		const newX = newCenterLocalX - newWidth / 2;
		const newY = newCenterLocalY - newHeight / 2;

		console.log('New rect:', { x: newX, y: newY, width: newWidth, height: newHeight });

		// Update
		rectX = newX;
		rectY = newY;
		rectWidth = newWidth;
		rectHeight = newHeight;
	};

	const handleMouseUp = () => {
		isDragging = false;
		dragHandle = null;
	};

	// Rotation handle
	const handleRotate = (e: MouseEvent) => {
		e.stopPropagation();
		// 초기 상태 저장
		const initialRotation = rotation;
		
		// Convert mouse position to SVG coordinates
		const startPos = getMousePosition(e, svgElement);
		const startAngle = Math.atan2(startPos.y - centerY, startPos.x - centerX);
		
		const onMove = (moveEvent: MouseEvent) => {
			const currentPos = getMousePosition(moveEvent, svgElement);
			const currentAngle = Math.atan2(currentPos.y - centerY, currentPos.x - centerX);
			
			// 각도 차이 계산 (SVG 좌표계: 시계방향이 양수)
			const deltaAngle = (currentAngle - startAngle) * (180 / Math.PI);
			// 초기 회전값에 델타를 더함
			rotation = initialRotation + deltaAngle;
		};
		
		const onUp = () => {
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
		};
		
		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
	};
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<div class="w-full h-screen bg-gray-100 flex flex-col">
	<div class="p-4 bg-white shadow">
		<h1 class="text-2xl font-bold mb-2">Rectangle Transform Test</h1>
        <div class="flex gap-2">
		    <div class="grid grid-cols-2 gap-4 text-sm">
		    	<div>
		    		<strong>Position:</strong> ({Math.round(rectX)}, {Math.round(rectY)})
		    	</div>
		    	<div>
		    		<strong>Size:</strong> {Math.round(rectWidth)} × {Math.round(rectHeight)}
		    	</div>
		    	<div>
		    		<strong>Rotation:</strong> {Math.round(rotation)}°
		    	</div>
		    	<div>
		    		<strong>Center:</strong> ({Math.round(centerX)}, {Math.round(centerY)})
		    	</div>
		    </div>
            <div class="flex flex-col text-xs ml-4">
                <strong>Handle Positions (Local):</strong>
                {#each handles() as handle}
                    <div>{handle.id}: ({Math.round(handle.x)}, {Math.round(handle.y)})</div>
                {/each}
            </div>
        </div>
		<div class="mt-2">
			<button 
				onclick={() => rotation = 0}
				class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
			>
				Reset Rotation
			</button>
			<button 
				onclick={() => { rectX = 200; rectY = 150; rectWidth = 200; rectHeight = 100; rotation = 0; }}
				class="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
			>
				Reset All
			</button>
		</div>
	</div>

	<div class="flex-1 relative overflow-hidden">
        <!-- svelte-ignore a11y_no_static_element_interactions -->
		<svg 
			bind:this={svgElement}
			class="w-full h-full" 
			viewBox="0 0 800 600"
		>
			<!-- Grid -->
			<defs>
				<pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
					<path d="M 20 0 L 0 0 0 20" fill="none" stroke="#000000" stroke-width="0.5" />
				</pattern>
			</defs>
			<rect x="0" y="0" width="800" height="600" fill="url(#grid)" />

			<!-- Rectangle (rotated) -->
			<g transform="rotate({rotation} {centerX} {centerY})">
				<rect
					x={rectX}
					y={rectY}
					width={rectWidth}
					height={rectHeight}
					fill="#3b82f6"
					fill-opacity="0.5"
					stroke="#1e40af"
					stroke-width="2"
				/>
			</g>

			<!-- Selection box (rotated) -->
			<g transform="rotate({rotation} {centerX} {centerY})">
				<rect
					x={rectX - 4}
					y={rectY - 4}
					width={rectWidth + 8}
					height={rectHeight + 8}
					fill="none"
					stroke="#4f46e5"
					stroke-width="1"
					stroke-dasharray="4 2"
				/>
			</g>

			<!-- Rotation handle -->
			<g transform="rotate({rotation} {centerX} {centerY})">
				<line
					x1={centerX}
					y1={rectY - 2}
					x2={centerX}
					y2={rectY - 32}
					stroke="#4f46e5"
					stroke-width="1"
				/>
				<circle
					cx={centerX}
					cy={rectY - 32}
					r="6"
					fill="white"
					stroke="#4f46e5"
					stroke-width="2"
					class="cursor-pointer"
					onmousedown={handleRotate}
				/>
			</g>

			<!-- Transform handles (NOT rotated, always axis-aligned) -->
			{#each handles() as handle}
                <g transform="rotate({rotation} {centerX} {centerY})">
				<rect
					x={handle.x - 4}
					y={handle.y - 4}
					width="8"
					height="8"
					fill="white"
					stroke="#4f46e5"
					stroke-width="2"
					class="cursor-pointer"
					onmousedown={(e) => handleMouseDown(handle.id, e)}
				/>
                </g>
			{/each}

			<!-- Center point indicator -->
			<circle
				cx={centerX}
				cy={centerY}
				r="3"
				fill="#ef4444"
			/>
		</svg>
	</div>
</div>
