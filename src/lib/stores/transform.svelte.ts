import type { Point, TransformHandle } from '$lib/types';

class TransformStore {
	isTransforming = $state<boolean>(false);
	handle = $state<TransformHandle | null>(null);
	startPoint = $state<Point | null>(null);
	elementId = $state<string | null>(null);
	
	// 드래그 중 고정된 회전 중심 (Rectangle용)
	rotateCenterX = $state<number | null>(null);
	rotateCenterY = $state<number | null>(null);

	startTransform = (elementId: string, handle: TransformHandle, point: Point) => {
		this.isTransforming = true;
		this.elementId = elementId;
		this.handle = handle;
		this.startPoint = point;
	};

	setRotateCenter = (x: number, y: number) => {
		this.rotateCenterX = x;
		this.rotateCenterY = y;
	};

	endTransform = () => {
		this.isTransforming = false;
		this.elementId = null;
		this.handle = null;
		this.startPoint = null;
		this.rotateCenterX = null;
		this.rotateCenterY = null;
	};

	reset = () => {
		this.isTransforming = false;
		this.elementId = null;
		this.handle = null;
		this.startPoint = null;
		this.rotateCenterX = null;
		this.rotateCenterY = null;
	};
}

export const transformStore = new TransformStore();
