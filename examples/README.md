# Cleanup Action Examples

Cloudflare Workers のクリーンアップアクション (cleanup) の実装例です。

## 概要

**cleanup** は Cloudflare Workers を自動削除する GitHub Action です。

主な使い方：
- **PR がクローズされたとき** → PR の Preview Worker を自動削除
- **任意のタイミングで** → パターンマッチで複数 Workers を一括削除
- **除外設定で保護** → 本番環境や重要な Workers は削除から除外

---

## 実装例

### GitHub Flow（シンプルな運用）

PR 作成 → デプロイ → PR クローズ時に自動削除

```yaml
name: Cleanup PR Worker

on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: harunonsystem/cloudflare-actions/cleanup@v1
        with:
          # PR #123 → myapp-pr-123 を削除
          worker-names: myapp-pr-${{ github.event.pull_request.number }}
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          dry-run: 'false'
```

**動作**:
- PR がクローズされると自動的に Worker が削除される
- PR #123 → `myapp-pr-123` が削除される
- 手動操作不要

---

### Git Flow（複数環境運用）

develop/staging/main ブランチを使い分け、環境ごとに異なる cleanup ルール

```yaml
name: Cleanup by Branch

on:
  pull_request:
    types: [closed]
  workflow_dispatch:

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: harunonsystem/cloudflare-actions/cleanup@v1
        with:
          # PR Worker パターンで削除
          # myapp-pr-1, myapp-pr-2, myapp-pr-3 ... など全て削除対象
          worker-pattern: 'myapp-pr-*'
          
          # develop / staging 環境は除外（削除しない）
          exclude: 'myapp-develop,myapp-staging'
          
          cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          dry-run: 'false'
```

**動作**:
- `myapp-pr-*` パターンに完全一致した Worker が削除される
  - 削除: `myapp-pr-1`, `myapp-pr-2`, `myapp-pr-123` など
  - 削除しない: `myapp-develop`, `myapp-staging`, `myapp-stg`
- 環境ブランチ（develop/staging）の Worker は安全に保護される

---

## パターンマッチと除外設定

### worker-pattern（削除対象）の例

```yaml
# Pattern: 'myapp-pr-*'
削除される:
  - myapp-pr-1
  - myapp-pr-2
  - myapp-pr-123
  - myapp-pr-feature-branch

削除されない:
  - myapp-pr         # * で 1文字以上必須
  - myapp-main
  - myapp-develop
```

### exclude（除外対象）の例

**完全一致による除外**:
```yaml
exclude: 'myapp-develop,myapp-staging,myapp'
# 削除されない:
#   - myapp-develop（完全一致）
#   - myapp-staging（完全一致）
#   - myapp（完全一致）
# 削除される:
#   - myapp-dev（部分一致は削除されない）
#   - myapp-stg（別名は削除対象）
```

**パターンによる除外**（ワイルドカード対応）:
```yaml
exclude: 'myapp-release-*,myapp-*-prod,*-stable'
# 削除されない:
#   - myapp-release-1
#   - myapp-release-v1.0
#   - myapp-release-beta
#   - myapp-service-prod
#   - myapp-api-prod
#   - staging-stable
#   - main-stable
```

### 実践例：複数環境での除外

```yaml
exclude: 'myapp,myapp-main,myapp-develop,myapp-staging,myapp-release-*,*-production'
# 削除されない例:
#   - myapp（本番）
#   - myapp-main（main ブランチ）
#   - myapp-develop（develop ブランチ）
#   - myapp-staging（staging ブランチ）
#   - myapp-release-1.0（リリース Worker）
#   - myapp-release-beta（リリース候補）
#   - api-production（他の本番 Worker）
```

---

## 入力値 (Inputs)

| 入力値 | 説明 | 必須 | 例 |
|--------|------|------|-----|
| `worker-names` | 削除対象の Worker 名（カンマ区切り） | ⚠️※1 | `myapp-pr-1,myapp-pr-2` |
| `worker-pattern` | 削除対象の Worker パターン | ⚠️※1 | `myapp-pr-*` |
| `exclude` | 削除から除外する Worker 名またはパターン（ワイルドカード対応） | ✅ | `myapp-develop,myapp-release-*,*-prod` |
| `dry-run` | 削除する前に確認するのみ | ✅ | `true` (デフォルト) |
| `cloudflare-api-token` | Cloudflare API Token | ❌ | `${{ secrets.CLOUDFLARE_API_TOKEN }}` |
| `cloudflare-account-id` | Cloudflare Account ID | ❌ | `${{ secrets.CLOUDFLARE_ACCOUNT_ID }}` |

