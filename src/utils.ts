import { TFile, parseFrontMatterTags, App } from 'obsidian';
import { Logger } from './Logger';

/**
 * Check if a file has the specified tag
 * @param file - The file to check
 * @param content - The file content
 * @param tag - The tag to check for (without #, default: 'memos')
 * @returns true if the file has the specified tag
 */
export function hasMemosTag(file: TFile, content: string, tag: string = 'memos'): boolean {
	Logger.debug('[hasMemosTag] Checking file:', file.path);
	Logger.debug('[hasMemosTag] Looking for tag:', tag);
	Logger.debug('[hasMemosTag] Content preview (first 200 chars):', content.substring(0, 200));

	// Check frontmatter for tags array
	const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
	const match = content.match(frontmatterRegex);

	if (match) {
		const frontmatter = match[1];
		Logger.debug('[hasMemosTag] Frontmatter found:', frontmatter);
		// Check for tags: [tag] or tags: tag
		if (frontmatter.includes(tag) && (frontmatter.includes('tags:') || frontmatter.includes('tag:'))) {
			Logger.debug(`[hasMemosTag] Found #${tag} in frontmatter - returning true`);
			return true;
		}
	} else {
		Logger.debug('[hasMemosTag] No frontmatter found');
	}

	// Check inline tags in content
	const inlineTag = `#${tag}`;
	if (content.includes(inlineTag)) {
		Logger.debug(`[hasMemosTag] Found ${inlineTag} inline - returning true`);
		return true;
	}

	Logger.debug(`[hasMemosTag] No #${tag} tag found - returning false`);
	return false;
}

/**
 * Format timestamp for memos
 * @param date - The date to format
 * @param format - The format string (default: "YYYY-MM-DD HH:mm")
 * @returns formatted timestamp string
 */
export function formatTimestamp(date: Date, format: string = 'YYYY-MM-DD HH:mm'): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	const seconds = String(date.getSeconds()).padStart(2, '0');

	return format
		.replace('YYYY', String(year))
		.replace('MM', month)
		.replace('DD', day)
		.replace('HH', hours)
		.replace('mm', minutes)
		.replace('ss', seconds);
}
