<script lang="ts">
	/**
	 * =============================================================================
	 * Rectangle Transform Test
	 * =============================================================================
	 * 
	 * 이 컴포넌트는 SVG 사각형의 크기 조절(resize)과 회전(rotate)을 구현합니다.
	 * 
	 * ## 핵심 개념: 좌표계
	 * 
	 * 1. **로컬 좌표계 (Local Coordinates)**
	 *    - 회전이 적용되기 전의 좌표계
	 *    - rectX, rectY, rectWidth, rectHeight가 이 좌표계에서 정의됨
	 *    - 핸들의 localPoint가 이 좌표계에서 계산됨
	 * 
	 * 2. **글로벌 좌표계 (Global Coordinates)**
	 *    - 회전이 적용된 후의 SVG 좌표계
	 *    - 마우스 위치가 이 좌표계에서 얻어짐
	 *    - 핸들의 globalPoint가 이 좌표계에서 계산됨
	 * 
	 * ## 핵심 개념: 회전 중심 (rotateCenter)
	 * 
	 * SVG의 rotate transform은 회전 중심을 기준으로 동작합니다.
	 * - 드래그 중에는 회전 중심이 고정되어야 도형이 안정적으로 변형됩니다.
	 * - 드래그 종료 시 회전 중심을 새로운 도형 중심으로 이동하되,
	 *   도형의 글로벌 위치가 유지되도록 로컬 좌표를 보정합니다.
	 * 
	 * =============================================================================
	 */

	import type { Point } from '$lib/types';
	import { getMousePosition } from '$lib/utils/svg';

	// ============================================================================
	// 타입 정의
	// ============================================================================

	/**
	 * Handle (변형 핸들) 타입
	 * 
	 * 사각형의 8개 핸들(모서리 4개 + 변 중앙 4개)을 정의합니다.
	 * 
	 * @property id - 핸들 식별자 (예: 'top-left', 'right', 'bottom')
	 * @property localPoint - 로컬 좌표계에서의 핸들 위치
	 * @property globalPoint - 글로벌 좌표계에서의 핸들 위치 (회전 적용 후)
	 * @property widthId - 너비 계산 시 기준이 되는 반대쪽 핸들 ID (예: left→right)
	 * @property heightId - 높이 계산 시 기준이 되는 반대쪽 핸들 ID (예: top→bottom)
	 */
	interface Handle {
		id: string;
		localPoint: Point;
		globalPoint: Point;
		widthId: string | null;
		heightId: string | null;
	}

	// ============================================================================
	// 상태 변수 (State)
	// ============================================================================

	/** SVG 엘리먼트 참조 - 마우스 좌표 변환에 사용 */
	let svgElement: SVGSVGElement;

	// --- 사각형 기하학적 속성 (로컬 좌표계) ---
	/** 사각형 좌상단 X 좌표 */
	let rectX = $state(300);
	/** 사각형 좌상단 Y 좌표 */
	let rectY = $state(200);
	/** 사각형 너비 */
	let rectWidth = $state(200);
	/** 사각형 높이 */
	let rectHeight = $state(100);
	/** 회전 각도 (도 단위, 시계방향이 양수) */
	let rotation = $state(0);

	// --- 회전 중심 (글로벌 좌표계) ---
	/**
	 * 회전 중심 X 좌표
	 * 
	 * 드래그 시작 시 현재 도형 중심으로 고정되고,
	 * 드래그 종료 시 새로운 도형 중심으로 업데이트됩니다.
	 */
	let rotateCenterX = $state(300 + 200 / 2);
	/** 회전 중심 Y 좌표 */
	let rotateCenterY = $state(200 + 100 / 2);

	// --- 드래그 상태 ---
	/** 현재 드래그 중인지 여부 */
	let isDragging = $state(false);
	/** 현재 드래그 중인 핸들 ID (null이면 드래그 중 아님) */
	let dragHandle = $state<string | null>(null);

	// ============================================================================
	// 상수
	// ============================================================================

	/** 사각형 최소 크기 (픽셀) - 너비/높이가 이 값 아래로 줄어들지 않음 */
	const MIN_SIZE = 1;

	// ============================================================================
	// 유틸리티 함수
	// ============================================================================

	/**
	 * 모든 상태를 초기값으로 리셋합니다.
	 */
	const reset = () => {
		rectX = 300;
		rectY = 200;
		rectWidth = 200;
		rectHeight = 100;
		rotation = 0;
		rotateCenterX = 300 + 200 / 2;
		rotateCenterY = 200 + 100 / 2;
		isDragging = false;
		dragHandle = null;
	};

	/**
	 * 점을 특정 중심을 기준으로 회전시킵니다.
	 * 
	 * 2D 회전 변환 공식:
	 * x' = cx + (x - cx) * cos(θ) - (y - cy) * sin(θ)
	 * y' = cy + (x - cx) * sin(θ) + (y - cy) * cos(θ)
	 * 
	 * @param p - 회전할 점
	 * @param center - 회전 중심
	 * @param angleDeg - 회전 각도 (도 단위, 시계방향이 양수)
	 * @returns 회전된 점의 좌표
	 * 
	 * @example
	 * // 점 (100, 50)을 중심 (50, 50) 기준으로 90도 회전
	 * rotatePoint({ x: 100, y: 50 }, { x: 50, y: 50 }, 90)
	 * // 결과: { x: 50, y: 100 }
	 */
	const rotatePoint = (p: Point, center: Point, angleDeg: number): Point => {
		const angleRad = angleDeg * (Math.PI / 180);
		const cos = Math.cos(angleRad);
		const sin = Math.sin(angleRad);
		// 중심 기준 상대 좌표
		const relX = p.x - center.x;
		const relY = p.y - center.y;
		// 회전 변환 적용
		return {
			x: center.x + relX * cos - relY * sin,
			y: center.y + relX * sin + relY * cos
		};
	};

	// ============================================================================
	// 파생 상태 (Derived State)
	// ============================================================================

	/**
	 * 8개의 변형 핸들을 계산합니다.
	 * 
	 * 핸들 배치:
	 * ```
	 * top-left -------- top -------- top-right
	 *     |                              |
	 *    left                          right
	 *     |                              |
	 * bottom-left --- bottom --- bottom-right
	 * ```
	 * 
	 * 각 핸들은 다음 정보를 포함합니다:
	 * - localPoint: 로컬 좌표 (회전 전)
	 * - globalPoint: 글로벌 좌표 (회전 후)
	 * - widthId: 너비 계산 시 기준 핸들 (수평 반대쪽)
	 * - heightId: 높이 계산 시 기준 핸들 (수직 반대쪽)
	 */
	const handles = $derived.by((): Handle[] => {
		// 로컬 좌표계에서의 바운딩 박스
		const localX = rectX
		const localY = rectY
		const localWidth = rectWidth;
		const localHeight = rectHeight;
		const rotateCenter: Point = { x: rotateCenterX, y: rotateCenterY };

		// 기본 핸들 정의 (globalPoint 제외)
		// widthId: 이 핸들을 드래그할 때 너비의 반대쪽 기준점
		// heightId: 이 핸들을 드래그할 때 높이의 반대쪽 기준점
		const baseHandles: Omit<Handle, 'globalPoint'>[] = [
			{ id: 'top-left',     localPoint: { x: localX, y: localY },                                widthId: 'top-right',    heightId: 'bottom-left' },
			{ id: 'top',          localPoint: { x: localX + localWidth / 2, y: localY },               widthId: null,           heightId: 'bottom' },
			{ id: 'top-right',    localPoint: { x: localX + localWidth, y: localY },                   widthId: 'top-left',     heightId: 'bottom-right' },
			{ id: 'right',        localPoint: { x: localX + localWidth, y: localY + localHeight / 2 }, widthId: 'left',         heightId: null },
			{ id: 'bottom-right', localPoint: { x: localX + localWidth, y: localY + localHeight },     widthId: 'bottom-left',  heightId: 'top-right' },
			{ id: 'bottom',       localPoint: { x: localX + localWidth / 2, y: localY + localHeight }, widthId: null,           heightId: 'top' },
			{ id: 'bottom-left',  localPoint: { x: localX, y: localY + localHeight },                  widthId: 'bottom-right', heightId: 'top-left' },
			{ id: 'left',         localPoint: { x: localX, y: localY + localHeight / 2 },              widthId: 'right',        heightId: null }
		];

		// 각 핸들에 globalPoint 추가 (로컬 좌표를 회전하여 글로벌 좌표 계산)
		return baseHandles.map((h) => ({
			...h,
			globalPoint: rotatePoint(h.localPoint, rotateCenter, rotation)
		}));
	});

	/**
	 * 도형의 글로벌 중심 X 좌표
	 * 
	 * 모든 핸들의 globalPoint.x 평균으로 계산됩니다.
	 * 이 값은 회전된 상태에서의 실제 중심 위치를 나타냅니다.
	 */
	const centerX = $derived.by(() => {
		return handles.reduce((sum, h) => sum + h.globalPoint.x, 0) / handles.length;
	});

	/**
	 * 도형의 글로벌 중심 Y 좌표
	 */
	const centerY = $derived.by(() => {
		return handles.reduce((sum, h) => sum + h.globalPoint.y, 0) / handles.length;
	});

	// ============================================================================
	// 이벤트 핸들러
	// ============================================================================

	/**
	 * 핸들 마우스 다운 이벤트 핸들러
	 * 
	 * 드래그를 시작하고, 현재 도형 중심을 회전 중심으로 고정합니다.
	 * 회전 중심을 고정하는 이유:
	 * - 드래그 중에 회전 중심이 변하면 도형이 불안정하게 움직입니다.
	 * - 드래그 종료 시 새로운 중심으로 업데이트하면서 좌표를 보정합니다.
	 * 
	 * @param handleId - 클릭된 핸들의 ID
	 * @param e - 마우스 이벤트
	 */
	const handleMouseDown = (handleId: string, e: MouseEvent) => {
		e.stopPropagation();
		isDragging = true;
		dragHandle = handleId;
		// 드래그 시작 시 현재 글로벌 중심을 회전 중심으로 고정
		rotateCenterX = centerX;
		rotateCenterY = centerY;
	};

	/**
	 * 마우스 이동 이벤트 핸들러 (크기 조절 로직의 핵심)
	 * 
	 * ## 처리 흐름:
	 * 
	 * 1. **좌표 변환**: 마우스의 글로벌 좌표를 로컬 좌표로 변환
	 *    - 글로벌 좌표: SVG 상의 실제 마우스 위치
	 *    - 로컬 좌표: 회전을 역으로 적용한 좌표 (도형과 같은 좌표계)
	 * 
	 * 2. **크기 계산**: 드래그 중인 핸들에 따라 너비/높이 계산
	 *    - widthId가 있으면: 마우스 X와 반대쪽 핸들 X의 차이 = 너비
	 *    - heightId가 있으면: 마우스 Y와 반대쪽 핸들 Y의 차이 = 높이
	 * 
	 * 3. **위치 계산**: left/top 핸들의 경우 시작점(rectX/rectY)도 조정
	 *    - left 핸들: rectX가 마우스 위치로 이동
	 *    - top 핸들: rectY가 마우스 위치로 이동
	 * 
	 * 4. **제한 적용**: 최소 크기 이하로 줄어들지 않도록 제한
	 */
	const handleMouseMove = (e: MouseEvent) => {
		if (!isDragging || !dragHandle) return;

		// 변경될 값들을 현재 값으로 초기화
		let newX: number = rectX;
		let newY: number = rectY;
		let newWidth: number = rectWidth;
		let newHeight: number = rectHeight;

		// ========================================
		// Step 1: 마우스 좌표를 로컬 좌표계로 변환
		// ========================================
		// 마우스의 글로벌 좌표 (SVG 좌표계)
		const mouseGlobalPos: Point = getMousePosition(e, svgElement);
		const rotateCenter: Point = { x: rotateCenterX, y: rotateCenterY };
		// 글로벌 좌표를 로컬 좌표로 변환 (회전의 역변환 = -rotation)
		// 이렇게 하면 마우스 위치가 도형과 같은 좌표계에서 표현됨
		const mouseLocalPos: Point = rotatePoint(mouseGlobalPos, rotateCenter, -rotation);

		// ========================================
		// Step 2: 현재 드래그 중인 핸들 정보 가져오기
		// ========================================
		const currentHandle = handles.find((h) => h.id === dragHandle);
		if (!currentHandle) return;

		// ========================================
		// Step 3: 너비(Width) 계산
		// ========================================
		// widthId가 있으면 이 핸들은 너비에 영향을 줌
		if (currentHandle.widthId) {
			// widthId는 수평 방향의 반대쪽 핸들을 가리킴
			// 예: left 핸들의 widthId는 'right', top-left의 widthId는 'top-right'
			const widthHandleObj = handles.find((h) => h.id === currentHandle.widthId);
			if (widthHandleObj) {
				if (dragHandle.includes('left')) {
					// LEFT 계열 핸들: 왼쪽 경계를 이동
					// - 마우스 X가 rectX가 됨
					// - 너비 = 오른쪽 경계 - 새 왼쪽 경계
					// - 오른쪽 경계를 넘어가지 않도록 제한
					const maxX = widthHandleObj.localPoint.x - MIN_SIZE;
					newX = Math.min(mouseLocalPos.x, maxX);
					newWidth = widthHandleObj.localPoint.x - newX;
				} else {
					// RIGHT 계열 핸들: 오른쪽 경계를 이동
					// - rectX는 그대로
					// - 너비 = 마우스 X - 왼쪽 경계
					// - 최소 크기 이하로 줄어들지 않도록 제한
					newWidth = Math.max(mouseLocalPos.x - widthHandleObj.localPoint.x, MIN_SIZE);
				}
			}
		}

		// ========================================
		// Step 4: 높이(Height) 계산
		// ========================================
		// heightId가 있으면 이 핸들은 높이에 영향을 줌
		if (currentHandle.heightId) {
			// heightId는 수직 방향의 반대쪽 핸들을 가리킴
			// 예: top 핸들의 heightId는 'bottom', top-left의 heightId는 'bottom-left'
			const heightHandleObj = handles.find((h) => h.id === currentHandle.heightId);
			if (heightHandleObj) {
				if (dragHandle.includes('top')) {
					// TOP 계열 핸들: 위쪽 경계를 이동
					// - 마우스 Y가 rectY가 됨
					// - 높이 = 아래쪽 경계 - 새 위쪽 경계
					// - 아래쪽 경계를 넘어가지 않도록 제한
					const maxY = heightHandleObj.localPoint.y - MIN_SIZE;
					newY = Math.min(mouseLocalPos.y, maxY);
					newHeight = heightHandleObj.localPoint.y - newY;
				} else {
					// BOTTOM 계열 핸들: 아래쪽 경계를 이동
					// - rectY는 그대로
					// - 높이 = 마우스 Y - 위쪽 경계
					// - 최소 크기 이하로 줄어들지 않도록 제한
					newHeight = Math.max(mouseLocalPos.y - heightHandleObj.localPoint.y, MIN_SIZE);
				}
			}
		}
		
		// ========================================
		// Step 5: 상태 업데이트
		// ========================================
		rectX = newX;
		rectY = newY;
		rectWidth = newWidth;
		rectHeight = newHeight;
	};

	/**
	 * 마우스 업 이벤트 핸들러
	 * 
	 * 드래그 종료 시 회전 중심을 새로운 도형 중심으로 업데이트합니다.
	 * 
	 * ## 핵심 문제: 회전 중심 변경 시 도형 점프
	 * 
	 * 회전 중심이 변경되면 같은 로컬 좌표라도 다른 글로벌 위치에 그려집니다.
	 * 이를 방지하기 위해 다음 보정 로직을 적용합니다:
	 * 
	 * 1. 현재 top-left의 글로벌 위치 계산 (이전 회전 중심 기준)
	 * 2. 새 회전 중심 계산 (로컬 중심을 글로벌로 변환)
	 * 3. 새 회전 중심에서 같은 글로벌 위치가 되는 로컬 좌표 역산
	 * 4. rectX, rectY를 보정된 값으로 업데이트
	 * 
	 * 이렇게 하면 화면상 도형 위치는 변하지 않으면서 회전 중심만 이동합니다.
	 */
	const handleMouseUp = () => {
		isDragging = false;
		dragHandle = null;

		// ========================================
		// 회전 중심 변경 시 좌표 보정
		// ========================================

		// 1. 이전 회전 중심 저장
		const oldCenter: Point = { x: rotateCenterX, y: rotateCenterY };
    
    	// 2. 새 회전 중심 계산
		//    - 로컬 좌표계에서의 도형 중심
		//    - 이를 글로벌 좌표로 변환 (이전 회전 중심 기준)
    	const localCenter: Point = { x: rectX + rectWidth / 2, y: rectY + rectHeight / 2 };
    	const newCenter: Point = rotatePoint(localCenter, oldCenter, rotation);
		
    	// 3. top-left의 현재 글로벌 위치 계산
		//    - 이 위치가 보정 후에도 유지되어야 함
    	const topLeftGlobal: Point = rotatePoint({ x: rectX, y: rectY }, oldCenter, rotation);
		
    	// 4. 새 회전 중심에서 같은 글로벌 위치가 되는 로컬 좌표 계산
		//    - 역회전(-rotation)을 적용하여 로컬 좌표 역산
    	const newTopLeftLocal: Point = rotatePoint(topLeftGlobal, newCenter, -rotation);
		
    	// 5. 보정된 값으로 업데이트
		//    - 화면상 도형 위치는 동일하게 유지됨
    	rectX = newTopLeftLocal.x;
    	rectY = newTopLeftLocal.y;
    	rotateCenterX = newCenter.x;
    	rotateCenterY = newCenter.y;
	};

	/**
	 * 회전 핸들 마우스 다운 이벤트 핸들러
	 * 
	 * 회전 조작을 위한 드래그를 시작합니다.
	 * 
	 * ## 회전 계산 방식:
	 * 
	 * 1. 드래그 시작 시 마우스와 도형 중심 사이의 각도 저장
	 * 2. 드래그 중 현재 마우스와 중심 사이의 각도 계산
	 * 3. 각도 차이(delta)를 초기 회전값에 더함
	 * 
	 * Math.atan2(y, x)는 x축 기준 각도를 라디안으로 반환합니다.
	 * SVG 좌표계에서 Y축이 아래로 향하므로 시계방향이 양수가 됩니다.
	 */
	const handleRotate = (e: MouseEvent) => {
		e.stopPropagation();
		
		// 드래그 시작 시점의 회전값 저장
		const initialRotation = rotation;
		
		// 드래그 시작 시점의 마우스-중심 각도 계산
		const startPos = getMousePosition(e, svgElement);
		const startAngle = Math.atan2(startPos.y - centerY, startPos.x - centerX);
		
		/**
		 * 마우스 이동 중 회전값 업데이트
		 */
		const onMove = (moveEvent: MouseEvent) => {
			const currentPos = getMousePosition(moveEvent, svgElement);
			// 현재 마우스-중심 각도 계산
			const currentAngle = Math.atan2(currentPos.y - centerY, currentPos.x - centerX);
			
			// 각도 차이 계산 (라디안 → 도 변환)
			const deltaAngle = (currentAngle - startAngle) * (180 / Math.PI);
			
			// 초기 회전값에 델타를 더해 새 회전값 설정
			rotation = initialRotation + deltaAngle;
		};
		
		/**
		 * 마우스 업 시 이벤트 리스너 정리
		 */
		const onUp = () => {
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
		};
		
		// 전역 이벤트 리스너 등록 (SVG 밖에서도 드래그 가능하도록)
		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
	};