※1: `worker-names` と `worker-pattern` のいずれか一つを指定する必要があります

#### exclude パラメータの詳細

**完全一致** （ワイルドカードなし）:
- `myapp-develop` → `myapp-develop` のみ除外
- `myapp-staging` → `myapp-staging` のみ除外

**パターンマッチ** （ワイルドカード対応）:
- `myapp-release-*` → `myapp-release-1`, `myapp-release-v1.0` など全て除外
- `*-prod` → `api-prod`, `web-prod` など全て除外
- `*-*-stable` → `main-app-stable`, `staging-api-stable` など除外

---

## 出力値 (Outputs)

ワークフロー内で結果を参照したり、Slack などに通知できます：

```yaml
- id: cleanup
  uses: harunonsystem/cloudflare-actions/cleanup@v1
  with:
    # ... configuration ...

- name: Notify Slack
  run: |
    echo "Deleted: ${{ steps.cleanup.outputs.deleted-count }} workers"
    echo "Skipped: ${{ steps.cleanup.outputs.skipped-workers }}"
```

| 出力値 | 説明 | 例 |
|--------|------|-----|
| `deleted-workers` | 削除された Worker 名の配列（JSON） | `["myapp-pr-123", "myapp-pr-124"]` |
| `deleted-count` | 削除された Worker の数 | `2` |
| `skipped-workers` | 削除失敗 / スキップされた Worker 名の配列 | `["myapp-pr-999"]` |
| `dry-run-results` | ドライランで削除対象となった Worker 名の配列 | `["myapp-pr-123", "myapp-pr-124"]` |

---

## 活用例

### Slack 通知を統合

削除完了を Slack に通知：

```yaml
- id: cleanup
  uses: harunonsystem/cloudflare-actions/cleanup@v1
  with:
    worker-pattern: 'myapp-pr-*'
    exclude: 'myapp-develop,myapp-staging'
    cloudflare-api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    dry-run: 'false'

- name: Notify Slack
  if: always()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "✅ Cleanup completed: ${{ steps.cleanup.outputs.deleted-count }} deleted"
      }
```

---

## トラブルシューティング

### 削除対象が見つからない

1. `worker-pattern` または `worker-names` が正しいか確認
2. `exclude` で誤って除外していないか確認
3. Cloudflare ダッシュボードで実際の Worker 名を確認

### 重要な Worker が削除された場合

1. Cloudflare ダッシュボードで復旧可能か確認
2. バックアップがあれば復元
3. 今後は `exclude` で保護設定を追加

---

## ベストプラクティス

### ✅ やるべきこと

1. **本番環境は必ず除外**
   ```yaml
   exclude: 'myapp,myapp-main,myapp-prod,*-production'
   ```

2. **最初は dry-run で確認**
   ```yaml
   dry-run: 'true'  # 削除対象を確認
   ```

3. **削除ログを確認**
   - GitHub Actions のログで削除結果を確認
   - Slack などで通知を設定

### ❌ しないこと

1. 本番環境を削除対象に含める
2. exclude 設定なしで広いパターン `*` を削除
3. ドライラン確認なしでいきなり削除

---

## セットアップ

### 認証情報の設定

1. GitHub Settings → Secrets and variables → Actions
2. 以下を追加：
   - `CLOUDFLARE_API_TOKEN`: Cloudflare API Token
   - `CLOUDFLARE_ACCOUNT_ID`: Cloudflare Account ID

### ワークフローファイルの作成

1. このディレクトリから `worker-delete/using-secrets.yml` をコピー
2. `.github/workflows/` に配置
3. `worker-names` / `worker-pattern` を自分の環境に合わせて編集

---

## ファイル一覧

- `worker-delete/using-secrets.yml` - GitHub Secrets を使った基本的な例
- `worker-delete/using-1pass-cli.yml` - 1Password CLI を使った例
- `worker-delete/advanced-cleanup.yml` - 応用例（ドライラン、通知など）
