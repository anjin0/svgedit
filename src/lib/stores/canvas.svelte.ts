import type { ViewBox } from '$lib/types/editor';

class CanvasStore {
	viewBox = $state<ViewBox>({
		x: 0,
		y: 0,
		width: 800,
		height: 600
	});
	zoom = $state<number>(1);
	gridVisible = $state<boolean>(true);
	gridSize = $state<number>(20);
	snapToGrid = $state<boolean>(false);

	setViewBox = (viewBox: Partial<ViewBox>) => {
		this.viewBox = { ...this.viewBox, ...viewBox };
	};

	setZoom = (zoom: number) => {
		this.zoom = Math.max(0.1, Math.min(10, zoom));
	};

	zoomIn = () => {
		this.setZoom(this.zoom * 1.2);
	};

	zoomOut = () => {
		this.setZoom(this.zoom / 1.2);
	};

	resetZoom = () => {
		this.zoom = 1;
	};

	toggleGrid = () => {
		this.gridVisible = !this.gridVisible;
	};

	toggleSnapToGrid = () => {
		this.snapToGrid = !this.snapToGrid;
	};

	setGridSize = (size: number) => {
		this.gridSize = Math.max(5, Math.min(100, size));
	};

	pan = (deltaX: number, deltaY: number) => {
		this.viewBox.x -= deltaX / this.zoom;
		this.viewBox.y -= deltaY / this.zoom;
	};
}

export const canvasStore = new CanvasStore();
