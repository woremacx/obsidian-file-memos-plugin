import { MarkdownBlock, BlockType } from './MarkdownParser';
import { MarkdownRenderer, setIcon, App, Component, MarkdownRenderChild } from 'obsidian';
import { EmbeddableMarkdownEditor } from './EmbeddableMarkdownEditor';
import { Logger } from './Logger';

export interface CardState {
	collapsed: boolean;
	// checked is stored in markdown file, not in CardState
}

// Static variable to track the currently dragged card index across all instances
let globalDraggedIndex: number | undefined = undefined;

export class CardComponent {
	private containerEl: HTMLElement;
	private block: MarkdownBlock;
	private cardEl: HTMLElement;
	private contentEl: HTMLElement;
	private collapsed: boolean = false;
	private checked: boolean = false;
	private editing: boolean = false;
	private onStateChange?: (blockIndex: number, state: CardState) => void;
	private onCheckToggle?: (blockIndex: number, checked: boolean) => void;
	private onDelete?: (blockIndex: number) => void;
	private onReorder?: (fromIndex: number, toIndex: number) => void;
	private onEdit?: (blockIndex: number, newContent: string) => void;
	private onEditStart?: (blockId: string | undefined) => void;
	private onEditEnd?: () => void;
	private blockIndex: number;
	private app: App;
	private component: Component;
	private editEditor: EmbeddableMarkdownEditor | null = null;
	private sourcePath: string; // File path for resolving embedded resources
	private renderChild: MarkdownRenderChild | null = null; // Track render child for cleanup

	constructor(
		containerEl: HTMLElement,
		block: MarkdownBlock,
		blockIndex: number,
		app: App,
		component: Component,
		sourcePath: string,
		initialState?: CardState,
		onStateChange?: (blockIndex: number, state: CardState) => void,
		onCheckToggle?: (blockIndex: number, checked: boolean) => void,
		onDelete?: (blockIndex: number) => void,
		onReorder?: (fromIndex: number, toIndex: number) => void,
		onEdit?: (blockIndex: number, newContent: string) => void,
		onEditStart?: (blockId: string | undefined) => void,
		onEditEnd?: () => void
	) {
		this.containerEl = containerEl;
		this.block = block;
		this.blockIndex = blockIndex;
		this.app = app;
		this.component = component;
		this.sourcePath = sourcePath;
		this.onStateChange = onStateChange;
		this.onCheckToggle = onCheckToggle;
		this.onDelete = onDelete;
		this.onReorder = onReorder;
		this.onEdit = onEdit;
		this.onEditStart = onEditStart;
		this.onEditEnd = onEditEnd;

		// Use block.checked if available (from H2 heading) - this is the source of truth
		if (block.checked !== undefined) {
			this.checked = block.checked;
		}
		// Do not use initialState.checked - markdown file is the source of truth for checkbox state

		// Use initialState only for collapsed state
		if (initialState) {
			this.collapsed = initialState.collapsed;
		}

		// Initialize card element synchronously, render content asynchronously
		this.cardEl = this.containerEl.createEl('div', { cls: 'memos-card' });
		this.createCardElement();
	}

