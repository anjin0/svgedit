import type { Point, SVGElement } from './svg';

export type Tool =
	| 'select'
	| 'rectangle'
	| 'circle'
	| 'ellipse'
	| 'line'
	| 'path'
	| 'text'
	| 'pan';

export type ViewBox = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export type CanvasState = {
	viewBox: ViewBox;
	zoom: number;
	gridVisible: boolean;
	gridSize: number;
	snapToGrid: boolean;
};

export type SelectionState = {
	selectedIds: string[];
	hoveredId: string | null;
};

export type EditorState = {
	currentTool: Tool;
	elements: SVGElement[];
	canvas: CanvasState;
	selection: SelectionState;
};

export type DragState = {
	isDragging: boolean;
	startPoint: Point;
	currentPoint: Point;
	element?: Partial<SVGElement>;
};

export type TransformHandle =
	| 'top-left'
	| 'top-right'
	| 'bottom-left'
	| 'bottom-right'
	| 'top'
	| 'bottom'
	| 'left'
	| 'right'
	| 'rotate';
