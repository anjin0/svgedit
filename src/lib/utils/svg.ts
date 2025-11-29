import type {
	Point,
	SVGElement,
	RectangleElement,
	CircleElement,
	EllipseElement,
	LineElement,
	TextElement
} from '$lib/types';

export const generateId = (): string => {
	return `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const createRectangle = (
	start: Point,
	end: Point,
	options: { fill?: string; stroke?: string; strokeWidth?: number } = {}
): RectangleElement => {
	const x = Math.min(start.x, end.x);
	const y = Math.min(start.y, end.y);
	const width = Math.abs(end.x - start.x);
	const height = Math.abs(end.y - start.y);

	return {
		id: generateId(),
		type: 'rectangle',
		name: 'Rectangle',
		width,
		height,
		transform: {
			x,
			y,
			rotation: 0,
			scaleX: 1,
			scaleY: 1
		},
		fill: {
			type: 'solid',
			color: options.fill || '#3b82f6',
			opacity: 1
		},
		stroke: {
			color: options.stroke || '#1e40af',
			width: options.strokeWidth || 2,
			opacity: 1,
			lineCap: 'butt',
			lineJoin: 'miter'
		},
		visible: true,
		locked: false,
		opacity: 1
	};
};

export const createCircle = (
	start: Point,
	end: Point,
	options: { fill?: string; stroke?: string; strokeWidth?: number } = {}
): CircleElement => {
	const centerX = (start.x + end.x) / 2;
	const centerY = (start.y + end.y) / 2;
	const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)) / 2;

	return {
		id: generateId(),
		type: 'circle',
		name: 'Circle',
		radius,
		transform: {
			x: centerX,
			y: centerY,
			rotation: 0,
			scaleX: 1,
			scaleY: 1
		},
		fill: {
			type: 'solid',
			color: options.fill || '#3b82f6',
			opacity: 1
		},
		stroke: {
			color: options.stroke || '#1e40af',
			width: options.strokeWidth || 2,
			opacity: 1,
			lineCap: 'butt',
			lineJoin: 'miter'
		},
		visible: true,
		locked: false,
		opacity: 1
	};
};

export const createEllipse = (
	start: Point,
	end: Point,
	options: { fill?: string; stroke?: string; strokeWidth?: number } = {}
): EllipseElement => {
	const centerX = (start.x + end.x) / 2;
	const centerY = (start.y + end.y) / 2;
	const radiusX = Math.abs(end.x - start.x) / 2;
	const radiusY = Math.abs(end.y - start.y) / 2;

	return {
		id: generateId(),
		type: 'ellipse',
		name: 'Ellipse',
		radiusX,
		radiusY,
		transform: {
			x: centerX,
			y: centerY,
			rotation: 0,
			scaleX: 1,
			scaleY: 1
		},
		fill: {
			type: 'solid',
			color: options.fill || '#3b82f6',
			opacity: 1
		},
		stroke: {
			color: options.stroke || '#1e40af',
			width: options.strokeWidth || 2,
			opacity: 1,
			lineCap: 'butt',
			lineJoin: 'miter'
		},
		visible: true,
		locked: false,
		opacity: 1
	};
};

export const createLine = (
	start: Point,
	end: Point,
	options: { stroke?: string; strokeWidth?: number } = {}
): LineElement => {
	return {
		id: generateId(),
		type: 'line',
		name: 'Line',
		x1: 0,
		y1: 0,
		x2: end.x - start.x,
		y2: end.y - start.y,
		transform: {
			x: start.x,
			y: start.y,
			rotation: 0,
			scaleX: 1,
			scaleY: 1
		},
		fill: {
			type: 'solid',
			opacity: 0
		},
		stroke: {
			color: options.stroke || '#1e40af',
			width: options.strokeWidth || 2,
			opacity: 1,
			lineCap: 'round',
			lineJoin: 'round'
		},
		visible: true,
		locked: false,
		opacity: 1
	};
};

export const createText = (
	start: Point,
	end: Point,
	options: { fontSize?: number; fontFamily?: string; fill?: string } = {}
): TextElement => {
	const x = Math.min(start.x, end.x);
	const y = Math.min(start.y, end.y);
	const width = Math.max(Math.abs(end.x - start.x), 150); // 최소 너비 150
	const height = Math.max(Math.abs(end.y - start.y), 32); // 최소 높이 32

	return {
		id: generateId(),
		type: 'text',
		name: 'Text',
		content: '',
		fontSize: options.fontSize || 16,
		fontFamily: options.fontFamily || 'Arial, sans-serif',
		fontWeight: 400,
		textAnchor: 'start',
		width,
		height,
		transform: {
			x,
			y,
			rotation: 0,
			scaleX: 1,
			scaleY: 1
		},
		fill: {
			type: 'solid',
			color: options.fill || '#000000',
			opacity: 1
		},
		stroke: {
			color: 'none',
			width: 0,
			opacity: 0,
			lineCap: 'butt',
			lineJoin: 'miter'
		},
		visible: true,
		locked: false,
		opacity: 1
	};
};

// 화면 좌표를 SVG 사용자 좌표로 변환하는 함수
export const getMousePosition = (event: MouseEvent, svg: SVGSVGElement): Point => {
	const CTM = svg.getScreenCTM();
	if (CTM) {
		return {
			x: (event.clientX - CTM.e) / CTM.a,
			y: (event.clientY - CTM.f) / CTM.d
		};
	}
	return { x: 0, y: 0 };
};