	private async createCardElement(): Promise<void> {
		const cardEl = this.cardEl;

		// Add type-specific class
		cardEl.addClass(`memos-card-${this.block.type}`);

		// Skip rendering empty blocks
		if (this.block.type === BlockType.EMPTY) {
			cardEl.addClass('memos-card-empty');
			return;
		}

		// Create card header with controls
		const headerEl = cardEl.createEl('div', {
			cls: 'memos-card-header'
		});

		// Add checkbox (only for H2 headings, not H1)
		if (!(this.block.type === BlockType.HEADING && this.block.level === 1)) {
			const checkboxEl = headerEl.createEl('input', {
				type: 'checkbox',
				cls: 'memos-card-checkbox'
			});
			checkboxEl.checked = this.checked;
			checkboxEl.addEventListener('change', () => {
				this.checked = checkboxEl.checked;
				cardEl.toggleClass('memos-card-checked', this.checked);
				// Notify checkbox toggle separately from state change
				if (this.onCheckToggle) {
					this.onCheckToggle(this.blockIndex, this.checked);
				}
			});
		}

		// Add collapse/expand button
		const collapseBtn = headerEl.createEl('button', {
			cls: 'memos-collapse-btn'
		});
		setIcon(collapseBtn, this.collapsed ? 'chevron-right' : 'chevron-down');
		collapseBtn.addEventListener('click', () => {
			this.toggleCollapse();
		});

		// Add drag handle
		const dragHandle = headerEl.createEl('button', {
			cls: 'memos-drag-handle'
		});
		setIcon(dragHandle, 'grip-vertical');
		dragHandle.setAttribute('draggable', 'true');

		// Add timestamp or block type indicator
		const infoEl = headerEl.createEl('span', {
			cls: 'memos-card-info'
		});

		// Extract timestamp and text from heading if exists
		const timestampMatch = this.block.content.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})(\s+(.+))?/);
		if (timestampMatch) {
			// If there's text after timestamp, show both; otherwise just timestamp
			const timestamp = timestampMatch[1];
			const textAfter = timestampMatch[3];
			if (textAfter) {
				// Split by double newline to get only the heading part, not body
				const headingOnly = textAfter.split('\n\n')[0];
				infoEl.setText(`${timestamp} ${headingOnly}`);
			} else {
				infoEl.setText(timestamp);
			}
		} else if (this.block.type === BlockType.HEADING) {
			infoEl.setText(this.block.content.substring(0, 30) + (this.block.content.length > 30 ? '...' : ''));
		} else {
			infoEl.setText(this.block.type);
		}

		// Add edit button
		const editBtn = headerEl.createEl('button', {
			cls: 'memos-edit-btn'
		});
		setIcon(editBtn, 'pencil');
		editBtn.addEventListener('click', () => {
			this.toggleEditMode();
		});

		// Add delete button
		const deleteBtn = headerEl.createEl('button', {
			cls: 'memos-delete-btn'
		});
		setIcon(deleteBtn, 'trash-2');
		deleteBtn.addEventListener('click', () => {
			this.handleDelete();
		});

		// Setup drag and drop
		this.setupDragAndDrop(cardEl, dragHandle);

		// Create card content container
		this.contentEl = cardEl.createEl('div', {
			cls: 'memos-card-content'
		});

		// Render based on block type (asynchronously)
		await this.renderBlockContent(this.contentEl);

		// Apply collapsed state
		if (this.collapsed) {
			this.contentEl.addClass('collapsed');
		}

		// Apply checked state
		if (this.checked) {
			cardEl.addClass('memos-card-checked');
		}
	}

	private toggleCollapse(): void {
		this.collapsed = !this.collapsed;
		this.contentEl.toggleClass('collapsed', this.collapsed);

		const collapseBtn = this.cardEl.querySelector('.memos-collapse-btn') as HTMLElement;
		if (collapseBtn) {
			setIcon(collapseBtn, this.collapsed ? 'chevron-right' : 'chevron-down');
		}

		this.notifyStateChange();
	}

	private notifyStateChange(): void {
		if (this.onStateChange) {
			this.onStateChange(this.blockIndex, {
				collapsed: this.collapsed
			});
		}
	}

	private async renderBlockContent(contentEl: HTMLElement): Promise<void> {
		// Clean up previous render child if exists
		if (this.renderChild) {
			this.renderChild.unload();
			this.renderChild = null;
		}

		// Get the markdown representation of the block
		const markdown = this.getBlockMarkdown();

		// Create a container for the rendered markdown
		// Add 'markdown-preview-view' class to inherit Obsidian's default styles for tables, links, etc.
		const markdownContainer = contentEl.createEl('div', {
			cls: 'memos-block-content markdown-preview-view'
		});

		// Create a MarkdownRenderChild for proper component context
		// This is necessary for embedded resources (images, links, etc.) to resolve correctly
		this.renderChild = new MarkdownRenderChild(markdownContainer);
		this.component.addChild(this.renderChild);

		// Use Obsidian's MarkdownRenderer to render all content
		// This provides native Obsidian features like:
		// - Syntax highlighting for code blocks
		// - Interactive checkboxes
		// - Image/embed rendering
		// - Link handling
		// - And all other Obsidian markdown features
		await MarkdownRenderer.renderMarkdown(
			markdown,
			markdownContainer,
			this.sourcePath, // sourcePath for resolving embedded resources (images, etc.)
			this.renderChild // Use the MarkdownRenderChild for proper context
		);

		// Process internal embeds (images, links, etc.)
		await this.processInternalEmbeds(markdownContainer);

		// Setup checkbox event listeners for task lists
		this.setupCheckboxListeners(markdownContainer);
	}

	/**
	 * Process internal embeds in the rendered markdown
	 * Convert span.internal-embed to actual embedded content (images, etc.)
	 */
	private async processInternalEmbeds(container: HTMLElement): Promise<void> {
		const embeds = container.querySelectorAll('span.internal-embed');

		for (let i = 0; i < embeds.length; i++) {
			const embed = embeds[i] as HTMLElement;
			const src = embed.getAttribute('src');
			const alt = embed.getAttribute('alt');

			if (!src) continue;

			// Check if it's an image embed
			const isImage = /\.(png|jpe?g|gif|svg|bmp|webp)$/i.test(src);

			if (isImage) {
				// Resolve the file path
				const file = this.app.metadataCache.getFirstLinkpathDest(src, this.sourcePath);

				if (file) {
					// Get resource path for the image
					const resourcePath = this.app.vault.getResourcePath(file);

					// Create img element
					const img = document.createElement('img');
					img.src = resourcePath;
					img.alt = alt || src;
					img.addClass('internal-embed');
					img.addClass('image-embed');

					// Replace the span with the img
					embed.replaceWith(img);
				}
			}
		}
	}

	/**
	 * Setup event listeners for checkboxes in rendered content
	 * This makes checkboxes interactive and updates the markdown file
	 */
	private setupCheckboxListeners(container: HTMLElement): void {
		const checkboxes = container.querySelectorAll('input[type="checkbox"].task-list-item-checkbox');

		checkboxes.forEach((checkbox, index) => {
			checkbox.addEventListener('change', async (e) => {
				const target = e.target as HTMLInputElement;
				const isChecked = target.checked;

				// Update the markdown content
				await this.updateCheckboxInContent(index, isChecked);
			});
		});
	}

	/**
	 * Update a checkbox state in the block content and save to file
	 */
	private async updateCheckboxInContent(checkboxIndex: number, isChecked: boolean): Promise<void> {
		// Get the current markdown
		let markdown = this.getBlockMarkdown();

		// Find and replace the checkbox at the specified index
		let currentIndex = 0;
		const checkboxRegex = /- \[([ x])\]/g;

		markdown = markdown.replace(checkboxRegex, (match, checkState) => {
			if (currentIndex === checkboxIndex) {
				currentIndex++;
				return isChecked ? '- [x]' : '- [ ]';
			}
			currentIndex++;
			return match;
		});

		// Trigger edit callback to save the updated content
		if (this.onEdit) {
			this.onEdit(this.blockIndex, markdown);
		}
	}

	/**
	 * Convert the block back to its markdown representation
	 */
	private getBlockMarkdown(): string {
		switch (this.block.type) {
			case BlockType.HEADING:
				const level = this.block.level || 1;
				const hashes = '#'.repeat(level);
				return `${hashes} ${this.block.content}`;

			case BlockType.CODE_BLOCK:
				const lang = this.block.language || '';
				return `\`\`\`${lang}\n${this.block.content}\n\`\`\``;

			case BlockType.LIST:
				return this.block.content;

			case BlockType.BLOCKQUOTE:
				return this.block.content.split('\n').map(line => `> ${line}`).join('\n');

			case BlockType.DIVIDER:
				return '---';

			case BlockType.PARAGRAPH:
			default:
				return this.block.content;
		}
	}

	private setupDragAndDrop(cardEl: HTMLElement, dragHandle: HTMLElement): void {
		dragHandle.addEventListener('dragstart', (e) => {
			Logger.debug('[DragDrop] Drag started from index:', this.blockIndex);
			globalDraggedIndex = this.blockIndex;
			cardEl.addClass('memos-dragging');
			if (e.dataTransfer) {
				e.dataTransfer.effectAllowed = 'move';
				e.dataTransfer.setData('text/plain', String(this.blockIndex));
			}
		});

		dragHandle.addEventListener('dragend', () => {
			Logger.debug('[DragDrop] Drag ended, clearing globalDraggedIndex');
			cardEl.removeClass('memos-dragging');
			// Clean up all drag-over classes
			this.containerEl.querySelectorAll('.memos-drag-over-top, .memos-drag-over-bottom').forEach(el => {
				el.removeClass('memos-drag-over-top');
				el.removeClass('memos-drag-over-bottom');
			});
			globalDraggedIndex = undefined;
		});

		cardEl.addEventListener('dragover', (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (e.dataTransfer) {
				e.dataTransfer.dropEffect = 'move';
			}

			// Only add drag-over class if we're not dragging this card
			if (!cardEl.hasClass('memos-dragging')) {
				// Determine if cursor is in top half or bottom half
				const rect = cardEl.getBoundingClientRect();
				const midpoint = rect.top + rect.height / 2;
				const mouseY = (e as DragEvent).clientY;

				// Remove previous classes
				cardEl.removeClass('memos-drag-over-top');
				cardEl.removeClass('memos-drag-over-bottom');

				// Add appropriate class based on mouse position
				if (mouseY < midpoint) {
					cardEl.addClass('memos-drag-over-top');
				} else {
					cardEl.addClass('memos-drag-over-bottom');
				}
			}
		});

		cardEl.addEventListener('dragleave', (e) => {
			// Only remove if we're actually leaving the card
			const rect = cardEl.getBoundingClientRect();
			const x = (e as DragEvent).clientX;
			const y = (e as DragEvent).clientY;

			if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
				cardEl.removeClass('memos-drag-over-top');
				cardEl.removeClass('memos-drag-over-bottom');
			}
		});

		cardEl.addEventListener('drop', (e) => {
			e.preventDefault();
			e.stopPropagation();

			// Determine if we dropped on top or bottom half
			const rect = cardEl.getBoundingClientRect();
			const midpoint = rect.top + rect.height / 2;
			const mouseY = (e as DragEvent).clientY;
			const isTopHalf = mouseY < midpoint;

			// Clean up classes
			cardEl.removeClass('memos-drag-over-top');
			cardEl.removeClass('memos-drag-over-bottom');

			Logger.debug('[DragDrop] Drop on index:', this.blockIndex, 'from:', globalDraggedIndex, 'topHalf:', isTopHalf);

			if (globalDraggedIndex !== undefined && globalDraggedIndex !== this.blockIndex) {
				let targetIndex = this.blockIndex;

				// If dropping on bottom half and moving downward, insert after this card
				if (!isTopHalf && globalDraggedIndex < this.blockIndex) {
					targetIndex = this.blockIndex;
				}
				// If dropping on top half and moving upward, insert before this card
				else if (isTopHalf && globalDraggedIndex > this.blockIndex) {
					targetIndex = this.blockIndex;
				}
				// If dropping on bottom half and moving upward, insert after this card
				else if (!isTopHalf && globalDraggedIndex > this.blockIndex) {
					targetIndex = this.blockIndex + 1;
				}
				// If dropping on top half and moving downward, insert before this card
				else if (isTopHalf && globalDraggedIndex < this.blockIndex) {
					targetIndex = this.blockIndex - 1;
				}

				Logger.debug('[DragDrop] Calling onReorder:', globalDraggedIndex, '->', targetIndex);
				if (this.onReorder) {
					this.onReorder(globalDraggedIndex, targetIndex);
				}
			}
		});
	}

	private getDragAfterElement(container: HTMLElement, y: number): Element | null {
		const draggableElements = Array.from(
			container.querySelectorAll('.memos-card:not(.memos-dragging)')
		);

		return draggableElements.reduce<{ offset: number; element: Element | null }>(
			(closest, child) => {
				const box = child.getBoundingClientRect();
				const offset = y - box.top - box.height / 2;

				if (offset < 0 && offset > closest.offset) {
					return { offset: offset, element: child };
				} else {
					return closest;
				}
			},
			{ offset: Number.NEGATIVE_INFINITY, element: null }
		).element;
	}

	private toggleEditMode(): void {
		this.editing = !this.editing;

		if (this.editing) {
			this.enterEditMode();
		} else {
			this.exitEditMode();
		}
	}

	private enterEditMode(): void {
		// Notify that editing started
		if (this.onEditStart) {
			this.onEditStart(this.block.id);
		}

		// Clear the content area
		this.contentEl.empty();
		this.contentEl.addClass('memos-editing');

		// Create editor container
		const editorContainer = this.contentEl.createEl('div', {
			cls: 'memos-card-editor-container'
		});

		// Get initial value based on block type
		let editableContent = this.getEditableContent();

		// Create embeddable markdown editor
		this.editEditor = new EmbeddableMarkdownEditor(
			editorContainer,
			this.component,
			{
				app: this.app,
				initialValue: editableContent,
				onBlur: (editor) => {
					// Auto-save when focus is lost
					const content = editor.getValue().trim();
					if (content) {
						this.saveEdit(content);
					}
				}
			}
		);

		// Focus on editor
		if (this.editEditor) {
			this.editEditor.focus();
		}
	}

	private exitEditMode(): void {
		// Destroy editor if exists
		if (this.editEditor) {
			this.editEditor.destroy();
			this.editEditor = null;
		}

		// Notify that editing ended
		if (this.onEditEnd) {
			this.onEditEnd();
		}

		this.contentEl.removeClass('memos-editing');
		this.contentEl.empty();
		this.renderBlockContent(this.contentEl);
	}

	private getEditableContent(): string {
		switch (this.block.type) {
			case BlockType.HEADING:
				const level = this.block.level || 1;
				const hashes = '#'.repeat(level);
				return `${hashes} ${this.block.content}`;

			case BlockType.CODE_BLOCK:
				const lang = this.block.language || '';
				return `\`\`\`${lang}\n${this.block.content}\n\`\`\``;

			case BlockType.LIST:
				return this.block.content;

			case BlockType.BLOCKQUOTE:
				return this.block.content.split('\n').map(line => `> ${line}`).join('\n');

			case BlockType.DIVIDER:
				return '---';

			case BlockType.PARAGRAPH:
			default:
				return this.block.content;
		}
	}

	private saveEdit(newContent: string): void {
		if (this.onEdit) {
			this.onEdit(this.blockIndex, newContent);
		}
		this.editing = false;
		this.exitEditMode();
	}

	private handleDelete(): void {
		if (this.onDelete) {
			this.onDelete(this.blockIndex);
		}
	}

	public getElement(): HTMLElement {
		return this.cardEl;
	}

	public getBlockIndex(): number {
		return this.blockIndex;
	}

	public setBlockIndex(index: number): void {
		this.blockIndex = index;
	}

	/**
	 * Update the block data and re-render only the content area
	 * This is used for partial updates without recreating the entire card
	 */
	public async updateBlock(newBlock: MarkdownBlock): Promise<void> {
		// Update block data
		this.block = newBlock;

		// Update checked state if it changed
		if (newBlock.checked !== undefined && newBlock.checked !== this.checked) {
			this.checked = newBlock.checked;

			// Update the header checkbox
			const checkboxEl = this.cardEl.querySelector('.memos-card-checkbox') as HTMLInputElement;
			if (checkboxEl) {
				checkboxEl.checked = this.checked;
			}

			// Update card visual state
			this.cardEl.toggleClass('memos-card-checked', this.checked);
		}

		// Re-render only the content area (not the header)
		if (!this.editing) {
			this.contentEl.empty();
			await this.renderBlockContent(this.contentEl);

			// Reapply collapsed state
			if (this.collapsed) {
				this.contentEl.addClass('collapsed');
			}
		}
	}

	public destroy(): void {
		// Destroy editor if exists
		if (this.editEditor) {
			this.editEditor.destroy();
			this.editEditor = null;
		}

		// Clean up render child if exists
		if (this.renderChild) {
			this.renderChild.unload();
			this.renderChild = null;
		}

		this.cardEl.remove();
	}
}
