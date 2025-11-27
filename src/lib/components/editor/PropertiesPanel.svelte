<script lang="ts">
	import { selectionStore } from '$lib/stores/selection.svelte';
	import { editorStore } from '$lib/stores/editor.svelte';

	const selectedElement = $derived.by(() => {
		if (selectionStore.selectedIds.length === 1) {
			return editorStore.getElementById(selectionStore.selectedIds[0]);
		}
		return null;
	});

	const handleTransformChange = (property: 'x' | 'y' | 'rotation', value: number) => {
		if (selectedElement) {
			editorStore.updateElement(selectedElement.id, {
				transform: {
					...selectedElement.transform,
					[property]: value
				}
			});
		}
	};

	const handleFillColorChange = (color: string) => {
		if (selectedElement) {
			editorStore.updateElement(selectedElement.id, {
				fill: {
					...selectedElement.fill,
					type: 'solid',
					color
				}
			});
		}
	};

	const handleFillOpacityChange = (opacity: number) => {
		if (selectedElement) {
			editorStore.updateElement(selectedElement.id, {
				fill: {
					...selectedElement.fill,
					opacity: opacity / 100
				}
			});
		}
	};

	const handleStrokeColorChange = (color: string) => {
		if (selectedElement) {
			editorStore.updateElement(selectedElement.id, {
				stroke: {
					...selectedElement.stroke,
					color
				}
			});
		}
	};

	const handleStrokeWidthChange = (width: number) => {
		if (selectedElement) {
			editorStore.updateElement(selectedElement.id, {
				stroke: {
					...selectedElement.stroke,
					width
				}
			});
		}
	};

	const handleOpacityChange = (opacity: number) => {
		if (selectedElement) {
			editorStore.updateElement(selectedElement.id, {
				opacity: opacity / 100
			});
		}
	};

	// Get size properties based on element type
	const getSize = $derived.by(() => {
		if (!selectedElement) return null;

		if (selectedElement.type === 'rectangle') {
			return { width: selectedElement.width, height: selectedElement.height };
		} else if (selectedElement.type === 'circle') {
			return { width: selectedElement.radius * 2, height: selectedElement.radius * 2 };
		} else if (selectedElement.type === 'ellipse') {
			return { width: selectedElement.radiusX * 2, height: selectedElement.radiusY * 2 };
		}
		return null;
	});

	const handleSizeChange = (property: 'width' | 'height', value: number) => {
		if (!selectedElement) return;

		if (selectedElement.type === 'rectangle') {
			editorStore.updateElement(selectedElement.id, {
				[property]: Math.max(1, value)
			});
		} else if (selectedElement.type === 'circle') {
			editorStore.updateElement(selectedElement.id, {
				radius: Math.max(0.5, value / 2)
			});
		} else if (selectedElement.type === 'ellipse') {
			const prop = property === 'width' ? 'radiusX' : 'radiusY';
			editorStore.updateElement(selectedElement.id, {
				[prop]: Math.max(0.5, value / 2)
			});
		}
	};

	const handleFillTypeChange = (type: 'solid' | 'gradient') => {
		if (!selectedElement) return;

		if (type === 'gradient') {
			editorStore.updateElement(selectedElement.id, {
				fill: {
					...selectedElement.fill,
					type: 'gradient',
					gradient: {
						type: 'linear',
						stops: [
							{ offset: 0, color: '#000000', opacity: 1 },
							{ offset: 1, color: '#ffffff', opacity: 1 }
						],
						x1: 0,
						y1: 0,
						x2: 100,
						y2: 0
					}
				}
			});
		} else {
			editorStore.updateElement(selectedElement.id, {
				fill: {
					...selectedElement.fill,
					type: 'solid',
					color: selectedElement.fill.color || '#000000'
				}
			});
		}
	};

	const handleGradientStopColorChange = (index: number, color: string) => {
		if (!selectedElement || selectedElement.fill.type !== 'gradient' || !selectedElement.fill.gradient) return;

		const newStops = [...selectedElement.fill.gradient.stops];
		newStops[index] = { ...newStops[index], color };

		editorStore.updateElement(selectedElement.id, {
			fill: {
				...selectedElement.fill,
				gradient: {
					...selectedElement.fill.gradient,
					stops: newStops
				}
			}
		});
	};
</script>

