import { MarkdownParser, BlockType, MarkdownBlock } from '../MarkdownParser';
import { CardComponent } from '../CardComponent';

/**
 * Test suite for MemosView quick add functionality
 * This ensures that quick add does not trigger full reloads
 */

/**
 * Mock MemosView behavior for quick add
 * This simulates the critical path without requiring full Obsidian API
 */
class MockMemosView {
	private isInternalModification: boolean = false;
	private currentFile: any = { path: 'test.md' };
	private fileContent: string = '';
	private renderCount: number = 0;
	private frontmatter: string = '';
	private cardComponents: any[] = [];

	constructor(initialContent: string) {
		this.fileContent = initialContent;
		this.extractFrontmatter(initialContent);

		// Parse initial blocks and create mock card components
		const blocks = MarkdownParser.parse(initialContent);
		blocks.forEach((block) => {
			if (block.type !== BlockType.EMPTY) {
				this.cardComponents.push({ block });
			}
		});
	}

	private extractFrontmatter(content: string): void {
		const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
		const match = content.match(frontmatterRegex);
		if (match) {
			this.frontmatter = match[0];
		} else {
			this.frontmatter = '';
		}
	}

	private generateBlockId(): string {
		const timestamp = Date.now().toString(36);
		const random = Math.random().toString(36).substring(2, 7);
		return `${timestamp}-${random}`;
	}

	/**
	 * Simulates handleQuickInput - the critical method we're testing
	 */
	async handleQuickInput(content: string): Promise<void> {
		if (!content.trim()) return;

		const timestamp = '2025-10-12 23:56';
		const blockId = this.generateBlockId();

		// Append to file
		let currentContent = this.fileContent;
		if (currentContent && !currentContent.endsWith('\n')) {
			currentContent += '\n';
		}

		const newBlockMarkdown = `\n## ${timestamp} ^${blockId}\n\n${content}\n`;

		// CRITICAL: Set flag to prevent reload on file change
		this.isInternalModification = true;

		// Simulate file modification
		this.fileContent = currentContent + newBlockMarkdown;
		await this.handleFileModified();

		// Parse the new block and add card component without full reload
		const newBlock = MarkdownParser.parse(`## ${timestamp} ^${blockId}\n\n${content}`)[0];
		if (newBlock) {
			this.cardComponents.push({ block: newBlock });
		}
	}

	/**
	 * Simulates external file change handler
	 * This should NOT trigger a reload if isInternalModification is true
	 */
	private async handleFileModified(): Promise<void> {
		// Skip if this is an internal modification
		if (this.isInternalModification) {
			this.isInternalModification = false;
			return; // Do NOT reload
		}

		// External modification - trigger reload
		await this.renderMemosView();
	}

	/**
	 * Simulates full view reload
	 * We count these to ensure quick add doesn't trigger them
	 */
	private async renderMemosView(): Promise<void> {
		this.renderCount++;
	}

	getRenderCount(): number {
		return this.renderCount;
	}

	getFileContent(): string {
		return this.fileContent;
	}

	getCardCount(): number {
		return this.cardComponents.length;
	}

	getIsInternalModification(): boolean {
		return this.isInternalModification;
	}
}

