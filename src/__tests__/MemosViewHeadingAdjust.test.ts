import { describe, it, expect } from '@jest/globals';

/**
 * Test the heading level adjustment logic
 * This logic is implemented in MemosView.adjustHeadingLevelsInDraft()
 */

// Reproduce the logic from MemosView.adjustHeadingLevelsInDraft()
function adjustHeadingLevelsInDraft(content: string): string {
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

	// Step 3: Apply shift to all headings
	return lines.map(line => {
		const match = line.match(/^(#{1,6})(\s.*)$/);
		if (match) {
			const currentLevel = match[1].length;
			const newLevel = currentLevel + shift;
			const rest = match[2];

			// If new level exceeds H6, convert to plain text
			if (newLevel > 6) {
				return rest.trim(); // Remove heading markers
			}

			return '#'.repeat(newLevel) + rest;
		}
		return line;
	}).join('\n');
}

describe('MemosView - adjustHeadingLevelsInDraft', () => {
	describe('Case 1: H1 only', () => {
		it('should shift H1 to H3', () => {
			const input = '# Heading';
			const expected = '### Heading';
			expect(adjustHeadingLevelsInDraft(input)).toBe(expected);
		});
	});

	describe('Case 2: H2 only (original problem case)', () => {
		it('should shift H2 to H3', () => {
			const input = '## Heading';
			const expected = '### Heading';
			expect(adjustHeadingLevelsInDraft(input)).toBe(expected);
		});

		it('should shift H2 with content to H3', () => {
			const input = '## 【AMD Ryzen 5 5500U】のベンチマーク';
			const expected = '### 【AMD Ryzen 5 5500U】のベンチマーク';
			expect(adjustHeadingLevelsInDraft(input)).toBe(expected);
		});
	});

	describe('Case 3: H1 and H2 mixed', () => {
		it('should shift all headings by 2 levels', () => {
			const input = '# H1\n## H2\n### H3';
			const expected = '### H1\n#### H2\n##### H3';
			expect(adjustHeadingLevelsInDraft(input)).toBe(expected);
		});
	});

	describe('Case 4: H3 and below only', () => {
		it('should not change content', () => {
			const input = '### Heading';
			const expected = '### Heading';
			expect(adjustHeadingLevelsInDraft(input)).toBe(expected);
		});

		it('should not change H3-H6 content', () => {
			const input = '### H3\n#### H4\n##### H5\n###### H6';
			const expected = '### H3\n#### H4\n##### H5\n###### H6';
			expect(adjustHeadingLevelsInDraft(input)).toBe(expected);
		});
	});

	describe('Case 5: Headings that exceed H6 range', () => {
		it('should convert H5 and H6 to plain text when shifting by 2', () => {
			const input = '# H1\n##### H5\n###### H6';
			const expected = '### H1\nH5\nH6';
			expect(adjustHeadingLevelsInDraft(input)).toBe(expected);
		});

		it('should convert H6 to plain text when shifting by 1', () => {
			const input = '## H2\n###### H6';
			const expected = '### H2\nH6';
			expect(adjustHeadingLevelsInDraft(input)).toBe(expected);
		});
	});

	describe('Case 6: Beetles example (H1-H4)', () => {
		it('should shift H1→H3, H2→H4, H3→H5, H4→H6', () => {
			const input = `# Beetles

## External morphology

### Head

#### Mouthparts

### Thorax

#### Prothorax

#### Pterothorax`;

			const expected = `### Beetles

#### External morphology

##### Head

###### Mouthparts

##### Thorax

###### Prothorax

###### Pterothorax`;

			expect(adjustHeadingLevelsInDraft(input)).toBe(expected);
		});
	});

	describe('Edge cases', () => {
		it('should handle empty content', () => {
			const input = '';
			const expected = '';
			expect(adjustHeadingLevelsInDraft(input)).toBe(expected);
		});

		it('should handle content with no headings', () => {
			const input = 'Some text\n\nMore text';
			const expected = 'Some text\n\nMore text';
			expect(adjustHeadingLevelsInDraft(input)).toBe(expected);
		});

		it('should preserve non-heading lines', () => {
			const input = '# Heading\n\nSome text\n\n## Another heading';
			const expected = '### Heading\n\nSome text\n\n#### Another heading';
			expect(adjustHeadingLevelsInDraft(input)).toBe(expected);
		});

		it('should handle headings with special characters', () => {
			const input = '# 日本語見出し\n## 【特殊文字】を含む';
			const expected = '### 日本語見出し\n#### 【特殊文字】を含む';
			expect(adjustHeadingLevelsInDraft(input)).toBe(expected);
		});
	});

	describe('Minimum level detection', () => {
		it('should detect H1 as minimum when H1-H6 mixed', () => {
			const input = '### H3\n# H1\n#### H4';
			// Min level is 1, shift by 2
			const expected = '##### H3\n### H1\n###### H4';
			expect(adjustHeadingLevelsInDraft(input)).toBe(expected);
		});

		it('should detect H2 as minimum when H2-H6 mixed', () => {
			const input = '### H3\n## H2\n#### H4';
			// Min level is 2, shift by 1
			const expected = '#### H3\n### H2\n##### H4';
			expect(adjustHeadingLevelsInDraft(input)).toBe(expected);
		});

		it('should detect H4 as minimum and not shift', () => {
			const input = '#### H4\n##### H5\n###### H6';
			// Min level is 4 (> 3), shift by 0
			const expected = '#### H4\n##### H5\n###### H6';
			expect(adjustHeadingLevelsInDraft(input)).toBe(expected);
		});
	});
});
