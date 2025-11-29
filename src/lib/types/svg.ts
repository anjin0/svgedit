export type Point = {
	x: number;
	y: number;
};

export type Size = {
	width: number;
	height: number;
};

export type Transform = {
	x: number;
	y: number;
	rotation: number;
	scaleX: number;
	scaleY: number;
};

export type GradientStop = {
	offset: number;
	color: string;
	opacity: number;
};

export type Gradient = {
	type: 'linear' | 'radial';
	stops: GradientStop[];
	x1?: number;
	y1?: number;
	x2?: number;
	y2?: number;
	cx?: number;
	cy?: number;
	r?: number;
};

export type Fill = {
	type: 'solid' | 'gradient';
	color?: string;
	gradient?: Gradient;
	opacity: number;
};

export type Stroke = {
	color: string;
	width: number;
	opacity: number;
	lineCap: 'butt' | 'round' | 'square';
	lineJoin: 'miter' | 'round' | 'bevel';
	dashArray?: number[];
};

export type SVGElementType = 'rectangle' | 'circle' | 'ellipse' | 'path' | 'text' | 'line';

export type BaseSVGElement = {
	id: string;
	type: SVGElementType;
	name: string;
	transform: Transform;
	fill: Fill;
	stroke: Stroke;
	visible: boolean;
	locked: boolean;
	opacity: number;
};

export type RectangleElement = BaseSVGElement & {
	type: 'rectangle';
	width: number;
	height: number;
	rx?: number;
	ry?: number;
};

export type CircleElement = BaseSVGElement & {
	type: 'circle';
	radius: number;
};

export type EllipseElement = BaseSVGElement & {
	type: 'ellipse';
	radiusX: number;
	radiusY: number;
};

export type PathElement = BaseSVGElement & {
	type: 'path';
	pathData: string;
};

export type TextElement = BaseSVGElement & {
	type: 'text';
	content: string;
	fontSize: number;
	fontFamily: string;
	fontWeight: number | string;
	textAnchor: 'start' | 'middle' | 'end';
	width: number;
	height: number;
};

export type LineElement = BaseSVGElement & {
	type: 'line';
	x1: number;
	y1: number;
	x2: number;
	y2: number;
};

export type SVGElement =
	| RectangleElement
	| CircleElement
	| EllipseElement
	| PathElement
	| TextElement
	| LineElement;