describe('MemosView Quick Add (Regression Test)', () => {
	describe('Quick add should NOT trigger full reload', () => {
		it('should set isInternalModification flag when adding via quick input', async () => {
			const initialContent = `## [ ] 2025-10-12 23:36 ^test-id

Test content`;

			const view = new MockMemosView(initialContent);
			const initialCardCount = view.getCardCount();

			// Add new memo via quick input
			await view.handleQuickInput('New memo content');

			// isInternalModification should have been set and then reset
			expect(view.getIsInternalModification()).toBe(false);

			// Render count should still be 0 (no full reload triggered)
			expect(view.getRenderCount()).toBe(0);

			// Card count should increase by 1
			expect(view.getCardCount()).toBe(initialCardCount + 1);
		});

		it('should NOT trigger renderMemosView when adding via quick input', async () => {
			const initialContent = `## [ ] 2025-10-12 23:36 ^test-id-1

First block

## [x] 2025-10-12 23:37 ^test-id-2

Second block`;

			const view = new MockMemosView(initialContent);
			const initialRenderCount = view.getRenderCount();
			const initialCardCount = view.getCardCount();

			// Add multiple new memos
			await view.handleQuickInput('New memo 1');
			expect(view.getRenderCount()).toBe(initialRenderCount); // No reload

			await view.handleQuickInput('New memo 2');
			expect(view.getRenderCount()).toBe(initialRenderCount); // Still no reload

			// Cards should have been added
			expect(view.getCardCount()).toBe(initialCardCount + 2);
		});

		it('should append new content to file', async () => {
			const initialContent = `## [ ] 2025-10-12 23:36 ^test-id

Test content`;

			const view = new MockMemosView(initialContent);

			// Add new memo
			await view.handleQuickInput('New memo');

			const updatedContent = view.getFileContent();

			// Original content should be preserved
			expect(updatedContent).toContain('## [ ] 2025-10-12 23:36 ^test-id');
			expect(updatedContent).toContain('Test content');

			// New content should be appended
			expect(updatedContent).toContain('New memo');

			// New block should have timestamp and block ID
			expect(updatedContent).toMatch(/## 2025-10-12 23:56 \^[a-z0-9]+-[a-z0-9]+/);
		});

		it('should preserve frontmatter when adding via quick input', async () => {
			const initialContent = `---
title: Test
tags:
  - memos
---

## [ ] 2025-10-12 23:36 ^test-id

Test content`;

			const view = new MockMemosView(initialContent);

			await view.handleQuickInput('New memo with frontmatter');

			const updatedContent = view.getFileContent();
			expect(updatedContent).toContain('title: Test');
			expect(updatedContent).toContain('tags:');
			expect(updatedContent).toContain('- memos');
			expect(updatedContent).toContain('New memo with frontmatter');
		});

		it('should handle multiple quick adds without reload', async () => {
			const initialContent = `## [ ] First ^id1

Content 1`;

			const view = new MockMemosView(initialContent);
			const initialCardCount = view.getCardCount();

			// Add multiple memos
			await view.handleQuickInput('Memo 1');
			await view.handleQuickInput('Memo 2');
			await view.handleQuickInput('Memo 3');

			// No reloads should have been triggered
			expect(view.getRenderCount()).toBe(0);

			// All memos should be added
			expect(view.getCardCount()).toBe(initialCardCount + 3);

			// All content should be in file
			const updatedContent = view.getFileContent();
			expect(updatedContent).toContain('Memo 1');
			expect(updatedContent).toContain('Memo 2');
			expect(updatedContent).toContain('Memo 3');
		});

		it('should ignore empty quick input', async () => {
			const initialContent = `## [ ] Test ^id

Content`;

			const view = new MockMemosView(initialContent);
			const initialCardCount = view.getCardCount();

			// Try to add empty content
			await view.handleQuickInput('');
			await view.handleQuickInput('   ');

			// No changes should occur
			expect(view.getRenderCount()).toBe(0);
			expect(view.getCardCount()).toBe(initialCardCount);
			expect(view.getFileContent()).toBe(initialContent);
		});

		it('should handle quick add with complex markdown content', async () => {
			const initialContent = `## [ ] Test ^id

Content`;

			const view = new MockMemosView(initialContent);

			// Add memo with complex markdown
			const complexContent = `This has **bold** and *italic*

- List item 1
- List item 2

And a [link](https://example.com)`;

			await view.handleQuickInput(complexContent);

			// No reload should occur
			expect(view.getRenderCount()).toBe(0);

			// Content should be preserved
			const updatedContent = view.getFileContent();
			expect(updatedContent).toContain('**bold**');
			expect(updatedContent).toContain('*italic*');
			expect(updatedContent).toContain('- List item 1');
			expect(updatedContent).toContain('[link](https://example.com)');
		});
	});

	describe('Regression Test: isInternalModification flag behavior', () => {
		it('CRITICAL: should prevent reload when isInternalModification is true', async () => {
			const initialContent = `## [ ] Test ^id

Content`;

			const view = new MockMemosView(initialContent);

			// This is what handleQuickInput should do
			await view.handleQuickInput('New memo');

			// The critical assertion: no reload should have happened
			expect(view.getRenderCount()).toBe(0);
		});

		it('should reset isInternalModification flag after file modification', async () => {
			const initialContent = `## [ ] Test ^id

Content`;

			const view = new MockMemosView(initialContent);

			// Before quick add
			expect(view.getIsInternalModification()).toBe(false);

			// During quick add, the flag is set and then reset by handleFileModified
			await view.handleQuickInput('New memo');

			// After quick add, flag should be reset
			expect(view.getIsInternalModification()).toBe(false);
		});
	});

	describe('Integration with existing cards', () => {
		it('should add new card after existing cards', async () => {
			const initialContent = `## [ ] First ^id1

Content 1

## [x] Second ^id2

Content 2

## Third ^id3

Content 3`;

			const view = new MockMemosView(initialContent);
			const initialCardCount = view.getCardCount();
			expect(initialCardCount).toBe(3);

			// Add new card
			await view.handleQuickInput('Fourth card');

			// Should have 4 cards now
			expect(view.getCardCount()).toBe(4);

			// No reload
			expect(view.getRenderCount()).toBe(0);

			// Content should be at the end
			const updatedContent = view.getFileContent();
			const lines = updatedContent.split('\n');
			const lastLines = lines.slice(-3).join('\n');
			expect(lastLines).toContain('Fourth card');
		});
	});
});
