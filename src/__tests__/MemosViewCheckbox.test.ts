import { MarkdownParser, BlockType, MarkdownBlock } from '../MarkdownParser';

/**
 * Test suite for MemosView checkbox toggle functionality
 * This ensures that checkbox toggling does not trigger full reloads
 */

/**
 * Mock MemosView behavior for checkbox toggle
 * This simulates the critical path without requiring full Obsidian API
 */
class MockMemosView {
  private isInternalModification: boolean = false;
  private currentFile: any = { path: 'test.md' };
  private fileContent: string = '';
  private renderCount: number = 0;
  private frontmatter: string = '';

  constructor(initialContent: string) {
    this.fileContent = initialContent;
    this.extractFrontmatter(initialContent);
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

  private reconstructMarkdown(blocks: MarkdownBlock[]): string {
    const body = blocks.map(block => {
      switch (block.type) {
        case BlockType.HEADING:
          const level = block.level || 1;
          const hashes = '#'.repeat(level);

          if (level === 2) {
            if (!block.id) {
              block.id = this.generateBlockId();
            }

            const parts = block.content.split('\n\n');
            const headingText = parts[0];
            const bodyContent = parts.slice(1).join('\n\n');

            let headingParts = [hashes];

            if (block.checked !== undefined) {
              const checkbox = block.checked ? '[x]' : '[ ]';
              headingParts.push(checkbox);
            }

            headingParts.push(headingText);
            headingParts.push(`^${block.id}`);

            const headingLine = headingParts.join(' ');

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

    let result = this.frontmatter ? this.frontmatter + body : body;

    if (result && !result.endsWith('\n')) {
      result += '\n';
    }

    return result;
  }

  /**
   * Simulates checkbox toggle - the critical method we're testing
   */
  async onCardCheckToggle(blockIndex: number, checked: boolean): Promise<void> {
    if (!this.currentFile) return;

    // Read current file content
    const content = this.fileContent;
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

      // CRITICAL: Set flag to prevent reload on file change
      this.isInternalModification = true;

      // Simulate file modification
      this.fileContent = newContent;
      await this.handleFileModified();
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
   * We count these to ensure checkbox toggle doesn't trigger them
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

  getIsInternalModification(): boolean {
    return this.isInternalModification;
  }
}

describe('MemosView Checkbox Toggle (Regression Test)', () => {
  describe('Checkbox toggle should NOT trigger full reload', () => {
    it('should set isInternalModification flag when toggling checkbox', async () => {
      const initialContent = `## [ ] 2025-10-12 23:36 ^test-id

Test content`;

      const view = new MockMemosView(initialContent);

      // Toggle checkbox
      await view.onCardCheckToggle(0, true);

      // isInternalModification should have been set and then reset
      expect(view.getIsInternalModification()).toBe(false);

      // Render count should still be 0 (no full reload triggered)
      expect(view.getRenderCount()).toBe(0);
    });

    it('should NOT trigger renderMemosView when toggling checkbox', async () => {
      const initialContent = `## [ ] 2025-10-12 23:36 ^test-id-1

First block

## [x] 2025-10-12 23:37 ^test-id-2

Second block`;

      const view = new MockMemosView(initialContent);
      const initialRenderCount = view.getRenderCount();

      // Toggle first checkbox
      await view.onCardCheckToggle(0, true);
      expect(view.getRenderCount()).toBe(initialRenderCount); // No reload

      // Toggle second checkbox
      await view.onCardCheckToggle(1, false);
      expect(view.getRenderCount()).toBe(initialRenderCount); // Still no reload
    });

    it('should update checkbox state in file content', async () => {
      const initialContent = `## [ ] 2025-10-12 23:36 ^test-id

Test content`;

      const view = new MockMemosView(initialContent);

      // Toggle checkbox to checked
      await view.onCardCheckToggle(0, true);

      const updatedContent = view.getFileContent();
      expect(updatedContent).toContain('## [x] 2025-10-12 23:36 ^test-id');
      expect(updatedContent).not.toContain('## [ ] 2025-10-12 23:36 ^test-id');
    });

    it('should preserve block ID and content when toggling', async () => {
      const initialContent = `## [ ] 2025-10-12 23:36 ^original-id

Original content
with multiple lines`;

      const view = new MockMemosView(initialContent);

      // Toggle checkbox
      await view.onCardCheckToggle(0, true);

      const updatedContent = view.getFileContent();

      // Block ID should be preserved
      expect(updatedContent).toContain('^original-id');

      // Content should be preserved
      expect(updatedContent).toContain('Original content');
      expect(updatedContent).toContain('with multiple lines');
    });

    it('should handle multiple checkbox toggles without reloads', async () => {
      const initialContent = `## [ ] First ^id1

Content 1

## [ ] Second ^id2

Content 2

## [ ] Third ^id3

Content 3`;

      const view = new MockMemosView(initialContent);

      // Toggle multiple times
      await view.onCardCheckToggle(0, true);
      await view.onCardCheckToggle(1, true);
      await view.onCardCheckToggle(2, true);
      await view.onCardCheckToggle(0, false);

      // No reloads should have been triggered
      expect(view.getRenderCount()).toBe(0);

      // All changes should be reflected
      const updatedContent = view.getFileContent();
      expect(updatedContent).toContain('## [ ] First ^id1'); // Unchecked again
      expect(updatedContent).toContain('## [x] Second ^id2'); // Checked
      expect(updatedContent).toContain('## [x] Third ^id3'); // Checked
    });

    it('should preserve frontmatter when toggling checkbox', async () => {
      const initialContent = `---
title: Test
tags:
  - memos
---

## [ ] 2025-10-12 23:36 ^test-id

Test content`;

      const view = new MockMemosView(initialContent);

      await view.onCardCheckToggle(0, true);

      const updatedContent = view.getFileContent();
      expect(updatedContent).toContain('title: Test');
      expect(updatedContent).toContain('tags:');
      expect(updatedContent).toContain('- memos');
      expect(updatedContent).toContain('## [x] 2025-10-12 23:36 ^test-id');
    });
  });

  describe('Regression Test: isInternalModification flag behavior', () => {
    it('CRITICAL: should prevent reload when isInternalModification is true', async () => {
      const initialContent = `## [ ] Test ^id

Content`;

      const view = new MockMemosView(initialContent);

      // This is what onCardCheckToggle should do
      await view.onCardCheckToggle(0, true);

      // The critical assertion: no reload should have happened
      expect(view.getRenderCount()).toBe(0);
    });

    it('should reset isInternalModification flag after file modification', async () => {
      const initialContent = `## [ ] Test ^id

Content`;

      const view = new MockMemosView(initialContent);

      // Before toggle
      expect(view.getIsInternalModification()).toBe(false);

      // During toggle, the flag is set and then reset by handleFileModified
      await view.onCardCheckToggle(0, true);

      // After toggle, flag should be reset
      expect(view.getIsInternalModification()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle toggling when block has no initial checkbox state', async () => {
      const initialContent = `## 2025-10-12 23:36 ^test-id

No checkbox initially`;

      const view = new MockMemosView(initialContent);

      // Parse to verify initial state
      const blocks = MarkdownParser.parse(initialContent);
      expect(blocks[0].checked).toBeUndefined();

      // Toggle (adding checkbox)
      await view.onCardCheckToggle(0, true);

      const updatedContent = view.getFileContent();
      expect(updatedContent).toContain('## [x] 2025-10-12 23:36 ^test-id');
    });

    it('should handle invalid block index gracefully', async () => {
      const initialContent = `## [ ] Test ^id

Content`;

      const view = new MockMemosView(initialContent);

      // Try to toggle non-existent block
      await view.onCardCheckToggle(999, true);

      // Should not crash or trigger reload
      expect(view.getRenderCount()).toBe(0);
      expect(view.getFileContent()).toBe(initialContent);
    });

    it('should only update H2 blocks, not H1', async () => {
      const initialContent = `# Top Level Heading

## [ ] H2 Block ^id

Content`;

      const view = new MockMemosView(initialContent);

      // Toggle the H2 block (index 1 after filtering empty blocks)
      await view.onCardCheckToggle(1, true);

      const updatedContent = view.getFileContent();
      expect(updatedContent).toContain('## [x] H2 Block ^id');
      expect(updatedContent).toContain('# Top Level Heading'); // H1 unchanged
    });
  });
});
