class SelectionStore {
	selectedIds = $state<string[]>([]);
	hoveredId = $state<string | null>(null);

	select = (id: string, multiSelect = false) => {
		if (multiSelect) {
			if (this.selectedIds.includes(id)) {
				this.selectedIds = this.selectedIds.filter((selectedId) => selectedId !== id);
			} else {
				this.selectedIds.push(id);
			}
		} else {
			this.selectedIds = [id];
		}
	};

	selectMultiple = (ids: string[]) => {
		this.selectedIds = ids;
	};

	deselect = (id?: string) => {
		if (id) {
			this.selectedIds = this.selectedIds.filter((selectedId) => selectedId !== id);
		} else {
			this.selectedIds = [];
		}
	};

	clearSelection = () => {
		this.selectedIds = [];
	};

	isSelected = (id: string): boolean => {
		return this.selectedIds.includes(id);
	};

	setHovered = (id: string | null) => {
		this.hoveredId = id;
	};

	get hasSelection(): boolean {
		return this.selectedIds.length > 0;
	}

	get selectedCount(): number {
		return this.selectedIds.length;
	}
}

export const selectionStore = new SelectionStore();
