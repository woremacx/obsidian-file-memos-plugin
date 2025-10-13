import { App, Component, MarkdownView } from 'obsidian';
import { Logger } from './Logger';

/**
 * Options for configuring the EmbeddableMarkdownEditor
 */
export interface EmbeddableMarkdownEditorOptions {
    app: App;
    placeholder?: string;
    initialValue?: string;
    onEnter?: (editor: EmbeddableMarkdownEditor) => void;
    onEscape?: (editor: EmbeddableMarkdownEditor) => void;
    onSubmit?: (editor: EmbeddableMarkdownEditor) => void;
    onBlur?: (editor: EmbeddableMarkdownEditor) => void;
    onChange?: (editor: EmbeddableMarkdownEditor, value: string) => void;
}

/**
 * Type definitions for internal Obsidian APIs
 * These are not officially documented but used by plugins
 */
interface WidgetEditorView {
    editor?: any;
    showEditor?: () => void;
    editable?: boolean;
}

interface EmbedRegistry {
    embedByExtension: {
        md: (ctx: any, file: any, subpath: string) => WidgetEditorView;
    };
}

interface AppWithEmbedRegistry extends App {
    embedRegistry: EmbedRegistry;
}

/**
 * Resolve the ScrollableMarkdownEditor prototype dynamically
 * This uses Obsidian's internal embed registry to get the editor constructor
 */
function resolveEditorPrototype(app: App): any {
    const appWithRegistry = app as AppWithEmbedRegistry;

    // Create a temporary container for the embed
    const tempContainer = document.createElement('div');
    tempContainer.style.display = 'none';
    document.body.appendChild(tempContainer);

    try {
        // Mock context with minimal required properties
        const mockContext = {
            app: app,
            containerEl: tempContainer,
            sourcePath: '',
        };

        // Generate a WidgetEditorView using the embed registry
        const widgetEditorView = appWithRegistry.embedRegistry.embedByExtension.md(
            mockContext,
            null,
            ''
        );

        // Make it editable
        if (widgetEditorView) {
            widgetEditorView.editable = true;
            if (widgetEditorView.showEditor) {
                widgetEditorView.showEditor();
            }
        }

        // Extract the editor constructor/prototype
        if (widgetEditorView?.editor) {
            return Object.getPrototypeOf(widgetEditorView.editor).constructor;
        }
    } finally {
        // Clean up temporary container
        document.body.removeChild(tempContainer);
    }

    return null;
}

/**
 * Embeddable Markdown Editor
 * Provides an Obsidian-native markdown editing experience
 * Based on Fevol's implementation
 */
export class EmbeddableMarkdownEditor {
    private app: App;
    private containerEl: HTMLElement;
    private editor: any = null;
    private component: Component;
    private options: EmbeddableMarkdownEditorOptions;

    constructor(containerEl: HTMLElement, component: Component, options: EmbeddableMarkdownEditorOptions) {
        this.containerEl = containerEl;
        this.component = component;
        this.app = options.app;
        this.options = options;

        this.createEditor();
    }

    private createEditor(): void {
        const appWithRegistry = this.app as AppWithEmbedRegistry;

        try {
            // Create a mock file object to prevent basename errors
            const mockFile = {
                basename: '',
                extension: 'md',
                name: '',
                path: '',
                stat: { ctime: 0, mtime: 0, size: 0 },
                vault: this.app.vault,
                parent: null
            };

            // Mock context required by embedRegistry
            const mockContext = {
                app: this.app,
                containerEl: this.containerEl,
                sourcePath: '',
            };

            // Generate a WidgetEditorView using the embed registry
            const widgetEditorView = appWithRegistry.embedRegistry.embedByExtension.md(
                mockContext,
                mockFile,
                ''
            );

            if (!widgetEditorView) {
                Logger.error('[EmbeddableMarkdownEditor] Failed to create WidgetEditorView');
                this.createFallbackTextarea();
                return;
            }

            // Make it editable
            widgetEditorView.editable = true;
            if (widgetEditorView.showEditor) {
                widgetEditorView.showEditor();
            }

            // Store the editor reference
            this.editor = widgetEditorView.editor;

            if (!this.editor) {
                Logger.error('[EmbeddableMarkdownEditor] WidgetEditorView has no editor');
                this.createFallbackTextarea();
                return;
            }

            // Set initial value if provided
            if (this.options.initialValue) {
                this.setValue(this.options.initialValue);
            }

            // Setup change listener if provided
            if (this.options.onChange) {
                // Try to setup change listener
                try {
                    if (this.editor.cm) {
                        // CodeMirror 6: listen to view updates
                        const cm = this.editor.cm;

                        // Try EditorView.updateListener (CodeMirror 6)
                        if (cm.dom && cm.state) {
                            // Use MutationObserver as fallback for monitoring changes
                            const observer = new MutationObserver(() => {
                                if (this.options.onChange) {
                                    this.options.onChange(this, this.getValue());
                                }
                            });

                            observer.observe(cm.dom, {
                                characterData: true,
                                subtree: true,
                                childList: true
                            });

                            this.component.register(() => {
                                observer.disconnect();
                            });
                        }
                    }
                } catch (e) {
                    Logger.warn('[EmbeddableMarkdownEditor] Could not setup change listener:', e);
                }
            }

            // Register with component for cleanup
            this.component.register(() => this.destroy());

        } catch (error) {
            Logger.error('[EmbeddableMarkdownEditor] Failed to create editor:', error);
            this.createFallbackTextarea();
        }
    }

    private createFallbackTextarea(): void {
        // Fallback: create a simple textarea
        const textarea = this.containerEl.createEl('textarea', {
            cls: 'memos-quick-input',
            attr: {
                placeholder: this.options.placeholder || "What's on your mind?",
            }
        });

        if (this.options.initialValue) {
            textarea.value = this.options.initialValue;
        }

        // Handle keyboard events
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                if (this.options.onSubmit) {
                    this.options.onSubmit(this);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                if (this.options.onEscape) {
                    this.options.onEscape(this);
                }
            }
        });

        // Handle input changes
        if (this.options.onChange) {
            textarea.addEventListener('input', () => {
                if (this.options.onChange) {
                    this.options.onChange(this, textarea.value);
                }
            });
        }

        // Store reference for getValue
        this.editor = { getValue: () => textarea.value, setValue: (val: string) => { textarea.value = val; } };
    }

    /**
     * Get the current value of the editor
     */
    getValue(): string {
        if (!this.editor) return '';

        // Try different methods to get value
        if (typeof this.editor.getValue === 'function') {
            return this.editor.getValue();
        }

        if (typeof this.editor.get === 'function') {
            return this.editor.get();
        }

        return '';
    }

    /**
     * Set the value of the editor
     */
    setValue(value: string): void {
        if (!this.editor) return;

        // Try different methods to set value
        if (typeof this.editor.setValue === 'function') {
            this.editor.setValue(value);
        } else if (typeof this.editor.set === 'function') {
            this.editor.set(value);
        }
    }

    /**
     * Clear the editor content
     */
    clear(): void {
        this.setValue('');
    }

    /**
     * Focus the editor
     */
    focus(): void {
        if (!this.editor) return;

        if (typeof this.editor.focus === 'function') {
            this.editor.focus();
        }
    }

    /**
     * Destroy the editor and clean up resources
     */
    destroy(): void {
        if (this.editor && typeof this.editor.destroy === 'function') {
            this.editor.destroy();
        }
        this.editor = null;
    }
}
