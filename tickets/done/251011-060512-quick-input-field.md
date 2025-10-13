---
priority: 1
description: "Thino風クイック入力欄の実装 - 高速メモキャプチャ機能"
created_at: "2025-10-11T06:05:12Z"
started_at: 2025-10-11T06:07:00Z # Do not modify manually
closed_at: 2025-10-11T14:32:24Z   # Do not modify manually
---

# クイック入力欄の実装

Thino（旧Memos）プラグインの最大の特徴である「クイック入力欄」を実装します。
現在の実装ではカードの閲覧・編集はできますが、新しいメモを素早く入力する機能が欠けています。
入力欄を追加することで「思いついたらすぐメモ」できる本来のThino体験を実現します。

Please record any notes related to this ticket, such as debugging information, review results, or other work logs, `251011-060512-quick-input-field-note.md`.


## Tasks

### コア機能
- [ ] MemosView.ts にクイック入力欄のプロパティ追加（quickInputEl）
- [ ] renderMemosView() 内にクイック入力欄のHTML生成コード追加
- [ ] handleQuickInput() メソッド実装（入力内容をファイルに保存）
- [ ] Enter/Ctrl+Enter キーで送信機能実装
- [ ] Shift+Enter で改行機能実装
- [ ] Esc キーで入力クリア機能実装

### UX改善
- [ ] 入力内容に応じた自動高さ調整（auto-resize）実装
- [ ] 空入力の送信を防止
- [ ] 送信後に入力欄を自動クリア
- [ ] 送信後に入力欄へ自動フォーカス

### スタイリング
- [ ] styles.css にクイック入力欄のスタイル追加
- [ ] プレースホルダー "What's on your mind?" 表示
- [ ] フォーカス時のハイライト効果追加
- [ ] Obsidian テーマとの一貫性確保

### ビルドとテスト
- [ ] npm run build でビルド成功を確認
- [ ] Obsidian で実際の動作確認
- [ ] 複数行入力のテスト
- [ ] キーボードショートカットの動作確認
- [ ] Get developer approval before closing
