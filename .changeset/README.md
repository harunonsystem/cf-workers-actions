# Changesets

このプロジェクトは `@changesets/cli` を使用して、バージョニングと CHANGELOG の自動生成を行っています。

## 使い方

### 1. Changeset を作成

PR で変更を加えた後、以下のコマンドを実行して changeset ファイルを作成します：

```bash
pnpm changeset
```

対話的にカテゴリ（Added, Changed, Fixed など）と変更内容を選択します。

### 2. PR にコミット

作成された `.changeset/*.md` ファイルを PR にコミットします。

### 3. 自動リリース

PR が `main` にマージされると、自動的に：

1. **Release PR が作成される** - CHANGELOG と package.json が更新されたバージョンをプレビュー
2. **Release PR をマージ** - CHANGELOG が確定し、タグが自動作成
3. **GitHub Release が公開される** - タグとともに自動公開

## ファイル構成

```
.changeset/
├── config.json          # 設定ファイル
├── README.md            # このファイル
└── <hash>.md            # 変更内容（自動削除）
```

## タイプの選択

changeset コマンド実行時、以下から選択できます：

- **major** - 破壊的変更（`1.0.0` → `2.0.0`）
- **minor** - 機能追加（`1.0.0` → `1.1.0`）
- **patch** - バグ修正（`1.0.0` → `1.0.1`）

## 参考

- [Changesets 公式ドキュメント](https://github.com/changesets/changesets)
- [Keep a Changelog フォーマット](https://keepachangelog.com/)
