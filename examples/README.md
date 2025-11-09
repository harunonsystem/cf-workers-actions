# Cleanup Action Examples

Cloudflare Workers のクリーンアップアクション (cleanup) の実装例です。

## 概要

**cleanup** は、Cloudflare Workers の自動削除を行う GitHub Action です。以下のシナリオで使用できます：

- **PR クローズ時**: PR に関連する Preview Workers を自動削除
- **スケジュール実行**: 古い Workers を定期的に自動削除
- **手動実行**: 特定の Workers を手動で削除

## ファイル構成

このディレクトリには、cleanup を使用する際の認証方法別サンプルが含まれています：

- **`worker-delete/using-secrets.yml`** - GitHub Secrets を使った例
- **`worker-delete/using-1pass-cli.yml`** - 1Password CLI を使った例

## 使用シーン別ガイド

### 1️⃣ PR クローズ時に PR Worker を削除

**シーン**: PR がマージされたまたはクローズされたときに、その PR で作成された Preview Worker を自動削除

**ブランチ**: PR ブランチ（任意のブランチ）  
**トリガー**: `pull_request` → `closed` イベント

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

**使い方**: 
- PR が閉じると自動的に その PR の Worker が削除される
- 例：PR #123 → `myapp-pr-123` が削除される
- 手動操作不要で自動クリーンアップ

---

### 2️⃣ スケジュール実行で古い Workers を削除

**シーン**: PR は作成されたが後で削除されたなど、置き去りになった Workers を定期的に削除

**ブランチ**: main ブランチ（スケジュールなので固定）  
**トリガー**: `schedule`（定期実行、例：毎日朝2時）

```yaml
on:
  schedule:
    # 毎日 2 AM UTC に実行
    - cron: '0 2 * * *'

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: harunonsystem/cloudflare-actions/cleanup@v1
        with:
          worker-pattern: 'myapp-pr-*'
          exclude: 'myapp,myapp-develop,myapp-staging'
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          dry-run: 'false'
```

**使い方**:
- 毎日朝2時に実行
- `myapp-pr-*` にマッチする全て の Workers を削除
- `myapp`, `myapp-develop`, `myapp-staging` は除外（保護）
- 本番環境に影響なし

---

### 3️⃣ 手動で削除（ドライラン確認付き）

**シーン**: 手動で削除対象を指定して実行、削除前にドライランで確認

**ブランチ**: main ブランチ（任意）  
**トリガー**: `workflow_dispatch`（GitHub UI から手動実行）

```yaml
on:
  workflow_dispatch:
    inputs:
      worker-pattern:
        description: 'Worker name pattern to delete (e.g. myapp-pr-*)'
        required: true
      dry-run:
        description: 'Dry run (just confirm, not delete)'
        required: false
        default: 'true'

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: harunonsystem/cloudflare-actions/cleanup@v1
        with:
          worker-pattern: ${{ github.event.inputs.worker-pattern }}
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          dry-run: ${{ github.event.inputs.dry-run }}
```

**使い方**:
- GitHub UI で "Actions" → "Manual Cleanup" → "Run workflow"
- 削除パターン入力（例：`myapp-pr-*`）
- `dry-run: true` で先に確認
- 削除対象を確認後、`dry-run: false` で再実行して削除

---

## 入力値 (Inputs)

| 入力値 | 説明 | 必須 | 例 |
|--------|------|------|-----|
| `worker-names` | 削除対象の Worker 名（カンマ区切り） | ⚠️※1 | `myapp-pr-1,myapp-pr-2` |
| `worker-pattern` | 削除対象の Worker 名パターン（glob） | ⚠️※1 | `myapp-pr-*` |
| `exclude` | 削除から除外する Worker 名またはパターン | ✅ | `myapp,*-prod` |
| `dry-run` | 削除する前に確認するのみ | ✅ | `true` (デフォルト) |
| `cloudflare-api-token` | Cloudflare API Token | ❌ | `${{ secrets.CLOUDFLARE_API_TOKEN }}` |
| `cloudflare-account-id` | Cloudflare Account ID | ❌ | `${{ secrets.CLOUDFLARE_ACCOUNT_ID }}` |

※1: `worker-names` と `worker-pattern` のいずれか一つを指定する必要があります

---

## 出力値 (Outputs)

| 出力値 | 説明 | 例 |
|--------|------|-----|
| `deleted-workers` | 削除された Worker 名の配列（JSON） | `["myapp-pr-123", "myapp-pr-124"]` |
| `deleted-count` | 削除された Worker の数 | `2` |
| `skipped-workers` | 削除失敗 / スキップされた Worker 名の配列 | `["myapp-pr-999"]` |
| `dry-run-results` | ドライランで削除対象となった Worker 名の配列（`dry-run: true` の場合のみ） | `["myapp-pr-123", "myapp-pr-124"]` |

---

## ベストプラクティス

### ✅ やるべきこと

1. **本番環境は必ず除外**
   ```yaml
   exclude: '*-production,*-prod,main-*'
   ```

2. **最初は dry-run で確認**
   ```yaml
   dry-run: 'true'  # 削除対象を確認
   ```

3. **スケジュール実行は定期的に**
   ```yaml
   schedule:
     - cron: '0 2 * * *'  # 毎日 2 AM
   ```

4. **削除ログを監視**
   - GitHub Actions のログで削除対象と結果を確認
   - Slack などで通知を設定

### ❌ しないこと

1. 本番環境を削除対象に含める
2. ドライラン確認なしでいきなり削除
3. 除外設定なしで広いパターン `*` を削除

---

## トラブルシューティング

### Q: 何も削除されない / 削除対象が見つからない

A: 以下を確認してください
- `worker-pattern` または `worker-names` が正しいか
- `dry-run: true` で削除対象を確認
- `exclude` で誤って除外していないか

### Q: API エラーが出る

A: 以下を確認してください
- API Token と Account ID が正しいか
- API Token の権限で Workers 削除が許可されているか
- GitHub Actions のログで詳細を確認

### Q: 重要な Worker が削除された

A: 復旧方法
- Cloudflare ダッシュボードで復旧可能か確認
- バックアップがあれば復元
- 今後は `exclude` で保護する

---

## 認証方法

### GitHub Secrets を使う場合

1. GitHub Settings → Secrets and variables → Actions
2. 以下を追加：
   - `CLOUDFLARE_API_TOKEN`: Cloudflare API Token
   - `CLOUDFLARE_ACCOUNT_ID`: Cloudflare Account ID
3. ワークフロー内で参照：`${{ secrets.CLOUDFLARE_API_TOKEN }}`

### 1Password CLI を使う場合

```yaml
- name: Setup 1Password CLI
  uses: 1password/load-secrets-action@v1
  with:
    export-env: true
  env:
    OP_SERVICE_ACCOUNT_TOKEN: ${{ secrets.OP_SERVICE_ACCOUNT_TOKEN }}
    CLOUDFLARE_API_TOKEN: op://vault/cloudflare-api-token
    CLOUDFLARE_ACCOUNT_ID: op://vault/cloudflare-account-id
```
