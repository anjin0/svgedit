import type { Tool, SVGElement } from '$lib/types';

type DistributiveUpdates<T> = T extends any ? Omit<Partial<T>, 'type'> : never;

class EditorStore {
	currentTool = $state<Tool>('select');
	elements = $state<SVGElement[]>([]);

	setTool = (tool: Tool) => {
		this.currentTool = tool;
	};

	addElement = (element: SVGElement) => {
		this.elements.push(element);
	};

	updateElement = (id: string, updates: DistributiveUpdates<SVGElement>) => {
		const index = this.elements.findIndex((el) => el.id === id);
		if (index !== -1) {
			this.elements[index] = { ...this.elements[index], ...updates } as SVGElement;
		}
	};

	removeElement = (id: string) => {
		this.elements = this.elements.filter((el) => el.id !== id);
	};

	getElementById = (id: string): SVGElement | undefined => {
		return this.elements.find((el) => el.id === id);
	};

	clear = () => {
		this.elements = [];
	};
}

export const editorStore = new EditorStore();
