import { MarkdownParser, BlockType, MarkdownBlock } from '../MarkdownParser';

describe('MarkdownParser', () => {
  describe('H2 Section Parsing', () => {
    it('should parse H2 with checkbox and block ID', () => {
      const markdown = `## [x] 2025-10-11 16:08 ^test-id-123

Some content here`;

      const blocks = MarkdownParser.parse(markdown);

      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toMatchObject({
        type: BlockType.HEADING,
        level: 2,
        checked: true,
        id: 'test-id-123',
        content: '2025-10-11 16:08\n\nSome content here'
      });
    });

    it('should parse H2 with unchecked checkbox and block ID', () => {
      const markdown = `## [ ] 2025-10-11 16:09 ^abc-123

- foo
- bar`;

      const blocks = MarkdownParser.parse(markdown);

      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toMatchObject({
        type: BlockType.HEADING,
        level: 2,
        checked: false,
        id: 'abc-123',
        content: '2025-10-11 16:09\n\n- foo\n- bar'
      });
    });

    it('should parse H2 with only block ID (no checkbox)', () => {
      const markdown = `## 2025-10-11 16:08 ^test-id

hoge`;

      const blocks = MarkdownParser.parse(markdown);

      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toMatchObject({
        type: BlockType.HEADING,
        level: 2,
        checked: undefined,
        id: 'test-id',
        content: '2025-10-11 16:08\n\nhoge'
      });
    });

    it('should parse H2 without checkbox or block ID', () => {
      const markdown = `## 2025-10-11 16:12

test`;

      const blocks = MarkdownParser.parse(markdown);

      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toMatchObject({
        type: BlockType.HEADING,
        level: 2,
        checked: undefined,
        id: undefined,
        content: '2025-10-11 16:12\n\ntest'
      });
    });

    it('should parse multiple H2 sections correctly', () => {
      const markdown = `## [x] First Section ^id1

Content 1

## [ ] Second Section ^id2

Content 2

## Third Section

Content 3`;

      const blocks = MarkdownParser.parse(markdown);

      expect(blocks).toHaveLength(3);

      expect(blocks[0]).toMatchObject({
        checked: true,
        id: 'id1',
        content: 'First Section\n\nContent 1'
      });

      expect(blocks[1]).toMatchObject({
        checked: false,
        id: 'id2',
        content: 'Second Section\n\nContent 2'
      });

      expect(blocks[2]).toMatchObject({
        checked: undefined,
        id: undefined,
        content: 'Third Section\n\nContent 3'
      });
    });

    it('should handle H2 sections with empty content', () => {
      const markdown = `## [x] Empty Section ^empty-id

## Next Section ^next-id

Content`;

      const blocks = MarkdownParser.parse(markdown);

      expect(blocks).toHaveLength(2);
      expect(blocks[0]).toMatchObject({
        checked: true,
        id: 'empty-id',
        content: 'Empty Section'
      });
      expect(blocks[1]).toMatchObject({
        checked: undefined,
        id: 'next-id',
        content: 'Next Section\n\nContent'
      });
    });

    it('should preserve frontmatter and parse H2 sections after it', () => {
      const markdown = `---
title: Test Title
tags:
  - memos
---

# Main Heading

## [x] First Memo ^memo1

Content here`;

      const blocks = MarkdownParser.parse(markdown);

      // Should skip frontmatter, parse H1, then H2
      expect(blocks.length).toBeGreaterThanOrEqual(2);

      const h2Block = blocks.find(b => b.level === 2);
      expect(h2Block).toMatchObject({
        type: BlockType.HEADING,
        level: 2,
        checked: true,
        id: 'memo1',
        content: 'First Memo\n\nContent here'
      });
    });

    it('should handle block IDs with various formats', () => {
      const testCases = [
        { input: '## Title ^abc123', expectedId: 'abc123' },
        { input: '## Title ^abc-123', expectedId: 'abc-123' },
        { input: '## Title ^abc_123', expectedId: 'abc_123' },
        { input: '## Title ^mglyjnm3-qjvh7', expectedId: 'mglyjnm3-qjvh7' },
      ];

      testCases.forEach(({ input, expectedId }) => {
        const blocks = MarkdownParser.parse(input);
        expect(blocks[0].id).toBe(expectedId);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle checkbox with extra spaces', () => {
      const markdown = `## [x]  Title  ^id

Content`;

      const blocks = MarkdownParser.parse(markdown);
      expect(blocks[0]).toMatchObject({
        checked: true,
        id: 'id',
        content: 'Title\n\nContent'
      });
    });

    it('should not parse checkbox in H1', () => {
      const markdown = `# [x] This is H1 ^should-not-parse

Content`;

      const blocks = MarkdownParser.parse(markdown);
      // H1 should be parsed as standalone heading
      // Note: H1 headings don't have checked or id fields in the block
      expect(blocks[0]).toMatchObject({
        type: BlockType.HEADING,
        level: 1
      });
      // Verify these fields are not defined (or we don't care about their values)
      expect(blocks[0].checked).toBeUndefined();
      expect(blocks[0].id).toBeUndefined();
    });

    it('should handle malformed block IDs gracefully', () => {
      const markdown = `## Title ^

Content`;

      const blocks = MarkdownParser.parse(markdown);
      // Should not extract block ID if it's empty
      expect(blocks[0].id).toBeUndefined();
    });
  });
});
