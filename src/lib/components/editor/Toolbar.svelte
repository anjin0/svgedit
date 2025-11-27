<script lang="ts">
	import { editorStore } from '$lib/stores/editor.svelte';
	import type { Tool } from '$lib/types';
	import {
		MousePointer2,
		Square,
		Circle,
		Scan,
		Minus,
		Type,
		Hand,
		Save
	} from '@lucide/svelte';
	import type { ComponentType } from 'svelte';

	const tools: { id: Tool; label: string; icon: ComponentType }[] = [
		{ id: 'select', label: 'Select', icon: MousePointer2 },
		{ id: 'rectangle', label: 'Rectangle', icon: Square },
		{ id: 'circle', label: 'Circle', icon: Circle },
		{ id: 'ellipse', label: 'Ellipse', icon: Scan },
		{ id: 'line', label: 'Line', icon: Minus },
		{ id: 'text', label: 'Text', icon: Type },
		{ id: 'pan', label: 'Pan', icon: Hand }
	];

	const handleToolClick = (tool: Tool) => {
		editorStore.setTool(tool);
	};
</script>

<div class="flex items-center justify-between h-14 px-4 bg-white border-b border-gray-200 gap-6">
	<div class="flex items-center gap-2">
		<h1 class="text-base font-semibold text-gray-800">SVG Editor</h1>
	</div>

	<div class="flex items-center gap-2 flex-1 justify-center">
		{#each tools as tool}
			<button
				class="flex items-center justify-center w-9 h-9 rounded-md bg-transparent hover:bg-gray-100 transition-all border-none cursor-pointer {editorStore.currentTool === tool.id ? 'bg-indigo-100 text-indigo-600' : 'text-gray-700'}"
				onclick={() => handleToolClick(tool.id)}
				title={tool.label}
			>
				<svelte:component this={tool.icon} size={20} />
			</button>
		{/each}
	</div>

	<div class="flex items-center gap-2">
		<button
			class="flex items-center justify-center w-9 h-9 rounded-md bg-transparent hover:bg-gray-100 transition-all border-none cursor-pointer text-gray-700"
			title="Export SVG"
		>
			<Save size={20} />
		</button>
	</div>
</div>
