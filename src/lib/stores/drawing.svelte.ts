import type { Point, SVGElement } from '$lib/types';

class DrawingStore {
	isDrawing = $state<boolean>(false);
	startPoint = $state<Point | null>(null);
	currentPoint = $state<Point | null>(null);
	previewElement = $state<Partial<SVGElement> | null>(null);

	startDrawing = (point: Point) => {
		this.isDrawing = true;
		this.startPoint = point;
		this.currentPoint = point;
	};

	updateDrawing = (point: Point) => {
		if (this.isDrawing) {
			this.currentPoint = point;
		}
	};

	endDrawing = (): { start: Point; end: Point } | null => {
		if (this.isDrawing && this.startPoint && this.currentPoint) {
			const result = {
				start: this.startPoint,
				end: this.currentPoint
			};
			this.reset();
			return result;
		}
		this.reset();
		return null;
	};

	setPreviewElement = (element: Partial<SVGElement> | null) => {
		this.previewElement = element;
	};

	reset = () => {
		this.isDrawing = false;
		this.startPoint = null;
		this.currentPoint = null;
		this.previewElement = null;
	};

	get dimensions() {
		if (!this.startPoint || !this.currentPoint) {
			return { x: 0, y: 0, width: 0, height: 0 };
		}

		const x = Math.min(this.startPoint.x, this.currentPoint.x);
		const y = Math.min(this.startPoint.y, this.currentPoint.y);
		const width = Math.abs(this.currentPoint.x - this.startPoint.x);
		const height = Math.abs(this.currentPoint.y - this.startPoint.y);

		return { x, y, width, height };
	}
}

export const drawingStore = new DrawingStore();
