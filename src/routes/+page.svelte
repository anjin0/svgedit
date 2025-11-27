<script lang="ts">
	import Toolbar from '$lib/components/editor/Toolbar.svelte';
	import Canvas from '$lib/components/editor/Canvas.svelte';
	import LayersPanel from '$lib/components/editor/LayersPanel.svelte';
	import PropertiesPanel from '$lib/components/editor/PropertiesPanel.svelte';
</script>

<div class="flex flex-col h-screen w-screen">
	<Toolbar />
	<div class="flex flex-1 overflow-hidden">
		<LayersPanel />
		<Canvas />
		<PropertiesPanel />
	</div>
</div>
