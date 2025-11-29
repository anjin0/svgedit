<script lang="ts">
	import { canvasStore } from '$lib/stores/canvas.svelte';
	import { editorStore } from '$lib/stores/editor.svelte';
	import { selectionStore } from '$lib/stores/selection.svelte';
	import { drawingStore } from '$lib/stores/drawing.svelte';
	import { transformStore } from '$lib/stores/transform.svelte';
	import { getMousePosition, createRectangle, createCircle, createEllipse, createLine, createText } from '$lib/utils/svg';
	import Rectangle from './elements/Rectangle.svelte';
	import Circle from './elements/Circle.svelte';
	import Ellipse from './elements/Ellipse.svelte';
	import Line from './elements/Line.svelte';
	import Text from './elements/Text.svelte';
	import TransformControls from './TransformControls.svelte';
	import type { Point } from '$lib/types';

	let svgElement = $state<SVGSVGElement>();
	let isPanning = $state(false);
	let lastPanPoint = $state({ x: 0, y: 0 });
	let isMoving = $state(false);
	let moveStartPoint = $state<Point | null>(null);
	let editingTextId = $state<string | null>(null);

	const handleMouseDown = (e: MouseEvent) => {
		if (!svgElement) return;

		const currentTool = editorStore.currentTool;

		// Pan tool or middle mouse button
		if (currentTool === 'pan' || e.button === 1) {
			isPanning = true;
			lastPanPoint = { x: e.clientX, y: e.clientY };
			e.preventDefault();
			return;
		}

		// Select tool - clicking on empty space deselects
		if (currentTool === 'select') {
			selectionStore.clearSelection();
			editingTextId = null; // 텍스트 편집 모드 종료
			return;
		}

		// Drawing tools
		if (['rectangle', 'circle', 'ellipse', 'line', 'text'].includes(currentTool)) {
			const point = getMousePosition(e, svgElement);
			drawingStore.startDrawing(point);
		}
	};

	const handleMouseMove = (e: MouseEvent) => {
		if (!svgElement) return;

		// Handle panning
		if (isPanning) {
			const deltaX = e.clientX - lastPanPoint.x;
			const deltaY = e.clientY - lastPanPoint.y;
			canvasStore.pan(deltaX, deltaY);
			lastPanPoint = { x: e.clientX, y: e.clientY };
			return;
		}

		// Handle element moving
		if (isMoving && moveStartPoint && selectionStore.selectedIds.length > 0) {
			const currentPoint = getMousePosition(e, svgElement);
			const deltaX = currentPoint.x - moveStartPoint.x;
			const deltaY = currentPoint.y - moveStartPoint.y;

			selectionStore.selectedIds.forEach((id) => {
				const element = editorStore.getElementById(id);
				if (element) {
					editorStore.updateElement(id, {
						transform: {
							...element.transform,
							x: element.transform.x + deltaX,
							y: element.transform.y + deltaY
						}
					});
				}
			});

			moveStartPoint = currentPoint;
			return;
		}

		// Handle drawing
		if (drawingStore.isDrawing) {
			const point = getMousePosition(e, svgElement);
			drawingStore.updateDrawing(point);
			updatePreview();
		}
	};

	const handleMouseUp = () => {
		isPanning = false;
		isMoving = false;
		moveStartPoint = null;

		if (drawingStore.isDrawing) {
			const result = drawingStore.endDrawing();
			if (result && result.start && result.end) {
				createElementFromDrawing(result.start, result.end);
			}
		}
	};

	const handleWheel = (e: WheelEvent) => {
		e.preventDefault();
		if (e.deltaY < 0) {
			canvasStore.zoomIn();
		} else {
			canvasStore.zoomOut();
		}
	};

	const updatePreview = () => {
		if (!drawingStore.startPoint || !drawingStore.currentPoint) return;

		const currentTool = editorStore.currentTool;
		const { startPoint, currentPoint } = drawingStore;

		switch (currentTool) {
			case 'rectangle':
				drawingStore.setPreviewElement(createRectangle(startPoint, currentPoint));
				break;
			case 'circle':
				drawingStore.setPreviewElement(createCircle(startPoint, currentPoint));
				break;
			case 'ellipse':
				drawingStore.setPreviewElement(createEllipse(startPoint, currentPoint));
				break;
			case 'line':
				drawingStore.setPreviewElement(createLine(startPoint, currentPoint));
				break;
			case 'text':
				drawingStore.setPreviewElement(createText(startPoint, currentPoint));
				break;
		}
	};

	const createElementFromDrawing = (start: Point, end: Point) => {
		const currentTool = editorStore.currentTool;
		let element;

		switch (currentTool) {
			case 'rectangle':
				element = createRectangle(start, end);
				break;
			case 'circle':
				element = createCircle(start, end);
				break;
			case 'ellipse':
				element = createEllipse(start, end);
				break;
			case 'line':
				element = createLine(start, end);
				break;
			case 'text':
				element = createText(start, end);
				break;
		}

		if (element) {
			editorStore.addElement(element);
			// 텍스트인 경우 생성 후 바로 편집 모드 진입
			if (element.type === 'text') {
				const textId = element.id;
				editorStore.setTool('select');
				// 다음 틱에서 선택 및 편집 모드 진입 (렌더링 완료 후)
				setTimeout(() => {
					selectionStore.select(textId, false);
					editingTextId = textId;
				}, 0);
			}
		}
	};

	const handleElementSelect = (id: string, e?: MouseEvent) => {
		if (editorStore.currentTool === 'select') {
			const element = editorStore.getElementById(id);
			
			// 편집 중인 텍스트를 다시 클릭하면 무시 (텍스트 선택 유지)
			if (editingTextId === id) return;
			
			// 다른 요소 선택 시 텍스트 편집 모드 종료
			if (editingTextId && editingTextId !== id) {
				editingTextId = null;
			}
			
			// 이미 선택된 텍스트를 클릭하면 → 편집 모드 진입
			if (element?.type === 'text' && selectionStore.isSelected(id)) {
				editingTextId = id;
				return; // 이동 시작 안 함
			}
			
			const multiSelect = e ? (e.ctrlKey || e.metaKey) : false;
			selectionStore.select(id, multiSelect);
			
			// 편집 중이 아닐 때만 이동 가능
			if (e && svgElement && !multiSelect && !editingTextId) {
				isMoving = true;
				moveStartPoint = getMousePosition(e, svgElement);
			}
		}
	};

	const handleStartTextEdit = (id: string) => {
		editingTextId = id;
	};

	const handleEndTextEdit = () => {
		editingTextId = null;
		// 선택은 유지됨
	};

	const renderGrid = (): string => {
		const { gridSize } = canvasStore;
		return `M ${gridSize} 0 L 0 0 0 ${gridSize}`;
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		// ESC: 편집 중이면 편집만 종료 (선택 유지)
		if (e.key === 'Escape' && editingTextId) {
			editingTextId = null;
			return;
		}
		
		// 텍스트 편집 중일 때는 Delete/Backspace 가로채지 않음
		if (editingTextId) return;

		if (e.key === 'Delete' || e.key === 'Backspace') {
			selectionStore.selectedIds.forEach((id) => {
				editorStore.removeElement(id);
			});
			selectionStore.clearSelection();
		}
	};
