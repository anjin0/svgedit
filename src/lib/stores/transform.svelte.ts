import type { Point, TransformHandle } from '$lib/types';

class TransformStore {
	isTransforming = $state<boolean>(false);
	handle = $state<TransformHandle | null>(null);
	startPoint = $state<Point | null>(null);
	elementId = $state<string | null>(null);

	startTransform = (elementId: string, handle: TransformHandle, point: Point) => {
		this.isTransforming = true;
		this.elementId = elementId;
		this.handle = handle;
		this.startPoint = point;
	};

	endTransform = () => {
		this.isTransforming = false;
		this.elementId = null;
		this.handle = null;
		this.startPoint = null;
	};

	reset = () => {
		this.isTransforming = false;
		this.elementId = null;
		this.handle = null;
		this.startPoint = null;
	};
}

export const transformStore = new TransformStore();