</script>

<!-- 
	============================================================================
	전역 이벤트 바인딩
	============================================================================
	
	window에 이벤트를 바인딩하여 SVG 영역 밖에서도 드래그가 작동하도록 합니다.
-->
<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<div class="w-full h-screen bg-gray-100 flex flex-col">
	<!-- ========================================================================
		디버그 정보 패널
		======================================================================== -->
	<div class="p-4 bg-white shadow">
		<h1 class="text-2xl font-bold mb-2">Rectangle Transform Test</h1>
        <div class="flex gap-2">
			<!-- 기본 속성 표시 -->
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
			<!-- 핸들 로컬 좌표 표시 -->
            <div class="flex flex-col text-xs ml-4">
                <strong>Handle Positions (Local):</strong>
                {#each handles as handle}
                    <div>{handle.id}: ({Math.round(handle.localPoint.x)}, {Math.round(handle.localPoint.y)})</div>
                {/each}
            </div>
			<!-- 핸들 글로벌 좌표 표시 -->
			<div class="flex flex-col text-xs ml-4">
                <strong>Handle Positions (Global):</strong>
                {#each handles as handle}
                    <div>{handle.id}: ({Math.round(handle.globalPoint.x)}, {Math.round(handle.globalPoint.y)})</div>
                {/each}
            </div>
        </div>
		<!-- 리셋 버튼들 -->
		<div class="mt-2">
			<button 
				onclick={() => rotation = 0}
				class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
			>
				Reset Rotation
			</button>
			<button 
				onclick={reset}
				class="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
			>
				Reset All
			</button>
		</div>
	</div>

	<!-- ========================================================================
		SVG 캔버스 영역
		======================================================================== -->
	<div class="flex-1 relative overflow-hidden">
        <!-- svelte-ignore a11y_no_static_element_interactions -->
		<svg 
			bind:this={svgElement}
			class="w-full h-full" 
			viewBox="0 0 800 600"
		>
			<!-- ================================================================
				배경 그리드 패턴
				================================================================ -->
			<defs>
				<pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
					<path d="M 20 0 L 0 0 0 20" fill="none" stroke="#000000" stroke-width="0.5" />
				</pattern>
			</defs>
			<rect x="0" y="0" width="800" height="600" fill="url(#grid)" />

			<!-- ================================================================
				메인 사각형
				================================================================
				
				로컬 좌표(rectX, rectY, rectWidth, rectHeight)로 정의된 사각형을
				rotateCenterX/Y를 중심으로 rotation만큼 회전하여 렌더링합니다.
			-->
			<g transform="rotate({rotation} {rotateCenterX} {rotateCenterY})">
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

			<!-- ================================================================
				선택 박스 (점선)
				================================================================
				
				사각형 주변에 4px 여백을 둔 점선 박스입니다.
				사각형과 동일한 회전이 적용됩니다.
			-->
			<g transform="rotate({rotation} {rotateCenterX} {rotateCenterY})">
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

			<!-- ================================================================
				회전 핸들
				================================================================
				
				사각형 상단 중앙에서 위로 뻗은 선과 원형 핸들입니다.
				이 핸들을 드래그하여 사각형을 회전시킬 수 있습니다.
				
				위치 계산:
				- X: rectX + rectWidth / 2 (로컬 좌표의 수평 중앙)
				- Y: rectY - 32 (사각형 상단에서 32px 위)
				
				로컬 좌표로 지정하고 transform으로 회전을 적용합니다.
			-->
			<g transform="rotate({rotation} {rotateCenterX} {rotateCenterY})">
				<!-- 사각형과 회전 핸들을 연결하는 선 -->
				<line
					x1={rectX + rectWidth / 2}
					y1={rectY - 2}
					x2={rectX + rectWidth / 2}
					y2={rectY - 32}
					stroke="#4f46e5"
					stroke-width="1"
				/>
				<!-- 회전 핸들 (원형) -->
				<circle
					cx={rectX + rectWidth / 2}
					cy={rectY - 32}
					r="6"
					fill="white"
					stroke="#4f46e5"
					stroke-width="2"
					class="cursor-pointer"
					onmousedown={handleRotate}
				/>
			</g>

			<!-- ================================================================
				크기 조절 핸들 (8개)
				================================================================
				
				사각형의 모서리와 변 중앙에 위치한 8개의 핸들입니다.
				각 핸들을 드래그하여 사각형 크기를 조절할 수 있습니다.
				
				핸들 위치는 로컬 좌표(localPoint)로 지정되며,
				사각형과 동일한 회전 transform이 적용됩니다.
			-->
			{#each handles as handle}
                <g transform="rotate({rotation} {rotateCenterX} {rotateCenterY})">
				<rect
					x={handle.localPoint.x - 4}
					y={handle.localPoint.y - 4}
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

			<!-- ================================================================
				중심점 표시 (디버그용)
				================================================================ -->
			
			<!-- 글로벌 중심 (빨간 점) - centerX/Y (handles의 globalPoint 평균) -->
			<circle
				cx={centerX}
				cy={centerY}
				r="3"
				fill="#ef4444"
			/>

			<!-- 회전 중심 (파란 원) - rotateCenterX/Y -->
			<circle
				cx={rotateCenterX}
				cy={rotateCenterY}
				r="6"
				fill="none"
				stroke="#4f46e5"
				stroke-width="2"
			/>
		</svg>
	</div>
</div>