<div class="w-72 bg-white border-l border-gray-200 p-4 overflow-y-auto">
	<h2 class="text-lg font-semibold mb-4 text-gray-800">Properties</h2>

	{#if selectedElement}
		{@const element = selectedElement}
		{@const size = getSize}

		<!-- Transform Section -->
		<div class="mb-4 pb-4 border-b border-gray-200">
			<h3 class="text-sm font-medium text-gray-700 mb-3">Transform</h3>
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<label for="prop-x" class="text-xs text-gray-600 w-20 flex-shrink-0">X</label>
					<input
						id="prop-x"
						type="number"
						value={Math.round(element.transform.x)}
						oninput={(e) => handleTransformChange('x', Number(e.currentTarget.value))}
						class="px-2 py-1 border border-gray-300 rounded text-sm w-full"
					/>
				</div>
				<div class="flex items-center gap-2">
					<label for="prop-y" class="text-xs text-gray-600 w-20 flex-shrink-0">Y</label>
					<input
						id="prop-y"
						type="number"
						value={Math.round(element.transform.y)}
						oninput={(e) => handleTransformChange('y', Number(e.currentTarget.value))}
						class="px-2 py-1 border border-gray-300 rounded text-sm w-full"
					/>
				</div>
				<div class="flex items-center gap-2">
					<label for="prop-rotation" class="text-xs text-gray-600 w-20 flex-shrink-0">Rotation</label>
					<input
						id="prop-rotation"
						type="number"
						value={Math.round(element.transform.rotation)}
						oninput={(e) => handleTransformChange('rotation', Number(e.currentTarget.value))}
						class="px-2 py-1 border border-gray-300 rounded text-sm w-full"
					/>
				</div>
			</div>
		</div>

		<!-- Size Section -->
		{#if size}
			<div class="mb-4 pb-4 border-b border-gray-200">
				<h3 class="text-sm font-medium text-gray-700 mb-3">Size</h3>
				<div class="space-y-2">
					<div class="flex items-center gap-2">
						<label for="prop-width" class="text-xs text-gray-600 w-20 flex-shrink-0">Width</label>
						<input
							id="prop-width"
							type="number"
							value={Math.round(size.width)}
							oninput={(e) => handleSizeChange('width', Number(e.currentTarget.value))}
							class="px-2 py-1 border border-gray-300 rounded text-sm w-full"
						/>
					</div>
					<div class="flex items-center gap-2">
						<label for="prop-height" class="text-xs text-gray-600 w-20 flex-shrink-0">Height</label>
						<input
							id="prop-height"
							type="number"
							value={Math.round(size.height)}
							oninput={(e) => handleSizeChange('height', Number(e.currentTarget.value))}
							class="px-2 py-1 border border-gray-300 rounded text-sm w-full"
						/>
					</div>
				</div>
			</div>
		{/if}

		<!-- Fill Section (not for lines) -->
		{#if element.type !== 'line'}
			<div class="mb-4 pb-4 border-b border-gray-200">
				<h3 class="text-sm font-medium text-gray-700 mb-3">Fill</h3>
				<div class="space-y-2">
					<!-- Fill Type Selector -->
					<div class="flex items-center gap-2">
						<label for="prop-fill-type" class="text-xs text-gray-600 w-20 flex-shrink-0">Type</label>
						<select
							id="prop-fill-type"
							value={element.fill.type}
							onchange={(e) => handleFillTypeChange(e.currentTarget.value as 'solid' | 'gradient')}
							class="px-2 py-1 border border-gray-300 rounded text-sm w-full"
						>
							<option value="solid">Solid</option>
							<option value="gradient">Gradient</option>
						</select>
					</div>

					{#if element.fill.type === 'solid'}
						<div class="flex items-center gap-2">
							<label for="prop-fill-color" class="text-xs text-gray-600 w-20 flex-shrink-0">Color</label>
							<input
								id="prop-fill-color"
								type="color"
								value={element.fill.color || '#000000'}
								oninput={(e) => handleFillColorChange(e.currentTarget.value)}
								class="h-8 border border-gray-300 rounded cursor-pointer w-full"
							/>
						</div>
					{:else if element.fill.type === 'gradient' && element.fill.gradient}
						<div>
							<label class="block text-xs text-gray-600 mb-1">Gradient Colors</label>
							<div class="space-y-2">
								{#each element.fill.gradient.stops as stop, index}
									<div class="flex items-center gap-2">
										<span class="text-xs text-gray-500 w-8">{Math.round(stop.offset * 100)}%</span>
										<input
											type="color"
											value={stop.color}
											oninput={(e) => handleGradientStopColorChange(index, e.currentTarget.value)}
											class="flex-1 h-6 border border-gray-300 rounded cursor-pointer"
										/>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<div>
						<div class="flex items-center justify-between mb-1">
							<label for="prop-fill-opacity" class="text-xs text-gray-600">
								Opacity
							</label>
							<span class="text-xs text-gray-500">{Math.round((element.fill.opacity || 1) * 100)}%</span>
						</div>
						<input
							id="prop-fill-opacity"
							type="range"
							min="0"
							max="100"
							value={Math.round((element.fill.opacity || 1) * 100)}
							oninput={(e) => handleFillOpacityChange(Number(e.currentTarget.value))}
							class="w-full"
						/>
					</div>
				</div>
			</div>
		{/if}

		<!-- Stroke Section -->
		<div class="mb-4 pb-4 border-b border-gray-200">
			<h3 class="text-sm font-medium text-gray-700 mb-3">Stroke</h3>
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<label for="prop-stroke-color" class="text-xs text-gray-600 w-20 flex-shrink-0">Color</label>
					<input
						id="prop-stroke-color"
						type="color"
						value={element.stroke.color || '#000000'}
						oninput={(e) => handleStrokeColorChange(e.currentTarget.value)}
						class="h-8 border border-gray-300 rounded cursor-pointer w-full"
					/>
				</div>
				<div class="flex items-center gap-2">
					<label for="prop-stroke-width" class="text-xs text-gray-600 w-20 flex-shrink-0">Width</label>
					<input
						id="prop-stroke-width"
						type="number"
						min="0"
						step="0.5"
						value={element.stroke.width || 1}
						oninput={(e) => handleStrokeWidthChange(Number(e.currentTarget.value))}
						class="px-2 py-1 border border-gray-300 rounded text-sm w-full"
					/>
				</div>
			</div>
		</div>

		<!-- Opacity Section -->
		<div class="mb-4">
			<h3 class="text-sm font-medium text-gray-700 mb-3">Opacity</h3>
			<div>
				<div class="flex items-center justify-between mb-1">
					<label for="prop-opacity" class="text-xs text-gray-600">
						Overall
					</label>
					<span class="text-xs text-gray-500">{Math.round((element.opacity || 1) * 100)}%</span>
				</div>
				<input
					id="prop-opacity"
					type="range"
					min="0"
					max="100"
					value={Math.round((element.opacity || 1) * 100)}
					oninput={(e) => handleOpacityChange(Number(e.currentTarget.value))}
					class="w-full"
				/>
			</div>
		</div>
	{:else}
		<p class="text-sm text-gray-500">No element selected</p>
	{/if}
</div>