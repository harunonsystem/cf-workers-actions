# Cleanup Action - 完全ガイド

Cloudflare Workers を自動削除する cleanup アクションの完全な実装ガイドです。

---

## 概要

cleanup アクションは 2つの方法で Workers を削除できます：

| 方法             | `worker-names`          | `worker-pattern`       |
| ---------------- | ----------------------- | ---------------------- |
| **削除方式**     | 完全一致（リスト指定）  | ワイルドカードマッチ   |
| **指定例**       | `myapp-pr-1,myapp-pr-2` | `myapp-pr-*`           |
| **削除対象**     | 指定したもののみ        | パターンに合致した全て |
| **複数パターン** | ✅ 複数指定可           | ❌ 1つのみ             |
| **使う場面**     | PR 番号で削除           | 定期クリーンアップ     |

---

## 4つの削除パターン

### パターン1️⃣: 特定の Worker だけ削除

**使い方**: PR #1, #2 は削除したいが、PR #3 は残したい

```yaml
worker-names: 'myapp-pr-1,myapp-pr-2'
worker-pattern: ''
```

**削除結果**:

- ✅ `myapp-pr-1` → 削除
- ✅ `myapp-pr-2` → 削除
- ❌ `myapp-pr-3` → **削除しない**（指定されていない）

**重要**: `worker-pattern` は指定しない（ブランク）

---

### パターン2️⃣: パターンで全て削除

**使い方**: PR Worker は全部削除

```yaml
worker-names: ''
worker-pattern: 'myapp-pr-*'
```

**削除結果**:

- ✅ `myapp-pr-1` → 削除
- ✅ `myapp-pr-2` → 削除
- ✅ `myapp-pr-3` → **削除**
- ✅ `myapp-pr-999` → 削除

**重要**: `worker-names` は指定しない（ブランク）

---

### パターン3️⃣: パターン + 一部除外

**使い方**: PR Worker は全部削除するが、PR #3 だけ残す

```yaml
worker-names: ''
worker-pattern: 'myapp-pr-*'
exclude: 'myapp-pr-3'
```

**削除結果**:

- ✅ `myapp-pr-1` → 削除
- ✅ `myapp-pr-2` → 削除
- ❌ `myapp-pr-3` → **削除しない**（除外指定）
- ✅ `myapp-pr-999` → 削除

**重要**: `worker-names` は指定しない、`exclude` で除外

---

### パターン4️⃣: 複数環境を除外

**使い方**: PR Worker は全部削除するが、環境ブランチは保護

```yaml
worker-pattern: 'myapp-pr-*'
exclude: 'myapp,myapp-dev,myapp-stg,myapp-release-*'
```

**削除結果**:

- ✅ `myapp-pr-1` → 削除
- ✅ `myapp-feature-x` → 削除
- ❌ `myapp` → **削除しない**（除外: 本番環境）
- ❌ `myapp-dev` → **削除しない**（除外: develop ブランチ）
- ❌ `myapp-stg` → **削除しない**（除外: staging ブランチ）
- ❌ `myapp-release-1.0` → **削除しない**（除外: リリース）

---

## 使用タイミング

### PR がクローズされたときに自動削除

```yaml
on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: harunonsystem/cloudflare-actions/cleanup@v1
        with:
          worker-names: myapp-pr-${{ github.event.pull_request.number }}
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          dry-run: 'false'
```

→ PR #123 がクローズされると `myapp-pr-123` が削除される

---

### 手動実行で削除パターンを選択

```yaml
on:
  workflow_dispatch:
    inputs:
      deletion-type:
        description: 'Deletion type'
        required: true
        type: choice
        options:
          - by-pattern
          - by-names
      worker-input:
        description: 'Pattern (myapp-pr-*) or Names (myapp-pr-1,myapp-pr-2)'
        required: true
        default: 'myapp-pr-*'
      dry-run:
        description: 'Dry run (true=確認のみ, false=実削除)'
        required: false
        default: 'true'

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: harunonsystem/cloudflare-actions/cleanup@v1
        with:
          worker-pattern: ${{ github.event.inputs.deletion-type == 'by-pattern' && github.event.inputs.worker-input || '' }}
          worker-names: ${{ github.event.inputs.deletion-type == 'by-names' && github.event.inputs.worker-input || '' }}
          exclude: 'myapp,myapp-dev,myapp-stg,myapp-release-*'
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          dry-run: ${{ github.event.inputs.dry-run }}
```

→ GitHub UI から削除パターンを選択して実行

---

## 入力値 (Inputs)

```yaml
worker-names: 'myapp-pr-1,myapp-pr-2' # 完全一致、複数指定可
worker-pattern: 'myapp-pr-*' # ワイルドカード、1つのみ
exclude: 'myapp-dev,myapp-release-*' # 除外設定、ワイルドカード対応
dry-run: 'true' # true=確認のみ, false=実削除
cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

### ⚠️ 重要なルール

`worker-names` と `worker-pattern` は **必ずどちらか一つだけ指定**

| 指定方法                                       | 結果      |
| ---------------------------------------------- | --------- |
| `worker-names: 'a,b'`, `worker-pattern: ''`    | ✅ OK     |
| `worker-names: ''`, `worker-pattern: 'a-*'`    | ✅ OK     |
| `worker-names: 'a,b'`, `worker-pattern: 'a-*'` | ❌ エラー |
| `worker-names: ''`, `worker-pattern: ''`       | ❌ エラー |

---

## exclude パラメータ

### 完全一致による除外

```yaml
exclude: 'myapp,myapp-dev,myapp-stg'
```

- `myapp` のみ除外
- `myapp-dev` は削除される（部分一致）

### パターンによる除外

```yaml
exclude: 'myapp-release-*,*-prod,*-production'
```

- `myapp-release-1`, `myapp-release-v1.0` 除外
- `api-prod`, `web-prod` 除外

---

## トラブルシューティング

### 削除対象が見つからない

- `worker-names` / `worker-pattern` を確認
- `exclude` で誤って除外していないか確認
- Cloudflare ダッシュボードで実際の Worker 名を確認

### 重要な Worker が削除された

- Cloudflare ダッシュボードで復旧可能か確認
- `exclude` に追加して保護

---

## 出力値 (Outputs)

```yaml
- id: cleanup
  uses: harunonsystem/cloudflare-actions/cleanup@v1
  with: # ...

- name: Notify Slack
  run: |
    echo "Deleted: ${{ steps.cleanup.outputs.deleted-count }}"
```

| 出力値            | 説明                                         |
| ----------------- | -------------------------------------------- |
| `deleted-workers` | 削除された Worker 名の配列（JSON）           |
| `deleted-count`   | 削除された Worker の数                       |
| `skipped-workers` | 削除失敗した Worker 名の配列                 |
| `dry-run-results` | ドライランで削除対象となった Worker 名の配列 |

---

## サンプルファイル

このディレクトリの実装例：

- **`using-secrets.yml`** - GitHub Secrets を使った基本例
- **`using-1pass-cli.yml`** - 1Password CLI を使った例
- **`gitflow-cleanup.yml`** - Git Flow（複数環境）例
- **`advanced-cleanup.yml`** - ドライラン + Slack 通知例

各ファイルをコピーして `.github/workflows/` に配置し、自分の環境に合わせて編集してください。
