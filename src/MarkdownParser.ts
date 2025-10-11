import { Logger } from './Logger';

export enum BlockType {
	HEADING = 'heading',
	PARAGRAPH = 'paragraph',
	CODE_BLOCK = 'code-block',
	LIST = 'list',
	BLOCKQUOTE = 'blockquote',
	DIVIDER = 'divider',
	EMPTY = 'empty'
}

export interface MarkdownBlock {
	type: BlockType;
	content: string;
	startLine: number;
	endLine: number;
	level?: number; // For headings (1-6) or list depth
	language?: string; // For code blocks
	raw: string; // Original text including markdown syntax
	checked?: boolean; // For H2 headings with checkbox notation
	id?: string; // Block ID for H2 headings (Obsidian-style ^block-id)
	isDraft?: boolean; // For H2 headings with %%quickadd-draft%% flag
	collapsed?: boolean; // For H2 headings with [collapsed:: true/false] inline field
}

export class MarkdownParser {
	/**
	 * Parse markdown content into blocks
	 * H2 headings (##) are treated as section headers that include all content until the next H2
	 */
	static parse(content: string): MarkdownBlock[] {
		const lines = content.split('\n');
		const blocks: MarkdownBlock[] = [];
		let i = 0;

		while (i < lines.length) {
			const line = lines[i];

			// Skip frontmatter
			if (i === 0 && line.trim() === '---') {
				const frontmatterEnd = this.findFrontmatterEnd(lines, i);
				if (frontmatterEnd > i) {
					i = frontmatterEnd + 1;
					continue;
				}
			}

			// H2 Heading (##) - treat as section with content
			if (line.trim().match(/^##\s/)) {
				const block = this.parseH2Section(lines, i);
				blocks.push(block);
				i = block.endLine + 1;
				continue;
			}

			// Other Headings (H1, H3-H6) - treat as standalone
			if (line.trim().match(/^#{1,6}\s/)) {
				const block = this.parseHeading(lines, i);
				blocks.push(block);
				i = block.endLine + 1;
				continue;
			}

			// Code block
			if (line.trim().startsWith('```')) {
				const block = this.parseCodeBlock(lines, i);
				blocks.push(block);
				i = block.endLine + 1;
				continue;
			}

			// Divider
			if (line.trim().match(/^(-{3,}|\*{3,}|_{3,})$/)) {
				blocks.push({
					type: BlockType.DIVIDER,
					content: '',
					startLine: i,
					endLine: i,
					raw: line
				});
				i++;
				continue;
			}

			// Blockquote
			if (line.trim().startsWith('>')) {
				const block = this.parseBlockquote(lines, i);
				blocks.push(block);
				i = block.endLine + 1;
				continue;
			}

			// List (ordered or unordered)
			if (line.trim().match(/^(\d+\.|-|\*|\+)\s/)) {
				const block = this.parseList(lines, i);
				blocks.push(block);
				i = block.endLine + 1;
				continue;
			}

			// Empty line
			if (line.trim() === '') {
				blocks.push({
					type: BlockType.EMPTY,
					content: '',
					startLine: i,
					endLine: i,
					raw: line
				});
				i++;
				continue;
			}

			// Paragraph (default)
			const block = this.parseParagraph(lines, i);
			blocks.push(block);
			i = block.endLine + 1;
		}

		return blocks;
	}

	private static findFrontmatterEnd(lines: string[], start: number): number {
		for (let i = start + 1; i < lines.length; i++) {
			if (lines[i].trim() === '---') {
				return i;
			}
		}
		return -1;
	}

	/**
	 * Parse H2 section (## heading) including all content until next H2 or end of file
	 * This creates a single block containing the heading and all its content
	 */
	private static parseH2Section(lines: string[], start: number): MarkdownBlock {
		Logger.debug('[MarkdownParser.parseH2Section] Starting at line', start, ':', lines[start]);

		const headingLine = lines[start];
		const match = headingLine.match(/^##\s+(.+)$/);
		let headingText = match ? match[1] : headingLine.replace(/^##\s*/, '');

		// Detect checkbox notation in heading: [ ] or [x]
		let checked: boolean | undefined = undefined;
		const checkboxMatch = headingText.match(/^\[([ x])\]\s+(.+)$/);
		if (checkboxMatch) {
			checked = checkboxMatch[1] === 'x';
			headingText = checkboxMatch[2]; // Remove checkbox notation from heading text
			Logger.debug('[MarkdownParser.parseH2Section] Checkbox detected:', checked ? 'checked' : 'unchecked');
		}

		// Detect draft flag: %%quickadd-draft%% at the end of heading
		let isDraft: boolean | undefined = undefined;
		const draftMatch = headingText.match(/^(.*?)\s+%%quickadd-draft%%\s*$/);
		if (draftMatch) {
			isDraft = true;
			headingText = draftMatch[1].trim(); // Remove draft flag from heading text
			Logger.debug('[MarkdownParser.parseH2Section] Draft flag detected');
		}

		// Detect collapsed state: [collapsed:: true/false] at the end of heading
		let collapsed: boolean | undefined = undefined;
		const collapsedMatch = headingText.match(/^(.*?)\s+\[collapsed::\s*(true|false)\]\s*$/);
		if (collapsedMatch) {
			collapsed = collapsedMatch[2] === 'true';
			headingText = collapsedMatch[1].trim(); // Remove collapsed field from heading text
			Logger.debug('[MarkdownParser.parseH2Section] Collapsed state detected:', collapsed);
		}

		// Detect block ID: ^block-id at the end of heading
		let blockId: string | undefined = undefined;
		const blockIdMatch = headingText.match(/^(.*?)\s+\^([\w-]+)$/);
		if (blockIdMatch) {
			headingText = blockIdMatch[1].trim(); // Remove block ID from heading text
			blockId = blockIdMatch[2];
			Logger.debug('[MarkdownParser.parseH2Section] Block ID detected:', blockId);
		}

		const contentLines: string[] = [];
		let endLine = start;

		// Collect all lines until next H2 or end of file
		for (let i = start + 1; i < lines.length; i++) {
			const line = lines[i];

			// Stop at next H2 heading
			if (line.trim().match(/^##\s/)) {
				break;
			}

			contentLines.push(line);
			endLine = i;
		}

		// Remove leading/trailing empty lines from content
		while (contentLines.length > 0 && contentLines[0].trim() === '') {
			contentLines.shift();
		}
		while (contentLines.length > 0 && contentLines[contentLines.length - 1].trim() === '') {
			contentLines.pop();
		}

		const content = contentLines.join('\n');
		const raw = lines.slice(start, endLine + 1).join('\n');

		Logger.debug('[MarkdownParser.parseH2Section] Section:', headingText, 'lines', start, '-', endLine, 'content length:', content.length);

		return {
			type: BlockType.HEADING,
			content: headingText + (content ? '\n\n' + content : ''),
			startLine: start,
			endLine,
			level: 2,
			raw,
			checked,
			id: blockId,
			isDraft,
			collapsed
		};
	}

	private static parseHeading(lines: string[], start: number): MarkdownBlock {
		const line = lines[start];
		const match = line.match(/^(#{1,6})\s+(.+)$/);

		if (match) {
			const level = match[1].length;
			const content = match[2];

			return {
				type: BlockType.HEADING,
				content,
				startLine: start,
				endLine: start,
				level,
				raw: line
			};
		}

		return {
			type: BlockType.PARAGRAPH,
			content: line,
			startLine: start,
			endLine: start,
			raw: line
		};
	}

	private static parseCodeBlock(lines: string[], start: number): MarkdownBlock {
		const firstLine = lines[start].trim();
		const language = firstLine.substring(3).trim() || 'text';
		const contentLines: string[] = [];
		let endLine = start;

		for (let i = start + 1; i < lines.length; i++) {
			if (lines[i].trim().startsWith('```')) {
				endLine = i;
				break;
			}
			contentLines.push(lines[i]);
		}

		const raw = lines.slice(start, endLine + 1).join('\n');

		return {
			type: BlockType.CODE_BLOCK,
			content: contentLines.join('\n'),
			startLine: start,
			endLine,
			language,
			raw
		};
	}

	private static parseParagraph(lines: string[], start: number): MarkdownBlock {
		const contentLines: string[] = [lines[start]];
		let endLine = start;

		// Continue until we hit an empty line or special block
		for (let i = start + 1; i < lines.length; i++) {
			const line = lines[i];

			// Stop at empty line
			if (line.trim() === '') break;

			// Stop at special blocks
			if (line.trim().match(/^#{1,6}\s/) ||
				line.trim().startsWith('```') ||
				line.trim().startsWith('>') ||
				line.trim().match(/^(\d+\.|-|\*|\+)\s/) ||
				line.trim().match(/^(-{3,}|\*{3,}|_{3,})$/)) {
				break;
			}

			contentLines.push(line);
			endLine = i;
		}

		const raw = lines.slice(start, endLine + 1).join('\n');

		return {
			type: BlockType.PARAGRAPH,
			content: contentLines.join('\n'),
			startLine: start,
			endLine,
			raw
		};
	}

	private static parseList(lines: string[], start: number): MarkdownBlock {
		const contentLines: string[] = [lines[start]];
		let endLine = start;

		// Continue while lines are list items or indented
		for (let i = start + 1; i < lines.length; i++) {
			const line = lines[i];

			// Stop at empty line
			if (line.trim() === '') break;

			// Continue if it's a list item or indented continuation
			if (line.trim().match(/^(\d+\.|-|\*|\+)\s/) || line.startsWith('  ') || line.startsWith('\t')) {
				contentLines.push(line);
				endLine = i;
			} else {
				break;
			}
		}

		const raw = lines.slice(start, endLine + 1).join('\n');

		return {
			type: BlockType.LIST,
			content: contentLines.join('\n'),
			startLine: start,
			endLine,
			raw
		};
	}

	private static parseBlockquote(lines: string[], start: number): MarkdownBlock {
		const contentLines: string[] = [lines[start]];
		let endLine = start;

		// Continue while lines start with '>'
		for (let i = start + 1; i < lines.length; i++) {
			const line = lines[i];

			if (line.trim().startsWith('>')) {
				contentLines.push(line);
				endLine = i;
			} else {
				break;
			}
		}

		const raw = lines.slice(start, endLine + 1).join('\n');
		const content = contentLines.map(l => l.replace(/^>\s?/, '')).join('\n');

		return {
			type: BlockType.BLOCKQUOTE,
			content,
			startLine: start,
			endLine,
			raw
		};
	}
}