</script>

<svelte:window onmouseup={handleMouseUp} onmousemove={handleMouseMove} onkeydown={handleKeyDown} />

<div class="relative flex-1 bg-gray-50 overflow-hidden">
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<svg
		bind:this={svgElement}
		class="w-full h-full bg-white {isPanning ? 'cursor-grabbing' : editorStore.currentTool === 'select' ? 'cursor-default' : 'cursor-crosshair'}"
		viewBox="{canvasStore.viewBox.x} {canvasStore.viewBox.y} {canvasStore.viewBox.width} {canvasStore.viewBox.height}"
		onmousedown={handleMouseDown}
		onwheel={handleWheel}
		role="application"
		aria-label="SVG Canvas"
	>
		<defs>
			<pattern id="grid" width={canvasStore.gridSize} height={canvasStore.gridSize} patternUnits="userSpaceOnUse">
				<path d={renderGrid()} fill="none" stroke="#e5e5e5" stroke-width="0.5" />
			</pattern>
		</defs>

		{#if canvasStore.gridVisible}
			<rect
				x={canvasStore.viewBox.x}
				y={canvasStore.viewBox.y}
				width={canvasStore.viewBox.width}
				height={canvasStore.viewBox.height}
				fill="url(#grid)"
			/>
		{/if}

		<!-- Render all elements -->
		{#each editorStore.elements as element (element.id)}
			{#if element.type === 'rectangle'}
				<Rectangle
					{element}
					isSelected={selectionStore.isSelected(element.id)}
					onSelect={handleElementSelect}
					rotateCenterX={selectionStore.isSelected(element.id) ? transformStore.rotateCenterX : null}
					rotateCenterY={selectionStore.isSelected(element.id) ? transformStore.rotateCenterY : null}
				/>
			{:else if element.type === 'circle'}
				<Circle
					{element}
					isSelected={selectionStore.isSelected(element.id)}
					onSelect={handleElementSelect}
				/>
			{:else if element.type === 'ellipse'}
				<Ellipse
					{element}
					isSelected={selectionStore.isSelected(element.id)}
					onSelect={handleElementSelect}
					rotateCenterX={selectionStore.isSelected(element.id) ? transformStore.rotateCenterX : null}
					rotateCenterY={selectionStore.isSelected(element.id) ? transformStore.rotateCenterY : null}
				/>
			{:else if element.type === 'line'}
				<Line
					{element}
					isSelected={selectionStore.isSelected(element.id)}
					onSelect={handleElementSelect}
				/>
			{:else if element.type === 'text'}
				<Text
					{element}
					isSelected={selectionStore.isSelected(element.id)}
					isEditing={editingTextId === element.id}
					onSelect={handleElementSelect}
					onStartEdit={handleStartTextEdit}
					onEndEdit={handleEndTextEdit}
					rotateCenterX={selectionStore.isSelected(element.id) ? transformStore.rotateCenterX : null}
					rotateCenterY={selectionStore.isSelected(element.id) ? transformStore.rotateCenterY : null}
				/>
			{/if}
		{/each}

		<!-- Transform controls for selected elements -->
		{#each selectionStore.selectedIds as selectedId}
			{@const selectedElement = editorStore.getElementById(selectedId)}
			{#if selectedElement && svgElement}
				<TransformControls element={selectedElement} {svgElement} onStartTextEdit={handleStartTextEdit} onEndTextEdit={handleEndTextEdit} isTextEditing={editingTextId === selectedElement.id} />
			{/if}
		{/each}

		<!-- Preview element while drawing -->
		{#if drawingStore.previewElement}
			{@const preview = drawingStore.previewElement}
			{#if preview.type === 'rectangle'}
				<Rectangle element={preview} isSelected={false} />
			{:else if preview.type === 'circle'}
				<Circle element={preview} isSelected={false} />
			{:else if preview.type === 'ellipse'}
				<Ellipse element={preview} isSelected={false} />
			{:else if preview.type === 'line'}
				<Line element={preview} isSelected={false} />
			{:else if preview.type === 'text'}
				<!-- Text 프리뷰는 단순 점선 사각형으로 표시 -->
				<rect
					x={preview.transform.x}
					y={preview.transform.y}
					width={preview.width}
					height={preview.height}
					fill="rgba(79, 70, 229, 0.1)"
					stroke="#4f46e5"
					stroke-width="1"
					stroke-dasharray="4 2"
				/>
			{/if}
		{/if}
	</svg>

	<div class="absolute bottom-4 right-4 flex items-center gap-2 px-2 py-2 bg-white rounded-lg shadow-md">
		<div class="text-xs font-medium text-gray-600 min-w-[40px] text-center">
			{Math.round(canvasStore.zoom * 100)}%
		</div>
		<button
			onclick={() => canvasStore.zoomIn()}
			class="w-7 h-7 border-none rounded bg-gray-100 hover:bg-gray-200 cursor-pointer text-sm font-medium transition-colors"
		>
			+
		</button>
		<button
			onclick={() => canvasStore.zoomOut()}
			class="w-7 h-7 border-none rounded bg-gray-100 hover:bg-gray-200 cursor-pointer text-sm font-medium transition-colors"
		>
			-
		</button>
		<button
			onclick={() => canvasStore.resetZoom()}
			class="w-7 h-7 border-none rounded bg-gray-100 hover:bg-gray-200 cursor-pointer text-sm font-medium transition-colors"
		>
			100%
		</button>
	</div>
</div>