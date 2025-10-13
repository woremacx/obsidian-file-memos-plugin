---
priority: 2
description: "デバッグログを設定で制御できるようにする - Show Debug Log 設定の追加"
created_at: "2025-10-13T01:09:44Z"
started_at: 2025-10-13T01:18:49Z # Do not modify manually
closed_at: 2025-10-13T01:25:37Z # Do not modify manually
---

# デバッグログ設定機能の追加

## 問題

現在、コード内に多数の `console.log` が散在しており、デバッグ時以外も常にログが出力されている。
本番環境では不要なログが出力され、コンソールが煩雑になっている。

## 目的

設定画面に "Show Debug Log" オプションを追加し、ログの表示/非表示をユーザーが制御できるようにする。

## 実装方針

### 1. Logger ユーティリティの作成

`src/Logger.ts` を新規作成し、プラグイン設定を参照してログ出力を制御する。

```typescript
export class Logger {
  private static plugin: any = null;

  static setPlugin(plugin: any): void {
    this.plugin = plugin;
  }

  static debug(...args: any[]): void {
    if (this.plugin?.settings?.showDebugLog) {
      console.log('[DEBUG]', ...args);
    }
  }

  static info(...args: any[]): void {
    console.log('[INFO]', ...args);
  }

  static warn(...args: any[]): void {
    console.warn('[WARN]', ...args);
  }

  static error(...args: any[]): void {
    console.error('[ERROR]', ...args);
  }
}
```

### 2. 設定の追加

`main.ts` の `MemosSettings` インターフェースに `showDebugLog` フィールドを追加。

```typescript
interface MemosSettings {
  useFrontmatterTitle: boolean;
  showDebugLog: boolean; // 追加
}

const DEFAULT_SETTINGS: MemosSettings = {
  useFrontmatterTitle: false,
  showDebugLog: false // デフォルトはログ非表示
}
```

### 3. 設定画面の更新

`MemosSettingTab` に "Show Debug Log" トグルを追加。

### 4. 既存の console.log を置き換え

- `MemosView.ts`: 約40箇所の `console.log` → `Logger.debug()`
- `CardComponent.ts`: 約10箇所の `console.log` → `Logger.debug()`
- `main.ts`: 必要に応じて置き換え

### 5. Logger の初期化

`main.ts` の `onload()` で `Logger.setPlugin(this)` を呼び出す。

Please record any notes related to this ticket, such as debugging information, review results, or other work logs, `251013-010944-add-debug-log-setting-note.md`.

## Tasks

- [ ] `src/Logger.ts` を新規作成
  - [ ] `Logger.setPlugin()` メソッド実装
  - [ ] `Logger.debug()` メソッド実装 (設定で制御)
  - [ ] `Logger.info()`, `Logger.warn()`, `Logger.error()` メソッド実装
- [ ] `main.ts` を更新
  - [ ] `MemosSettings` に `showDebugLog: boolean` を追加
  - [ ] `DEFAULT_SETTINGS` に `showDebugLog: false` を追加
  - [ ] `onload()` で `Logger.setPlugin(this)` を呼び出す
- [ ] 設定画面を更新
  - [ ] `MemosSettingTab` に "Show Debug Log" トグルを追加
- [ ] `MemosView.ts` の console.log を置き換え
  - [ ] 全ての `console.log` を `Logger.debug` に置き換え
  - [ ] 必要に応じて `Logger.info/warn/error` に分類
- [ ] `CardComponent.ts` の console.log を置き換え
  - [ ] 全ての `console.log` を `Logger.debug` に置き換え
- [ ] 動作確認
  - [ ] 設定OFF時: デバッグログが出力されないことを確認
  - [ ] 設定ON時: デバッグログが正常に出力されることを確認
  - [ ] 設定の永続化を確認
- [ ] Run tests before closing and pass all tests (No exceptions)
- [ ] Run `npm run build` to build the project
- [ ] Get developer approval before closing
