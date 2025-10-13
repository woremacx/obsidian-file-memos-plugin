import { Plugin, TFile, WorkspaceLeaf, PluginSettingTab, App, Setting } from 'obsidian';
import { MemosView, VIEW_TYPE_MEMOS } from './MemosView';
import { hasMemosTag } from './utils';
import { Logger } from './Logger';

interface MemosViewSettings {
	useFrontmatterTitle: boolean;
	showDebugLog: boolean;
	memosTag: string;
}

const DEFAULT_SETTINGS: MemosViewSettings = {
	useFrontmatterTitle: true,
	showDebugLog: false,
	memosTag: 'memos'
};

export default class MemosViewPlugin extends Plugin {
	private skipNextFileOpen = false;
	settings: MemosViewSettings;

	async onload() {
		// Load settings
		await this.loadSettings();

		// Initialize Logger with plugin instance
		Logger.setPlugin(this);

		Logger.info('Loading File Memos View Plugin');

		// Register the custom view
		this.registerView(
			VIEW_TYPE_MEMOS,
			(leaf) => new MemosView(leaf)
		);

		// Register file open event to auto-switch to memos view
		this.registerEvent(
			this.app.workspace.on('file-open', async (file) => {
				if (file && file instanceof TFile && file.extension === 'md') {
					await this.handleFileOpen(file);
				}
			})
		);

		// Add command to manually toggle memos view
		this.addCommand({
			id: 'toggle-memos-view',
			name: 'Toggle Memos View',
			callback: () => {
				this.toggleMemosView();
			}
		});

		// Add settings tab
		this.addSettingTab(new MemosViewSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async handleFileOpen(file: TFile) {
		Logger.debug('[handleFileOpen] Called with file:', file.path);

		// Check if we should skip this file open event
		if (this.skipNextFileOpen) {
			Logger.debug('[handleFileOpen] Skipping due to skipNextFileOpen flag');
			this.skipNextFileOpen = false;
			return;
		}

		const content = await this.app.vault.read(file);
		Logger.debug('[handleFileOpen] File content length:', content.length);

		if (hasMemosTag(file, content, this.settings.memosTag)) {
			Logger.debug(`[handleFileOpen] File has #${this.settings.memosTag} tag - switching to memos view`);
			// Switch current leaf to memos view
			const activeLeaf = this.app.workspace.getActiveViewOfType(MemosView)?.leaf || this.app.workspace.getMostRecentLeaf();
			Logger.debug('[handleFileOpen] Active leaf found:', activeLeaf != null);

			if (activeLeaf) {
				Logger.debug('[handleFileOpen] Setting view state with file path:', file.path);
				await activeLeaf.setViewState({
					type: VIEW_TYPE_MEMOS,
					active: true,
					state: { file: file.path }
				});
				Logger.debug('[handleFileOpen] View state set successfully');
			} else {
				Logger.error('[handleFileOpen] No active leaf found');
			}
		} else {
			Logger.debug(`[handleFileOpen] File does not have #${this.settings.memosTag} tag - skipping`);
		}
	}

	public setSkipNextFileOpen() {
		this.skipNextFileOpen = true;
	}

	async activateMemosView() {
		Logger.debug('[activateMemosView] Called');
		const { workspace } = this.app;
		const activeFile = this.app.workspace.getActiveFile();
		Logger.debug('[activateMemosView] Active file:', activeFile?.path || 'none');

		// Use current leaf
		const leaf = workspace.getMostRecentLeaf();
		Logger.debug('[activateMemosView] Most recent leaf found:', leaf != null);

		if (leaf) {
			const state = activeFile ? { file: activeFile.path } : {};
			Logger.debug('[activateMemosView] Setting view state with:', state);
			await leaf.setViewState({
				type: VIEW_TYPE_MEMOS,
				active: true,
				state: state
			});
			Logger.debug('[activateMemosView] Revealing leaf');
			workspace.revealLeaf(leaf);
			Logger.debug('[activateMemosView] Done');
		} else {
			Logger.error('[activateMemosView] No leaf found');
		}
	}

	async toggleMemosView() {
		Logger.debug('[toggleMemosView] Called');
		const activeLeaf = this.app.workspace.getActiveViewOfType(MemosView)?.leaf;
		Logger.debug('[toggleMemosView] Active memos view leaf:', activeLeaf != null);

		if (activeLeaf && activeLeaf.view.getViewType() === VIEW_TYPE_MEMOS) {
			Logger.debug('[toggleMemosView] Currently in memos view - switching to markdown');
			// Currently in memos view, switch to markdown view
			await activeLeaf.setViewState({
				type: 'markdown',
				active: true,
			});
		} else {
			Logger.debug('[toggleMemosView] Not in memos view - activating memos view');
			// Switch to memos view
			await this.activateMemosView();
		}
	}

	onunload() {
		Logger.info('Unloading File Memos View Plugin');
	}
}

class MemosViewSettingTab extends PluginSettingTab {
	plugin: MemosViewPlugin;

	constructor(app: App, plugin: MemosViewPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'File Memos View Settings' });

		new Setting(containerEl)
			.setName('Memos tag')
			.setDesc('Tag to trigger memos view (without #, e.g., "memos")')
			.addText(text => text
				.setPlaceholder('memos')
				.setValue(this.plugin.settings.memosTag)
				.onChange(async (value) => {
					// Remove # if user accidentally includes it
					const cleanValue = value.replace(/^#+/, '').trim();
					if (cleanValue) {
						this.plugin.settings.memosTag = cleanValue;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Use frontmatter title')
			.setDesc('Display the title from frontmatter instead of filename')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useFrontmatterTitle)
				.onChange(async (value) => {
					this.plugin.settings.useFrontmatterTitle = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show debug log')
			.setDesc('Display debug logs in the console (useful for troubleshooting)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showDebugLog)
				.onChange(async (value) => {
					this.plugin.settings.showDebugLog = value;
					await this.plugin.saveSettings();
				}));
	}
}
