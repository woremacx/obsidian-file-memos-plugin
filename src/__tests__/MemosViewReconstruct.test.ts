import { MarkdownParser, BlockType, MarkdownBlock } from '../MarkdownParser';

/**
 * Mock version of MemosView's reconstructMarkdown method
 * We need to test this separately since MemosView depends on Obsidian API
 */
class MarkdownReconstructor {
  private frontmatter: string = '';

  setFrontmatter(frontmatter: string): void {
    this.frontmatter = frontmatter;
  }

  private generateBlockId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `${timestamp}-${random}`;
  }

  reconstructMarkdown(blocks: MarkdownBlock[]): string {
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

            // Build heading line with checkbox and block ID
            let headingParts = [hashes];

            if (block.checked !== undefined) {
              const checkbox = block.checked ? '[x]' : '[ ]';
              headingParts.push(checkbox);
            }

            headingParts.push(headingText);
            headingParts.push(`^${block.id}`);

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
}

describe('MarkdownReconstructor (reconstructMarkdown)', () => {
  let reconstructor: MarkdownReconstructor;

  beforeEach(() => {
    reconstructor = new MarkdownReconstructor();
  });

  describe('H2 Section Reconstruction', () => {
    it('should reconstruct H2 with checkbox and block ID', () => {
      const block: MarkdownBlock = {
        type: BlockType.HEADING,
        level: 2,
        content: '2025-10-11 16:08\n\nSome content',
        checked: true,
        id: 'test-id-123',
        startLine: 0,
        endLine: 2,
        raw: '## [x] 2025-10-11 16:08 ^test-id-123\n\nSome content'
      };

      const result = reconstructor.reconstructMarkdown([block]);

      expect(result).toBe('## [x] 2025-10-11 16:08 ^test-id-123\n\nSome content\n');
    });

    it('should reconstruct H2 with unchecked checkbox and block ID', () => {
      const block: MarkdownBlock = {
        type: BlockType.HEADING,
        level: 2,
        content: '2025-10-11 16:09\n\n- foo\n- bar',
        checked: false,
        id: 'abc-123',
        startLine: 0,
        endLine: 3,
        raw: '## [ ] 2025-10-11 16:09 ^abc-123\n\n- foo\n- bar'
      };

      const result = reconstructor.reconstructMarkdown([block]);

      expect(result).toBe('## [ ] 2025-10-11 16:09 ^abc-123\n\n- foo\n- bar\n');
    });

    it('should reconstruct H2 with only block ID (no checkbox)', () => {
      const block: MarkdownBlock = {
        type: BlockType.HEADING,
        level: 2,
        content: '2025-10-11 16:08\n\nhoge',
        id: 'test-id',
        startLine: 0,
        endLine: 2,
        raw: '## 2025-10-11 16:08 ^test-id\n\nhoge'
      };

      const result = reconstructor.reconstructMarkdown([block]);

      expect(result).toBe('## 2025-10-11 16:08 ^test-id\n\nhoge\n');
    });

    it('should generate block ID if missing for H2', () => {
      const block: MarkdownBlock = {
        type: BlockType.HEADING,
        level: 2,
        content: '2025-10-11 16:12\n\ntest',
        startLine: 0,
        endLine: 2,
        raw: '## 2025-10-11 16:12\n\ntest'
      };

      const result = reconstructor.reconstructMarkdown([block]);

      // Should have generated an ID
      expect(result).toMatch(/^## 2025-10-11 16:12 \^[\w-]+\n\ntest\n$/);
      // Block should now have an ID
      expect(block.id).toBeDefined();
    });

    it('should reconstruct multiple H2 sections', () => {
      const blocks: MarkdownBlock[] = [
        {
          type: BlockType.HEADING,
          level: 2,
          content: 'First\n\nContent 1',
          checked: true,
          id: 'id1',
          startLine: 0,
          endLine: 2,
          raw: ''
        },
        {
          type: BlockType.HEADING,
          level: 2,
          content: 'Second\n\nContent 2',
          checked: false,
          id: 'id2',
          startLine: 4,
          endLine: 6,
          raw: ''
        }
      ];

      const result = reconstructor.reconstructMarkdown(blocks);

      expect(result).toBe(
        '## [x] First ^id1\n\nContent 1\n\n## [ ] Second ^id2\n\nContent 2\n'
      );
    });

    it('should preserve frontmatter when reconstructing', () => {
      const frontmatter = `---
title: Test
tags:
  - memos
---

`;

      reconstructor.setFrontmatter(frontmatter);

      const block: MarkdownBlock = {
        type: BlockType.HEADING,
        level: 2,
        content: 'Test\n\nContent',
        id: 'test-id',
        startLine: 0,
        endLine: 2,
        raw: ''
      };

      const result = reconstructor.reconstructMarkdown([block]);

      expect(result).toBe(
        frontmatter + '## Test ^test-id\n\nContent\n'
      );
    });
  });

  describe('Round-trip Test (Parse → Reconstruct → Parse)', () => {
    it('should preserve H2 checkbox and block ID through round-trip', () => {
      const original = `## [x] 2025-10-11 16:08 ^test-id

Some content here`;

      // Parse
      const blocks = MarkdownParser.parse(original);
      expect(blocks).toHaveLength(1);

      // Reconstruct
      const reconstructed = reconstructor.reconstructMarkdown(blocks);

      // Parse again
      const blocks2 = MarkdownParser.parse(reconstructed);
      expect(blocks2).toHaveLength(1);

      // Should match original
      expect(blocks2[0]).toMatchObject({
        type: BlockType.HEADING,
        level: 2,
        checked: true,
        id: 'test-id',
        content: '2025-10-11 16:08\n\nSome content here'
      });
    });

    it('should preserve multiple H2 sections through round-trip', () => {
      const original = `## [x] First ^id1

Content 1

## [ ] Second ^id2

Content 2

## Third ^id3

Content 3`;

      // Parse
      const blocks = MarkdownParser.parse(original);
      expect(blocks).toHaveLength(3);

      // Reconstruct
      const reconstructed = reconstructor.reconstructMarkdown(blocks);

      // Parse again
      const blocks2 = MarkdownParser.parse(reconstructed);
      expect(blocks2).toHaveLength(3);

      // Verify all blocks preserved
      expect(blocks2[0]).toMatchObject({ checked: true, id: 'id1' });
      expect(blocks2[1]).toMatchObject({ checked: false, id: 'id2' });
      expect(blocks2[2]).toMatchObject({ checked: undefined, id: 'id3' });
    });

    it('should handle real-world example from file', () => {
      const original = `---
title: Test Title
date: 2025-10-11 15:58:23
tags:
  - daily/2025-10-11
  - memos
---

# test!!!!ssssaxxx

## [x] 2025-10-11 16:08 ^mglyjs5w-4tggo

unko
hogehoge

## 2025-10-11 16:08 ^mglyjs5w-g1jbj

hoge

## [ ] 2025-10-11 16:09 ^mglyjs5w-pwp3b

- foo
- bar

## 2025-10-11 16:12 ^mglyjs5w-sxboq

test

## 2025-10-11 16:20 ^mglyjs5w-3frr7

aaaa
test

## [x] 2025-10-11 16:32 ^mglyjs5w-ymolj

aaaccc
`;

      // Set frontmatter
      const frontmatterMatch = original.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
      if (frontmatterMatch) {
        reconstructor.setFrontmatter(frontmatterMatch[0]);
      }

      // Parse
      const blocks = MarkdownParser.parse(original);

      // Find H2 blocks
      const h2Blocks = blocks.filter(b => b.level === 2);
      expect(h2Blocks.length).toBeGreaterThan(0);

      // All H2 blocks should have IDs
      h2Blocks.forEach(block => {
        expect(block.id).toBeDefined();
        expect(block.id).not.toBe('');
      });

      // Reconstruct
      const reconstructed = reconstructor.reconstructMarkdown(blocks);

      // Parse again
      const blocks2 = MarkdownParser.parse(reconstructed);

      // All IDs should be preserved
      const h2Blocks2 = blocks2.filter(b => b.level === 2);
      expect(h2Blocks2.length).toBe(h2Blocks.length);

      h2Blocks2.forEach((block, idx) => {
        expect(block.id).toBe(h2Blocks[idx].id);
        expect(block.checked).toBe(h2Blocks[idx].checked);
      });
    });

    it('should preserve block ID when editing content', () => {
      const original = `## [x] 2025-10-11 16:08 ^original-id

Original content here`;

      // Parse original
      const blocks = MarkdownParser.parse(original);
      expect(blocks).toHaveLength(1);
      const originalBlock = blocks[0];
      expect(originalBlock.id).toBe('original-id');
      expect(originalBlock.checked).toBe(true);

      // Simulate editing: parse new content
      const editedContent = `## 2025-10-11 16:08

Edited content here`;
      const editedBlock = MarkdownParser.parse(editedContent)[0];

      // In onCardEdit, we preserve the original ID and checked state
      editedBlock.id = originalBlock.id;
      editedBlock.checked = originalBlock.checked;

      // Reconstruct with preserved ID
      const reconstructed = reconstructor.reconstructMarkdown([editedBlock]);

      // Parse again
      const blocks2 = MarkdownParser.parse(reconstructed);
      expect(blocks2).toHaveLength(1);

      // ID and checked state should be preserved
      expect(blocks2[0].id).toBe('original-id');
      expect(blocks2[0].checked).toBe(true);
      expect(blocks2[0].content).toContain('Edited content here');
    });
  });
});
