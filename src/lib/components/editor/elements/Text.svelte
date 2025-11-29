<script lang="ts">
	import type { TextElement } from '$lib/types';
	import { editorStore } from '$lib/stores/editor.svelte';

	interface Props {
		element: TextElement;
		isSelected?: boolean;
		isEditing?: boolean;
		onSelect?: (id: string, e?: MouseEvent) => void;
		onStartEdit?: (id: string) => void;
		onEndEdit?: () => void;
		// 외부에서 전달되는 회전 중심 (TransformControls와 동기화용)
		rotateCenterX?: number | null;
		rotateCenterY?: number | null;
	}

	let { 
		element, 
		isSelected = false, 
		isEditing = false,
		onSelect, 
		onStartEdit,
		onEndEdit,
		rotateCenterX = null, 
		rotateCenterY = null 
	}: Props = $props();

	let textareaRef = $state<HTMLTextAreaElement | null>(null);
	let localContent = $state(element.content);

	// 회전 중심: 외부에서 전달되면 사용, 아니면 현재 로컬 중심 사용
	const effectiveRotateCenterX = $derived(rotateCenterX ?? (element.transform.x + element.width / 2));
	const effectiveRotateCenterY = $derived(rotateCenterY ?? (element.transform.y + element.height / 2));

	const handleMouseDown = (e: MouseEvent) => {
		e.stopPropagation();
		onSelect?.(element.id, e);
	};

	const handleDoubleClick = (e: MouseEvent) => {
		e.stopPropagation();
		onStartEdit?.(element.id);
	};

	const handleInput = (e: Event) => {
		const target = e.target as HTMLTextAreaElement;
		localContent = target.value;
		editorStore.updateElement(element.id, { content: target.value });
	};

	const handleBlur = () => {
		// 편집 종료
		onEndEdit?.();
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			// Escape로 편집 종료 (Canvas의 handleKeyDown에서도 처리됨)
			e.stopPropagation();
			onEndEdit?.();
		}
	};

	// 편집 모드 진입 시 textarea에 포커스하고 커서를 끝으로 이동
	$effect(() => {
		if (isEditing && textareaRef) {
			textareaRef.focus();
			// 커서를 텍스트 끝으로 이동
			const len = textareaRef.value.length;
			textareaRef.setSelectionRange(len, len);
		}
	});

	// element.content가 외부에서 변경될 때 동기화
	$effect(() => {
		if (!isEditing) {
			localContent = element.content;
		}
	});
</script>

<g 
	transform="rotate({element.transform.rotation} {effectiveRotateCenterX} {effectiveRotateCenterY})"
	visibility={element.visible ? 'visible' : 'hidden'}
>
	<!-- 배경 사각형 (선택/클릭 영역) - 편집 중이 아닐 때만 클릭 가능 -->
	<rect
		x={element.transform.x}
		y={element.transform.y}
		width={element.width}
		height={element.height}
		fill="rgba(255,255,255,0.01)"
		stroke={isEditing ? '#4f46e5' : (isSelected ? '#4f46e5' : 'none')}
		stroke-width={isEditing || isSelected ? 1 : 0}
		stroke-dasharray={isEditing ? '4 2' : 'none'}
		class="cursor-text"
		pointer-events={isEditing ? 'none' : 'auto'}
		onmousedown={handleMouseDown}
		ondblclick={handleDoubleClick}
	/>

	<!-- 텍스트 영역 - 편집 중일 때만 클릭 가능 -->
	<foreignObject
		x={element.transform.x}
		y={element.transform.y}
		width={element.width}
		height={element.height}
		style="pointer-events: {isEditing ? 'auto' : 'none'};"
	>
		<div 
			xmlns="http://www.w3.org/1999/xhtml"
			class="w-full h-full overflow-hidden"
		>
			{#if isEditing}
				<textarea
					bind:this={textareaRef}
					value={localContent}
					oninput={handleInput}
					onblur={handleBlur}
					onkeydown={handleKeyDown}
					onmousedown={(e: MouseEvent) => e.stopPropagation()}
					class="w-full h-full resize-none border-none outline-none bg-transparent p-1"
					style="
						pointer-events: auto;
						font-size: {element.fontSize}px;
						font-family: {element.fontFamily};
						font-weight: {element.fontWeight};
						color: {element.fill.color || '#000000'};
						text-align: {element.textAnchor === 'middle' ? 'center' : element.textAnchor === 'end' ? 'right' : 'left'};
					"
				></textarea>
			{:else}
				<div
					class="w-full h-full p-1 whitespace-pre-wrap break-words"
					style="
						font-size: {element.fontSize}px;
						font-family: {element.fontFamily};
						font-weight: {element.fontWeight};
						color: {element.fill.color || '#000000'};
						text-align: {element.textAnchor === 'middle' ? 'center' : element.textAnchor === 'end' ? 'right' : 'left'};
						opacity: {element.opacity};
					"
				>
					{element.content}
				</div>
			{/if}
		</div>
	</foreignObject>
</g>

