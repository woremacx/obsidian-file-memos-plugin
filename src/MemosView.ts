import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import { MarkdownParser, BlockType, MarkdownBlock } from './MarkdownParser';
import { CardComponent, CardState } from './CardComponent';
import { formatTimestamp } from './utils';
import { EmbeddableMarkdownEditor } from './EmbeddableMarkdownEditor';
import { Logger } from './Logger';

export const VIEW_TYPE_MEMOS = 'memos-view';

interface ViewState {
	cardStates: { [key: number]: CardState };
}

export class MemosView extends ItemView {
	private cardComponents: CardComponent[] = [];
	private currentFile: TFile | null = null;
	private cardStates: { [key: number]: CardState } = {};
	private quickInputEditor: EmbeddableMarkdownEditor | null = null;
	private frontmatter: string = ''; // Store frontmatter to preserve it
	private frontmatterTitle: string = ''; // Store frontmatter title if exists
	private plugin: any; // Reference to plugin for accessing setSkipNextFileOpen
	private fileModifyHandler: any = null; // Handler for file modify events
	private editingBlockId: string | null = null; // ID of block currently being edited
	private isInternalModification: boolean = false; // Flag to track internal file modifications
	private isRendering: boolean = false; // Flag to prevent concurrent renders
	private autoSaveTimeout: number | null = null; // Timeout for auto-save debounce
	private draftBlockId: string | null = null; // Track the current draft block ID

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		// Get plugin instance from app
		this.plugin = (this.app as any).plugins.plugins['obsidian-file-memos'];
	}

	getViewType(): string {
		return VIEW_TYPE_MEMOS;
	}

	getDisplayText(): string {
		return 'Memos View';
	}

	getIcon(): string {
		return 'layout-grid';
	}

	async onOpen(): Promise<void> {
		Logger.debug('[MemosView.onOpen] Called');
		// onOpen is called when the view is first created
		// The actual file loading happens in setState
		Logger.debug('[MemosView.onOpen] Waiting for setState to be called with file path');
	}

	async setState(state: any, result: any): Promise<void> {
		Logger.debug('[MemosView.setState] Called with state:', state);
		Logger.debug('[MemosView.setState] Result param:', result);

		// Called when setViewState is used with a state object
		if (state && state.file) {
			Logger.debug('[MemosView.setState] State contains file path:', state.file);
			const file = this.app.vault.getAbstractFileByPath(state.file);
			Logger.debug('[MemosView.setState] File lookup result:', file != null ? file.path : 'null');

			if (file && file instanceof TFile) {
				Logger.debug('[MemosView.setState] File is TFile - calling renderMemosView');
				await this.renderMemosView(file);
				Logger.debug('[MemosView.setState] renderMemosView completed');
				return;
			} else {
				Logger.debug('[MemosView.setState] ERROR: File not found or not a TFile');
			}
		} else {
			Logger.debug('[MemosView.setState] No file in state - trying fallback');
		}

		// Fallback: try to get active file
		const activeFile = this.app.workspace.getActiveFile();
		Logger.debug('[MemosView.setState] Active file fallback:', activeFile?.path || 'none');

		if (activeFile && activeFile instanceof TFile) {
			Logger.debug('[MemosView.setState] Using active file fallback');
			await this.renderMemosView(activeFile);
		} else {
			Logger.debug('[MemosView.setState] No file to display - showing empty state');
			// No file to display
			const container = this.containerEl.children[1];
			container.empty();
			container.addClass('memos-view-container');
			const emptyEl = container.createEl('div', {
				cls: 'memos-empty-state',
				text: 'Open a file with #memos tag to view as cards'
			});
		}
	}

	getState(): any {
		const state = {
			file: this.currentFile?.path
		};
		Logger.debug('[MemosView.getState] Returning state:', state);
		return state;
	}

	async renderMemosView(file: TFile): Promise<void> {
		Logger.debug('[MemosView.renderMemosView] Called with file:', file.path);

		// Prevent concurrent renders
		if (this.isRendering) {
			Logger.debug('[MemosView.renderMemosView] Already rendering - skipping');
			return;
		}

		this.isRendering = true;

		try {
			const container = this.containerEl.children[1];
			container.empty();
			container.addClass('memos-view-container');
			Logger.debug('[MemosView.renderMemosView] Container prepared');

		// Clear previous card components
		this.cardComponents.forEach(card => card.destroy());
		this.cardComponents = [];
		Logger.debug('[MemosView.renderMemosView] Previous cards cleared');

		// Stop watching previous file if any
		this.stopWatchingFile();

		// Store current file
		this.currentFile = file;
		Logger.debug('[MemosView.renderMemosView] Current file stored:', this.currentFile.path);

		// Start watching current file for external changes
		this.startWatchingFile();

		// Load saved state
		await this.loadViewState();
		Logger.debug('[MemosView.renderMemosView] View state loaded');

		// Read file content
		const content = await this.app.vault.read(file);
		Logger.debug('[MemosView.renderMemosView] File content read, length:', content.length);

		// Extract and store frontmatter
		this.extractFrontmatter(content);

		// Create header
		const headerEl = container.createEl('div', { cls: 'memos-header' });

		// Determine title to display based on settings
		const displayTitle = (this.plugin?.settings?.useFrontmatterTitle && this.frontmatterTitle)
			? this.frontmatterTitle
			: file.basename;

		headerEl.createEl('h1', { text: displayTitle });

		// Create header actions container
		const actionsEl = headerEl.createEl('div', { cls: 'memos-header-actions' });

		// Add toggle view button
		const toggleViewBtn = actionsEl.createEl('button', {
			cls: 'memos-toggle-view-btn',
			text: 'Markdown View'
		});
		toggleViewBtn.addEventListener('click', async () => {
			if (this.currentFile) {
				// Set flag to skip next file-open event handler
				if (this.plugin && this.plugin.setSkipNextFileOpen) {
					this.plugin.setSkipNextFileOpen();
				}
				// Force open in markdown view, not memos view
				await this.leaf.setViewState({
					type: 'markdown',
					state: { file: this.currentFile.path },
					active: true
				});
			}
		});

		// Add new card button with timestamp
		const addCardBtn = actionsEl.createEl('button', {
			cls: 'memos-add-card-btn',
			text: '+ Add Card'
		});
		addCardBtn.addEventListener('click', () => {
			this.addNewCard();
		});

		// Add scroll to bottom button
		const scrollToBottomBtn = actionsEl.createEl('button', {
			cls: 'memos-scroll-to-bottom-btn',
			text: '↓ Bottom'
		});
		scrollToBottomBtn.addEventListener('click', () => {
			this.scrollToBottom();
		});

		// Create cards container
		const cardsContainer = container.createEl('div', { cls: 'memos-cards' });

		// Parse markdown into blocks
		const blocks = MarkdownParser.parse(content);

		// Create a card for each block (skip empty blocks)
		// Detect draft blocks but don't create cards for them
		let blockIndex = 0;
		let draftCardIndex: number | null = null;

		// Find draft block first
		const draftBlock = blocks.find(b => b.type !== BlockType.EMPTY && b.isDraft);
		if (draftBlock) {
			this.draftBlockId = draftBlock.id || null;
			Logger.debug('[MemosView.renderMemosView] Draft block detected, ID:', this.draftBlockId);
		}

		blocks.forEach((block, index) => {
			if (block.type === BlockType.EMPTY) {
				return; // Skip empty blocks
			}

			// Skip creating card for draft blocks
			if (block.isDraft) {
				draftCardIndex = blockIndex;
				blockIndex++;
				return;
			}

			// Initialize card state from markdown if collapsed state is present
			let cardState = this.cardStates[blockIndex];
			if (block.collapsed !== undefined) {
				// Prefer markdown-embedded collapsed state
				cardState = { collapsed: block.collapsed };
				this.cardStates[blockIndex] = cardState;
				Logger.debug('[MemosView.renderMemosView] Initialized collapsed state from markdown for block', blockIndex, ':', block.collapsed);
			} else if (!cardState) {
				// Default to not collapsed
				cardState = { collapsed: false };
			}

			const card = new CardComponent(
				cardsContainer,
				block,
				blockIndex,
				this.app,
				this, // Pass this view as Component
				file.path, // Pass file path for resolving embedded resources
				cardState,
				(idx, state) => this.onCardStateChange(idx, state),
				(idx, checked) => this.onCardCheckToggle(idx, checked),
				(idx) => this.onCardDelete(idx),
				(fromIdx, toIdx) => this.onCardReorder(fromIdx, toIdx),
				(idx, newContent) => this.onCardEdit(idx, newContent),
				(blockId) => this.onCardEditStart(blockId),
				() => this.onCardEditEnd()
			);
			this.cardComponents.push(card);
			blockIndex++;
		});

		// Create quick input container at bottom
		const quickInputContainer = container.createEl('div', {
			cls: 'memos-quick-input-container'
		});

		// Destroy previous editor if exists
		if (this.quickInputEditor) {
			this.quickInputEditor.destroy();
			this.quickInputEditor = null;
		}

		// Create embeddable markdown editor
		this.quickInputEditor = new EmbeddableMarkdownEditor(
			quickInputContainer,
			this, // Pass the view as Component for cleanup
			{
				app: this.app,
				placeholder: "What's on your mind?",
				onChange: (editor, value) => {
					this.handleQuickInputChange(value);
				}
			}
		);

		// Handle draft block: restore content to quick input editor after it's created
		if (draftBlock && this.quickInputEditor) {
			Logger.debug('[MemosView.renderMemosView] Restoring draft content to quick input');

			// Extract content (remove timestamp heading)
			const contentLines = draftBlock.content.split('\n\n');
			const contentWithoutHeading = contentLines.slice(1).join('\n\n');

			// Set editor value
			this.quickInputEditor.setValue(contentWithoutHeading);
		}

		// Create save button container below the input
		const quickInputActionsEl = container.createEl('div', {
			cls: 'memos-quick-input-actions'
		});

		const saveBtn = quickInputActionsEl.createEl('button', {
			cls: 'memos-quick-input-save-btn',
			text: 'Save'
		});
		saveBtn.addEventListener('click', () => {
			this.handleQuickInput();
		});

			// Add info note
			const noteEl = container.createEl('div', {
				cls: 'memos-note',
				text: `Memos View: Displaying ${this.cardComponents.length} cards.`
			});
		} finally {
			this.isRendering = false;
		}
	}

	private generateBlockId(): string {
		// Generate a unique block ID using timestamp and random string
		const timestamp = Date.now().toString(36);
		const random = Math.random().toString(36).substring(2, 7);
		return `${timestamp}-${random}`;
	}

	/**
	 * Adjust heading levels in draft content to prevent H1/H2 from breaking draft block parsing
	 * Finds the minimum heading level and shifts all headings so the minimum becomes H3
	 * Headings that would exceed H6 (level 7+) are converted to plain text
	 */
	private adjustHeadingLevelsInDraft(content: string): string {
		const lines = content.split('\n');

		// Step 1: Find minimum heading level in content
		let minLevel = 7; // Initialize to value beyond valid range (H1-H6 = 1-6)
		for (const line of lines) {
			const match = line.match(/^(#{1,6})\s/);
			if (match) {
				const level = match[1].length;
				minLevel = Math.min(minLevel, level);
			}
		}

		// Step 2: Calculate shift amount (to make minimum level = H3)
		const shift = Math.max(0, 3 - minLevel);

		// If no shift needed, return original content
		if (shift === 0) {
			return content;
		}

		Logger.debug('[MemosView.adjustHeadingLevelsInDraft] Min level:', minLevel, 'Shift:', shift);

		// Step 3: Apply shift to all headings
		return lines.map(line => {
			const match = line.match(/^(#{1,6})(\s.*)$/);
			if (match) {
				const currentLevel = match[1].length;
				const newLevel = currentLevel + shift;
				const rest = match[2];

				// If new level exceeds H6, convert to plain text
				if (newLevel > 6) {
					Logger.debug('[MemosView.adjustHeadingLevelsInDraft] Heading out of range, converting to text:', line);
					return rest.trim(); // Remove heading markers
				}

				return '#'.repeat(newLevel) + rest;
			}
			return line;
		}).join('\n');
	}

	private handleQuickInputChange(value: string): void {
		// Clear existing timeout
		if (this.autoSaveTimeout !== null) {
			window.clearTimeout(this.autoSaveTimeout);
		}

		// If empty, delete draft block if exists
		if (!value.trim()) {
			if (this.draftBlockId) {
				Logger.debug('[MemosView.handleQuickInputChange] Empty input, will delete draft block');
				this.autoSaveTimeout = window.setTimeout(() => {
					this.deleteDraftBlock(this.draftBlockId!);
					this.draftBlockId = null;
				}, 1000);
			}
			return;
		}

		// Debounce: save after 1 second of no typing
		this.autoSaveTimeout = window.setTimeout(() => {
			this.autoSaveDraft(value);
		}, 1000);
	}

	private async autoSaveDraft(content: string): Promise<void> {
		if (!this.currentFile) return;

		Logger.debug('[MemosView.autoSaveDraft] Auto-saving draft');

		// Read current file content
		const currentContent = await this.app.vault.read(this.currentFile);
		const blocks = MarkdownParser.parse(currentContent);
		const nonEmptyBlocks = blocks.filter(b => b.type !== BlockType.EMPTY);

		// Check if draft block already exists
		const existingDraftIndex = nonEmptyBlocks.findIndex(b => b.id === this.draftBlockId);

		if (existingDraftIndex >= 0) {
			// Update existing draft block
			Logger.debug('[MemosView.autoSaveDraft] Updating existing draft block:', this.draftBlockId);
			const existingBlock = nonEmptyBlocks[existingDraftIndex];

			// Before saving, adjust heading levels in draft content
			content = this.adjustHeadingLevelsInDraft(content);

			// Parse the new content
			const timestamp = formatTimestamp(new Date(), 'YYYY-MM-DD HH:mm');
			const newBlock = MarkdownParser.parse(`## ${timestamp}\n\n${content}`)[0];

			if (newBlock) {
				// Preserve block ID and draft flag
				newBlock.id = existingBlock.id;
				newBlock.isDraft = true;
				newBlock.checked = existingBlock.checked;

				// Update the block
				nonEmptyBlocks[existingDraftIndex] = newBlock;

				// Reconstruct and save
				const newContent = this.reconstructMarkdown(nonEmptyBlocks);
				this.isInternalModification = true;
				await this.app.vault.modify(this.currentFile, newContent);
			}
		} else {
			// Create new draft block
			Logger.debug('[MemosView.autoSaveDraft] Creating new draft block');
			const timestamp = formatTimestamp(new Date(), 'YYYY-MM-DD HH:mm');
			const blockId = this.generateBlockId();

			// Store the block ID
			this.draftBlockId = blockId;

			// Before saving, adjust heading levels in draft content
			content = this.adjustHeadingLevelsInDraft(content);

			let fileContent = await this.app.vault.read(this.currentFile);
			if (fileContent && !fileContent.endsWith('\n')) {
				fileContent += '\n';
			}

			const newBlockMarkdown = `\n## ${timestamp} ^${blockId} %%quickadd-draft%%\n\n${content}\n`;
			this.isInternalModification = true;
			await this.app.vault.modify(this.currentFile, fileContent + newBlockMarkdown);
		}
	}

	private async deleteDraftBlock(blockId: string): Promise<void> {
		if (!this.currentFile) return;

		Logger.debug('[MemosView.deleteDraftBlock] Deleting draft block:', blockId);

		// Read current file content
		const currentContent = await this.app.vault.read(this.currentFile);
		const blocks = MarkdownParser.parse(currentContent);
		const nonEmptyBlocks = blocks.filter(b => b.type !== BlockType.EMPTY);

		// Find and remove the draft block
		const updatedBlocks = nonEmptyBlocks.filter(b => b.id !== blockId);

		if (updatedBlocks.length < nonEmptyBlocks.length) {
			// Reconstruct and save
			const newContent = this.reconstructMarkdown(updatedBlocks);
			this.isInternalModification = true;
			await this.app.vault.modify(this.currentFile, newContent);
		}
	}

	private scrollToBottom(): void {
		// Scroll to the bottom of the view
		const container = this.containerEl.children[1] as HTMLElement;
		if (container) {
			container.scrollTo({
				top: container.scrollHeight,
				behavior: 'smooth'
			});
		}
	}

	private async addNewCard(): Promise<void> {
		if (!this.currentFile) return;

		const timestamp = formatTimestamp(new Date(), 'YYYY-MM-DD HH:mm');
		const blockId = this.generateBlockId();
		let currentContent = await this.app.vault.read(this.currentFile);

		// Ensure current content ends with newline before appending
		if (currentContent && !currentContent.endsWith('\n')) {
			currentContent += '\n';
		}

		const newContent = `\n## ${timestamp} ^${blockId}\n\n`;
		await this.app.vault.modify(this.currentFile, currentContent + newContent);

		// Reload view
		await this.renderMemosView(this.currentFile);
	}

	private async handleQuickInput(): Promise<void> {
		if (!this.currentFile || !this.quickInputEditor) return;

		let content = this.quickInputEditor.getValue().trim();
		if (!content) return; // Prevent empty submission

		// Clear auto-save timeout
		if (this.autoSaveTimeout !== null) {
			window.clearTimeout(this.autoSaveTimeout);
			this.autoSaveTimeout = null;
		}

		// Read current file content
		const currentContent = await this.app.vault.read(this.currentFile);
		const blocks = MarkdownParser.parse(currentContent);
		const nonEmptyBlocks = blocks.filter(b => b.type !== BlockType.EMPTY);

		// If draft block exists, remove it (we'll create a confirmed block)
		let updatedBlocks = nonEmptyBlocks;
		if (this.draftBlockId) {
			updatedBlocks = nonEmptyBlocks.filter(b => b.id !== this.draftBlockId);
			Logger.debug('[MemosView.handleQuickInput] Removing draft block:', this.draftBlockId);
		}

		// Before saving, adjust heading levels in content
		content = this.adjustHeadingLevelsInDraft(content);

		// Generate timestamp and block ID for confirmed block
		const timestamp = formatTimestamp(new Date(), 'YYYY-MM-DD HH:mm');
		const blockId = this.generateBlockId();

		// Parse new confirmed block (without draft flag)
		const newBlock = MarkdownParser.parse(`## ${timestamp} ^${blockId}\n\n${content}`)[0];
		if (newBlock) {
			newBlock.id = blockId;
			updatedBlocks.push(newBlock);

			// Reconstruct and save
			const newContent = this.reconstructMarkdown(updatedBlocks);
			this.isInternalModification = true;
			await this.app.vault.modify(this.currentFile, newContent);
		}

		// Clear draft block ID
		this.draftBlockId = null;

		// Clear input
		this.quickInputEditor.clear();

		// Add card component without full reload
		if (newBlock) {
			const blockIndex = this.cardComponents.length;
			const cardsContainer = this.containerEl.querySelector('.memos-cards');

			if (cardsContainer) {
				const card = new CardComponent(
					cardsContainer as HTMLElement,
					newBlock,
					blockIndex,
					this.app,
					this,
					this.currentFile.path,
					undefined,
					(idx, state) => this.onCardStateChange(idx, state),
					(idx, checked) => this.onCardCheckToggle(idx, checked),
					(idx) => this.onCardDelete(idx),
					(fromIdx, toIdx) => this.onCardReorder(fromIdx, toIdx),
					(idx, newContent) => this.onCardEdit(idx, newContent),
					(blockId) => this.onCardEditStart(blockId),
					() => this.onCardEditEnd()
				);
				this.cardComponents.push(card);
			}
		}
	}


	private async onCardStateChange(blockIndex: number, state: CardState): Promise<void> {
		// Save collapsed state to both markdown and localStorage
		this.cardStates[blockIndex] = state;
		this.saveViewState();

		// Update collapsed state in markdown file
		if (!this.currentFile) return;

		// Read current file content
		const content = await this.app.vault.read(this.currentFile);
		const blocks = MarkdownParser.parse(content);

		// Filter out empty blocks
		const nonEmptyBlocks = blocks.filter(b => b.type !== BlockType.EMPTY);
		if (blockIndex >= nonEmptyBlocks.length) return;

		// Update the collapsed state of the block
		const block = nonEmptyBlocks[blockIndex];
		if (block.type === BlockType.HEADING && block.level === 2) {
			block.collapsed = state.collapsed;

			// Reconstruct and save
			const newContent = this.reconstructMarkdown(nonEmptyBlocks);

			// Set flag to prevent reload on file change
			this.isInternalModification = true;

			await this.app.vault.modify(this.currentFile, newContent);
		}
	}

	private async onCardCheckToggle(blockIndex: number, checked: boolean): Promise<void> {
		// Update checkbox state in markdown file
		if (!this.currentFile) return;

		// Read current file content
		const content = await this.app.vault.read(this.currentFile);
		const blocks = MarkdownParser.parse(content);

		// Filter out empty blocks
		const nonEmptyBlocks = blocks.filter(b => b.type !== BlockType.EMPTY);
		if (blockIndex >= nonEmptyBlocks.length) return;

		// Update the checked state of the block
		const block = nonEmptyBlocks[blockIndex];
		if (block.type === BlockType.HEADING && block.level === 2) {
			block.checked = checked;

			// Reconstruct and save
			const newContent = this.reconstructMarkdown(nonEmptyBlocks);

			// Set flag to prevent reload on file change
			this.isInternalModification = true;

			await this.app.vault.modify(this.currentFile, newContent);
		}
	}

	private async onCardDelete(blockIndex: number): Promise<void> {
		if (!this.currentFile) return;

		// Show confirmation dialog
		const confirmDelete = await this.showDeleteConfirmation();
		if (!confirmDelete) return;

		// Read current file content
		const content = await this.app.vault.read(this.currentFile);
		const blocks = MarkdownParser.parse(content);

		// Filter out empty blocks and get the target block
		const nonEmptyBlocks = blocks.filter(b => b.type !== BlockType.EMPTY);
		if (blockIndex >= nonEmptyBlocks.length) return;

		// Find the position of the block to delete in the original content
		const blockToDelete = nonEmptyBlocks[blockIndex];

		// Remove the block and reconstruct the content
		const updatedBlocks = nonEmptyBlocks.filter((_, idx) => idx !== blockIndex);
		const newContent = this.reconstructMarkdown(updatedBlocks);

		// Update the file
		await this.app.vault.modify(this.currentFile, newContent);

		// Remove card state
		delete this.cardStates[blockIndex];

		// Reindex remaining card states
		const newCardStates: { [key: number]: CardState } = {};
		Object.keys(this.cardStates).forEach(key => {
			const idx = parseInt(key);
			if (idx > blockIndex) {
				newCardStates[idx - 1] = this.cardStates[idx];
			} else if (idx < blockIndex) {
				newCardStates[idx] = this.cardStates[idx];
			}
		});
		this.cardStates = newCardStates;
		this.saveViewState();

		// Reload view
		await this.renderMemosView(this.currentFile);
	}

	private async onCardReorder(fromIndex: number, toIndex: number): Promise<void> {
		if (!this.currentFile) return;
		if (fromIndex === toIndex) return;

		Logger.debug('[MemosView.onCardReorder] Reordering:', fromIndex, '->', toIndex);

		// Read current file content
		const content = await this.app.vault.read(this.currentFile);
		const blocks = MarkdownParser.parse(content);

		// Filter out empty blocks
		const nonEmptyBlocks = blocks.filter(b => b.type !== BlockType.EMPTY);

		// Reorder blocks
		const reorderedBlocks = [...nonEmptyBlocks];
		const [movedBlock] = reorderedBlocks.splice(fromIndex, 1);
		reorderedBlocks.splice(toIndex, 0, movedBlock);

		// Reconstruct markdown
		const newContent = this.reconstructMarkdown(reorderedBlocks);

		// Set flag to prevent reload on file change
		this.isInternalModification = true;

		// Update the file
		await this.app.vault.modify(this.currentFile, newContent);

		// Reorder card components and update DOM without full reload
		const movedCard = this.cardComponents[fromIndex];
		this.cardComponents.splice(fromIndex, 1);
		this.cardComponents.splice(toIndex, 0, movedCard);

		// Update block indices for all cards
		this.cardComponents.forEach((card, newIndex) => {
			card.setBlockIndex(newIndex);
		});

		// Reorder DOM elements
		const cardsContainer = this.containerEl.querySelector('.memos-cards');
		if (cardsContainer && movedCard) {
			const movedElement = movedCard.getElement();

			if (toIndex === 0) {
				// Move to first position
				cardsContainer.prepend(movedElement);
			} else if (toIndex >= this.cardComponents.length - 1) {
				// Move to last position
				cardsContainer.append(movedElement);
			} else {
				// Insert before the card that's now at toIndex + 1
				const referenceCard = this.cardComponents[toIndex + 1];
				const referenceElement = referenceCard.getElement();
				cardsContainer.insertBefore(movedElement, referenceElement);
			}
		}

		// Reorder card states
		const newCardStates: { [key: number]: CardState } = {};
		Object.keys(this.cardStates).forEach(key => {
			const idx = parseInt(key);
			let newIdx = idx;

			if (idx === fromIndex) {
				newIdx = toIndex;
			} else if (fromIndex < toIndex) {
				if (idx > fromIndex && idx <= toIndex) {
					newIdx = idx - 1;
				}
			} else {
				if (idx >= toIndex && idx < fromIndex) {
					newIdx = idx + 1;
				}
			}

			newCardStates[newIdx] = this.cardStates[idx];
		});
		this.cardStates = newCardStates;
		this.saveViewState();

		Logger.debug('[MemosView.onCardReorder] Reorder complete without full reload');
	}

	private async onCardEdit(blockIndex: number, newContent: string): Promise<void> {
		if (!this.currentFile) return;

		// Read current file content
		const content = await this.app.vault.read(this.currentFile);
		const blocks = MarkdownParser.parse(content);

		// Filter out empty blocks
		const nonEmptyBlocks = blocks.filter(b => b.type !== BlockType.EMPTY);
		if (blockIndex >= nonEmptyBlocks.length) return;

		// Get the existing block to preserve ID and checked state
		const existingBlock = nonEmptyBlocks[blockIndex];

		// Parse the new content
		const newBlock = MarkdownParser.parse(newContent)[0];

		if (newBlock) {
			// Preserve the original block ID and checked state
			newBlock.id = existingBlock.id;
			newBlock.checked = existingBlock.checked;

			// Remove draft flag when editing is confirmed
			if (existingBlock.isDraft) {
				Logger.debug('[MemosView.onCardEdit] Removing draft flag from block');
				newBlock.isDraft = undefined;
			}

			// Update the block
			nonEmptyBlocks[blockIndex] = newBlock;
		}

		// Reconstruct markdown
		const updatedContent = this.reconstructMarkdown(nonEmptyBlocks);

		// Set flag to prevent reload on file change
		this.isInternalModification = true;

		// Update the file
		await this.app.vault.modify(this.currentFile, updatedContent);

		// Update only the affected card component without full reload
		const cardComponent = this.cardComponents[blockIndex];
		if (cardComponent && newBlock) {
			await cardComponent.updateBlock(newBlock);
		}
	}

	private async showDeleteConfirmation(): Promise<boolean> {
		return new Promise((resolve) => {
			const modal = document.createElement('div');
			modal.className = 'memos-confirm-modal';
			modal.innerHTML = `
				<div class="memos-confirm-content">
					<h3>Delete Card</h3>
					<p>Are you sure you want to delete this card? This action cannot be undone.</p>
					<div class="memos-confirm-buttons">
						<button class="memos-confirm-cancel">Cancel</button>
						<button class="memos-confirm-delete">Delete</button>
					</div>
				</div>
			`;

			document.body.appendChild(modal);

			const cancelBtn = modal.querySelector('.memos-confirm-cancel') as HTMLButtonElement;
			const deleteBtn = modal.querySelector('.memos-confirm-delete') as HTMLButtonElement;

			cancelBtn.addEventListener('click', () => {
				modal.remove();
				resolve(false);
			});

			deleteBtn.addEventListener('click', () => {
				modal.remove();
				resolve(true);
			});

			// Close on backdrop click
			modal.addEventListener('click', (e) => {
				if (e.target === modal) {
					modal.remove();
					resolve(false);
				}
			});
		});
	}

	/**
	 * Extract frontmatter from content and store it
	 */
	private extractFrontmatter(content: string): void {
		const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
		const match = content.match(frontmatterRegex);

		if (match) {
			this.frontmatter = match[0]; // Store the entire frontmatter block including delimiters
			Logger.debug('[MemosView.extractFrontmatter] Frontmatter extracted:', this.frontmatter.substring(0, 100));

			// Extract title from frontmatter
			const frontmatterBody = match[1];
			const titleMatch = frontmatterBody.match(/^title:\s*(.+)$/m);
			if (titleMatch) {
				this.frontmatterTitle = titleMatch[1].trim();
				Logger.debug('[MemosView.extractFrontmatter] Title extracted:', this.frontmatterTitle);
			} else {
				this.frontmatterTitle = '';
				Logger.debug('[MemosView.extractFrontmatter] No title field found');
			}
		} else {
			this.frontmatter = '';
			this.frontmatterTitle = '';
			Logger.debug('[MemosView.extractFrontmatter] No frontmatter found');
		}
	}

	/**
	 * Reconstruct markdown from blocks, preserving frontmatter
	 */
	private reconstructMarkdown(blocks: MarkdownBlock[]): string {
		const body = blocks.map(block => {
			switch (block.type) {
				case BlockType.HEADING:
					const level = block.level || 1;
					const hashes = '#'.repeat(level);

					// For H2 headings
					if (level === 2) {
						// Ensure block has an ID, generate if missing
						if (!block.id) {
							block.id = this.generateBlockId();
						}

						// Split content into heading text and body content
						// block.content format: "heading text\n\nbody content" or just "heading text"
						const parts = block.content.split('\n\n');
						const headingText = parts[0];
						const bodyContent = parts.slice(1).join('\n\n');

						// Build heading line with checkbox, block ID, and draft flag
						let headingParts = [hashes];

						if (block.checked !== undefined) {
							const checkbox = block.checked ? '[x]' : '[ ]';
							headingParts.push(checkbox);
						}

						headingParts.push(headingText);
						headingParts.push(`^${block.id}`);

						// Add collapsed state if present
						if (block.collapsed !== undefined) {
							headingParts.push(`[collapsed:: ${block.collapsed}]`);
						}

						// Add draft flag if present
						if (block.isDraft) {
							headingParts.push('%%quickadd-draft%%');
						}

						const headingLine = headingParts.join(' ');

						// Return heading + body (if exists)
						return bodyContent ? `${headingLine}\n\n${bodyContent}` : headingLine;
					}

					return `${hashes} ${block.content}`;

				case BlockType.CODE_BLOCK:
					const lang = block.language || '';
					return `\`\`\`${lang}\n${block.content}\n\`\`\``;

				case BlockType.LIST:
					return block.content;

				case BlockType.BLOCKQUOTE:
					return block.content.split('\n').map(line => `> ${line}`).join('\n');

				case BlockType.DIVIDER:
					return '---';

				case BlockType.PARAGRAPH:
				default:
					return block.content;
			}
		}).join('\n\n');

		// Prepend frontmatter if it exists and ensure trailing newline
		let result = this.frontmatter ? this.frontmatter + body : body;

		// Ensure file ends with a newline
		if (result && !result.endsWith('\n')) {
			result += '\n';
		}

		return result;
	}

	private async loadViewState(): Promise<void> {
		Logger.debug('[MemosView.loadViewState] Called');
		if (!this.currentFile) {
			Logger.debug('[MemosView.loadViewState] No current file - skipping');
			return;
		}

		const stateKey = `memos-state-${this.currentFile.path}`;
		Logger.debug('[MemosView.loadViewState] State key:', stateKey);
		const savedState = localStorage.getItem(stateKey);

		if (savedState) {
			Logger.debug('[MemosView.loadViewState] Found saved state:', savedState);
			try {
				const viewState: ViewState = JSON.parse(savedState);
				this.cardStates = viewState.cardStates || {};
				Logger.debug('[MemosView.loadViewState] Loaded card states:', Object.keys(this.cardStates).length);
			} catch (e) {
				Logger.error('[MemosView.loadViewState] Failed to load view state:', e);
				this.cardStates = {};
			}
		} else {
			Logger.debug('[MemosView.loadViewState] No saved state found');
		}
	}

	private saveViewState(): void {
		Logger.debug('[MemosView.saveViewState] Called');
		if (!this.currentFile) {
			Logger.debug('[MemosView.saveViewState] No current file - skipping');
			return;
		}

		const stateKey = `memos-state-${this.currentFile.path}`;
		const viewState: ViewState = {
			cardStates: this.cardStates
		};

		Logger.debug('[MemosView.saveViewState] Saving state with key:', stateKey);
		Logger.debug('[MemosView.saveViewState] Card states count:', Object.keys(this.cardStates).length);
		localStorage.setItem(stateKey, JSON.stringify(viewState));
	}

	async onClose(): Promise<void> {
		Logger.debug('[MemosView.onClose] Called');

		// Clear auto-save timeout
		if (this.autoSaveTimeout !== null) {
			window.clearTimeout(this.autoSaveTimeout);
			this.autoSaveTimeout = null;
		}

		// Destroy editor if it exists
		if (this.quickInputEditor) {
			this.quickInputEditor.destroy();
			this.quickInputEditor = null;
		}

		// Stop watching file
		this.stopWatchingFile();
		// Cleanup card components
		this.cardComponents.forEach(card => card.destroy());
		this.cardComponents = [];
		Logger.debug('[MemosView.onClose] Cleanup complete');
	}

	/**
	 * Start watching the current file for external changes
	 */
	private startWatchingFile(): void {
		if (!this.currentFile) return;

		Logger.debug('[MemosView.startWatchingFile] Starting file watch for:', this.currentFile.path);

		this.fileModifyHandler = this.app.vault.on('modify', (file) => {
			if (file === this.currentFile) {
				Logger.debug('[MemosView] File modified externally:', file.path);
				this.handleExternalFileChange();
			}
		});
	}

	/**
	 * Stop watching the current file
	 */
	private stopWatchingFile(): void {
		if (this.fileModifyHandler) {
			Logger.debug('[MemosView.stopWatchingFile] Stopping file watch');
			this.app.vault.offref(this.fileModifyHandler);
			this.fileModifyHandler = null;
		}
	}

	/**
	 * Handle external file changes
	 * Reload the view unless user is actively editing or if it's an internal modification
	 */
	private async handleExternalFileChange(): Promise<void> {
		// Skip if this is an internal modification
		if (this.isInternalModification) {
			Logger.debug('[MemosView.handleExternalFileChange] Skipping reload - internal modification');
			this.isInternalModification = false;
			return;
		}

		// Check if quick input has content
		const hasQuickInputContent = this.quickInputEditor && this.quickInputEditor.getValue().trim().length > 0;

		// If editing a card or quick input has content, skip reload
		if (this.editingBlockId || hasQuickInputContent) {
			Logger.debug('[MemosView.handleExternalFileChange] Skipping reload - editing in progress', {
				editingBlockId: this.editingBlockId,
				hasQuickInputContent: hasQuickInputContent
			});
			return;
		}

		Logger.debug('[MemosView.handleExternalFileChange] Reloading view due to external change');

		// Reload the view
		if (this.currentFile) {
			await this.renderMemosView(this.currentFile);
		}
	}

	/**
	 * Called when a card enters edit mode
	 */
	private onCardEditStart(blockId: string | undefined): void {
		this.editingBlockId = blockId || null;
		Logger.debug('[MemosView.onCardEditStart] Edit started for block:', blockId);
	}

	/**
	 * Called when a card exits edit mode
	 */
	private onCardEditEnd(): void {
		Logger.debug('[MemosView.onCardEditEnd] Edit ended for block:', this.editingBlockId);
		this.editingBlockId = null;
	}
}
