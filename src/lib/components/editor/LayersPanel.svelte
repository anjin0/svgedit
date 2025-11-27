<script lang="ts">
	import { editorStore } from '$lib/stores/editor.svelte';
	import { selectionStore } from '$lib/stores/selection.svelte';
	import { Eye, EyeOff, Lock, Unlock } from '@lucide/svelte';

	const handleLayerClick = (id: string, e: MouseEvent) => {
		selectionStore.select(id, e.ctrlKey || e.metaKey);
	};

	const handleVisibilityToggle = (id: string, e: Event) => {
		e.stopPropagation();
		const element = editorStore.getElementById(id);
		if (element) {
			editorStore.updateElement(id, { visible: !element.visible });
		}
	};

	const handleLockToggle = (id: string, e: Event) => {
		e.stopPropagation();
		const element = editorStore.getElementById(id);
		if (element) {
			editorStore.updateElement(id, { locked: !element.locked });
		}
	};

	const handleKeyDown = (id: string, e: KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			selectionStore.select(id, e.ctrlKey || e.metaKey);
		}
	};
</script>

<div class="w-60 bg-white border-r border-gray-200 flex flex-col">
	<div class="p-4 border-b border-gray-200">
		<h2 class="text-sm font-semibold text-gray-800 m-0">Layers</h2>
	</div>

	<div class="flex-1 overflow-y-auto">
		{#if editorStore.elements.length > 0}
			<div class="p-2">
				{#each editorStore.elements.toReversed() as element (element.id)}
					<div
						class="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors mb-1 {selectionStore.isSelected(element.id) ? 'bg-indigo-100' : 'hover:bg-gray-100'}"
						onclick={(e) => handleLayerClick(element.id, e)}
						onkeydown={(e) => handleKeyDown(element.id, e)}
						role="button"
						tabindex="0"
					>
						<button
							class="w-6 h-6 border-none bg-transparent cursor-pointer text-gray-600 flex items-center justify-center rounded transition-colors hover:bg-black/5"
							onclick={(e) => handleVisibilityToggle(element.id, e)}
							title={element.visible ? 'Hide' : 'Show'}
						>
							{#if element.visible}
								<Eye size={16} />
							{:else}
								<EyeOff size={16} />
							{/if}
						</button>

						<span class="flex-1 text-sm text-gray-800 overflow-hidden text-ellipsis whitespace-nowrap">
							{element.name}
						</span>

						<button
							class="w-6 h-6 border-none bg-transparent cursor-pointer text-gray-600 flex items-center justify-center rounded transition-colors hover:bg-black/5"
							onclick={(e) => handleLockToggle(element.id, e)}
							title={element.locked ? 'Unlock' : 'Lock'}
						>
							{#if element.locked}
								<Lock size={16} />
							{:else}
								<Unlock size={16} />
							{/if}
						</button>
					</div>
				{/each}
			</div>
		{:else}
			<div class="py-8 px-4 text-center text-gray-400 text-sm">
				<p class="m-0">No layers yet</p>
				<p class="text-xs mt-2 text-gray-300">Create a shape to get started</p>
			</div>
		{/if}
	</div>
</div>
