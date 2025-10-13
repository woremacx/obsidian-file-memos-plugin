/**
 * Logger utility for controlling debug output
 * Debug logs are only shown when showDebugLog setting is enabled
 */
export class Logger {
	private static plugin: any = null;

	/**
	 * Set the plugin instance to access settings
	 */
	static setPlugin(plugin: any): void {
		this.plugin = plugin;
	}

	/**
	 * Debug log - only shown when showDebugLog setting is enabled
	 */
	static debug(...args: any[]): void {
		if (this.plugin?.settings?.showDebugLog) {
			console.log('[DEBUG]', ...args);
		}
	}

	/**
	 * Info log - always shown
	 */
	static info(...args: any[]): void {
		console.log('[INFO]', ...args);
	}

	/**
	 * Warning log - always shown
	 */
	static warn(...args: any[]): void {
		console.warn('[WARN]', ...args);
	}

	/**
	 * Error log - always shown
	 */
	static error(...args: any[]): void {
		console.error('[ERROR]', ...args);
	}
}
