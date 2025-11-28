<script lang="ts">
	import type { Point } from '$lib/types';
	import { getMousePosition } from '$lib/utils/svg';

	// SVG Element reference
	let svgElement: SVGSVGElement;

	// Rectangle state
	let rectX = $state(300);
	let rectY = $state(200);
	let rectWidth = $state(200);
	let rectHeight = $state(100);
	let rotation = $state(0);

	// Padding
	let padding = $state(0);

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
		// Bounding box in local coordinates
		const localX = rectX - padding;
		const localY = rectY - padding;
		const localWidth = rectWidth + padding * 2;
		const localHeight = rectHeight + padding * 2;

		return [
			{ id: 'top-left', x: localX, y: localY, opposite: 'bottom-right'},
			{ id: 'top', x: localX + localWidth / 2, y: localY, opposite: 'bottom' },
			{ id: 'top-right', x: localX + localWidth, y: localY, opposite: 'bottom-left' },
			{ id: 'right', x: localX + localWidth, y: localY + localHeight / 2, opposite: 'left' },
			{ id: 'bottom-right', x: localX + localWidth, y: localY + localHeight, opposite: 'top-left' },
			{ id: 'bottom', x: localX + localWidth / 2, y: localY + localHeight, opposite: 'top' },
			{ id: 'bottom-left', x: localX, y: localY + localHeight, opposite: 'top-right' },
			{ id: 'left', x: localX, y: localY + localHeight / 2, opposite: 'right' }
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
		let anchorLocalX: number;
		let anchorLocalY: number;
		//    (회전하기 전의 순수한 사각형 좌표 기준)
		let oppositeHandle: string = handles().find((h) => h.id === dragHandle)?.opposite ?? '';
		let oppositeHandleX: number = handles().find((h) => h.id === oppositeHandle)?.x ?? 0;
		let oppositeHandleY: number = handles().find((h) => h.id === oppositeHandle)?.y ?? 0;
		const initialCenterX = initialRect.x + initialRect.width / 2;
		const initialCenterY = initialRect.y + initialRect.height / 2;

		// 3. 로컬 앵커를 전역(Global) 좌표로 변환 (초기 중심 기준 회전)
		//    이 전역 앵커 좌표는 변형 중에도 화면상에서 절대 움직이지 않아야 함!
		const anchorGlobal = rotatePoint(oppositeHandleX, oppositeHandleY, initialCenterX, initialCenterY, initialRect.rotation);
		let anchorGlobalX: number = anchorGlobal.x;
		let anchorGlobalY: number = anchorGlobal.y;
		console.log('Anchor Global:', { x: anchorGlobalX, y: anchorGlobalY });
		// 4. 새로운 중심점(New Center) 계산 (전역 좌표계)
		//    기본적으로 (앵커 + 마우스) / 2 이지만, 변 핸들은 한 축이 고정됨
		let newCenterGlobalX: number, newCenterGlobalY: number;
		newCenterGlobalX = (anchorGlobalX + mouseGlobal.x) / 2;
		newCenterGlobalY = (anchorGlobalY + mouseGlobal.y) / 2;

		// 5. Anchor와 마우스 위치사이의 거리 계산
		let distance = Math.sqrt(Math.pow(mouseGlobal.x - anchorGlobalX, 2) + Math.pow(mouseGlobal.y - anchorGlobalY, 2));

		// 1) 대각선 절반 벡터 (중점 -> 한 꼭짓점)
		const halfDx = mouseGlobal.x - newCenterGlobalX;
		const halfDy = mouseGlobal.y - newCenterGlobalY;

		// 2) 이 벡터를 -aDeg 만큼 역회전하면 (w/2, h/2)
		const local = rotatePoint(halfDx, halfDy, 0, 0, -initialRect.rotation);

		// 3) 폭/높이는 절대값 * 2
		let newWidth: number = Math.abs(local.x) * 2;
		let newHeight: number = Math.abs(local.y) * 2;

		// Calculate new top-left
		let newX: number = newCenterGlobalX - newWidth / 2;
		let newY: number = newCenterGlobalY - newHeight / 2;

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
			<div class="flex flex-col text-xs ml-4">
                <strong>Handle Positions (Global):</strong>
                {#each handles() as handle}
					{@const anchorGlobal = rotatePoint(handle.x, handle.y, centerX, centerY, rotation)}
                    <div>{handle.id}: ({Math.round(anchorGlobal.x)}, {Math.round(anchorGlobal.y)})</div>
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
				onclick={() => { rectX = 300; rectY = 200; rectWidth = 200; rectHeight = 100; rotation = 0; }}
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
