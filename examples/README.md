# Cloudflare Actions Examples

このディレクトリには、Cloudflare Actionsの実際の使用例が含まれています。

## 📋 ワークフローの流れ

すべての例は以下の順序で実行されます：

1. **preview-deploy.yml** - PRでのプレビューデプロイとコメント投稿
2. **deploy.yml** - 本番環境への自動デプロイ
3. **worker_delete.yml** - 不要なWorkerの自動削除

## 💡 このActionの価値

### Preview環境での動的Worker名生成

このActionの主な価値は**Preview環境でのPR番号からの動的Worker名生成**です：

- **PR番号ベースの動的命名**: `myapp-pr-123` のような自動生成
- **PRコメント統合**: デプロイURL付きコメントの自動投稿（github-token提供時）
- **統合処理**: デプロイ→コメント投稿を1stepで完了

**使い分け:**

- **Preview**: このActionを使用（動的Worker名が必要）
- **Production**: 直接`cloudflare/wrangler-action`を使用（wrangler.tomlで十分）

## 🔧 サンプル構成

### 📁 `using-secrets/`

**GitHub Secretsを使用したシンプルな例**

基本的なデプロイとクリーンアップのワークフロー。GitHub Settings > Actions > Environments で `preview` と `production` 環境を設定し、それぞれに以下のSecretsを配置：

**必要な GitHub Secrets:**

| environment | Secret Name             | Description           |
| ----------- | ----------------------- | --------------------- |
| preview     | `CLOUDFLARE_API_TOKEN`  | Cloudflare API token  |
| preview     | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |
| production  | `CLOUDFLARE_API_TOKEN`  | Cloudflare API token  |
| production  | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |

### 📁 `using-1pass-cli/`

**1Password CLIを使用したセキュアなシンプル例**

より高いセキュリティレベルで認証情報を管理したシンプルなワークフロー。

**必要な GitHub Secrets:**

```
OP_SERVICE_ACCOUNT_TOKEN   # 1Password Service Account token
```

**1Password Vault構造:**

```
cloudflare/
├── preview/
│   ├── cloudflare-api-token
│   └── cloudflare-account-id
└── production/
    ├── cloudflare-api-token
    └── cloudflare-account-id
```

### 📁 `advanced/`

**エンタープライズ向け高度な例**

本格的な本番運用に必要な高度な機能を実装した例。基本例から段階的に学習したい場合や、より高度な機能が必要な場合に参照してください。

#### `advanced/preview-deploy/`

**高度なプレビューデプロイ機能:**

- **Multi-environment サポート**: preview/staging/development環境の切り替え
- **Deployment presets**: minimal/standard/performance/debug/security-enhanced設定
- **Smart validation**: draft PR検出、skip-deployラベル対応、フォーク検出
- **Dynamic secrets management**: 環境別シークレット + カスタムシークレット注入
- **Build optimization**: 環境に応じた最適化ビルドとアーティファクト管理
- **Health checks & monitoring**: デプロイ後のヘルスチェック、セキュリティ監査
- **Comprehensive reporting**: 詳細なデプロイサマリーとコンプライアンスレポート

#### `advanced/worker-delete/`

**高度なWorkerクリーンアップ機能:**

- **Flexible patterns**: カスタムWorkerパターンと除外パターン
- **Emergency cleanup**: 緊急時の一括削除モード
- **Audit mode**: 削除対象の確認のみを行うモード
- **Multi-job coordination**: 複数ジョブでの協調処理
- **Orphaned workers detection**: 孤立したWorkerの自動検出
- **Advanced reporting**: 詳細なクリーンアップレポートと監査ログ
- **Security compliance**: セキュリティ基準に準拠した削除プロセス

## 🚀 使用方法

### シンプル版（getting started）

#### using-secrets の場合

1. **Environment設定**
   - GitHub repository > Settings > Actions > Environments
   - `preview` と `production` 環境を作成
   - 各環境に必要なSecretsを設定

2. **ワークフローのコピー**

   ```bash
   cp examples/using-secrets/*.yml .github/workflows/
   ```

3. **設定のカスタマイズ**
   - Worker名パターンを調整
   - ビルドコマンドを調整
   - 環境変数を調整

#### using-1pass-cli の場合

1. **1Password設定**
   - Service Accountを作成
   - 必要なVaultとアイテムを作成
   - `OP_SERVICE_ACCOUNT_TOKEN` をGitHub Secretsに設定

2. **ワークフローのコピー**

   ```bash
   cp examples/using-1pass-cli/*.yml .github/workflows/
   ```

3. **Vault参照パスを調整**
   - `op://vault-name/item-name/field-name` の形式
   - 実際のVault構造に合わせて修正

### 高度版（enterprise ready）

エンタープライズ環境や本格的な本番運用で高度な機能が必要な場合は `advanced/` ディレクトリの例を参照してください。

#### Preview Deploy Advanced API

**workflow_dispatch inputs:**

| Input                 | Type    | Default    | Description                                                        |
| --------------------- | ------- | ---------- | ------------------------------------------------------------------ |
| `pr_number`           | string  | -          | PR番号を指定（空の場合は現在のブランチ）                           |
| `environment_type`    | choice  | `preview`  | 環境タイプ: preview/staging/development                            |
| `custom_worker_name`  | string  | -          | カスタムWorker名（パターンを上書き）                               |
| `skip_build`          | boolean | `false`    | ビルドステップをスキップ                                           |
| `deployment_config`   | choice  | `standard` | デプロイ設定: minimal/standard/performance/debug/security-enhanced |
| `custom_secrets`      | string  | -          | 追加シークレットJSON（デフォルトとマージ）                         |
| `vault_path_override` | string  | -          | 1Password vault パスを上書き（1pass版のみ）                        |
| `enable_monitoring`   | boolean | `false`    | 監視とアラートを有効化（1pass版のみ）                              |

**Smart Validation Rules:**

- Draft PRは自動スキップ
- `skip-deploy`ラベル付きPRはスキップ
- フォークからのPRは制限モード適用（1pass版）

**Deployment Config Effects:**

- `minimal`: 最小構成（LOG_LEVEL=error）
- `standard`: 標準構成（LOG_LEVEL=info）
- `performance`: 最適化構成（キャッシュ・圧縮有効）
- `debug`: デバッグ構成（ソースマップ・詳細ログ）
- `security-enhanced`: セキュリティ強化（レート制限・IPホワイトリスト）

**Environment-specific Features:**

- 各環境で異なるシークレット自動ロード
- 環境別ビルド最適化（build:preview/staging/dev）
- ヘルスチェックとセキュリティ監査
- アーティファクト管理（30-90日保持）

#### Worker Delete Advanced API

**workflow_dispatch inputs:**

| Input                   | Type    | Default              | Description                                   |
| ----------------------- | ------- | -------------------- | --------------------------------------------- |
| `dry_run`               | boolean | `true`               | ドライランモード（実際の削除は行わない）      |
| `max_age_days`          | string  | `7`                  | 保持する最大日数                              |
| `emergency_cleanup`     | boolean | `false`              | 緊急クリーンアップ（全プレビューWorker削除）  |
| `exclude_patterns`      | string  | `*-prod*,*-staging*` | 除外パターン（カンマ区切り）                  |
| `custom_worker_pattern` | string  | -                    | カスタムWorkerパターン（デフォルトを上書き）  |
| `audit_only`            | boolean | `false`              | 監査のみモード（削除操作なし）（1pass版のみ） |

**Operation Modes:**

- **Standard**: PRクローズ時の個別削除 + 定期クリーンアップ
- **Emergency**: 指定パターンの一括削除（exclude適用）
- **Audit**: 削除対象の特定のみ（実削除なし）
- **Orphaned Detection**: 孤立Workerの自動検出と削除

**Safety Features:**

- デフォルトでdry_run=true
- 本番系パターンは自動除外
- confirm-deletionによる明示的確認
- 包括的な監査ログ出力

**Multi-job Coordination:**

1. 認証情報セットアップ（1pass版）
2. PR/定期クリーンアップ
3. 孤立Worker検出・削除
4. 監査・レポート生成

**Security Compliance:**

- 全操作の監査ログ
- セキュリティヘッダー検証
- コンプライアンスレポート生成
- 90日間のレポート保持

これらの高度な機能は、シンプル版で基本を理解してから段階的に導入することを推奨します。

## 📝 設定のカスタマイズ

### Worker名のパターン

```yaml
worker-name-pattern: 'myapp-pr-{pr_number}'   # using-secrets
worker-name-pattern: 'secure-app-pr-{pr_number}'  # using-1pass-cli
```

### 除外パターン

```yaml
exclude-pattern: 'myapp-pr-${{ github.event.pull_request.number }}'
# 現在のPRのWorkerは削除対象から除外
```

### 環境変数とSecrets

```yaml
vars: |
  {
    "ENVIRONMENT": "preview",
    "API_BASE_URL": "https://api.preview.example.com"
  }
secrets: |
  {
    "DATABASE_URL": "${{ secrets.PREVIEW_DATABASE_URL }}",
    "API_KEY": "${{ secrets.PREVIEW_API_KEY }}"
  }
```

## 🔒 セキュリティのベストプラクティス

### GitHub Secrets使用時

1. **環境分離**
   - Preview/Production環境で異なるSecrets
   - 最小権限の原則

2. **Secret命名規則**
   - `PREVIEW_*` / `PRODUCTION_*` のプレフィックス
   - 分かりやすい命名

### 1Password CLI使用時

1. **Service Account**
   - 専用のService Accountを作成
   - 必要最小限の権限のみ付与

2. **Vault構造**
   - 環境別にアイテムを分離
   - 一貫したパス構造

## 🐛 トラブルシューティング

### Environment設定が反映されない

- Repository Settings > Actions > Environments で環境が作成されているか確認
- workflow内の `environment:` 指定が正しいか確認

### 1Password CLI でエラー

- Service Account tokenが有効か確認
- Vault参照パスが正しいか確認 (`op://vault/item/field`)
- 1Password CLI actionのバージョンを確認

### デプロイが失敗する

- API tokenとAccount IDの値が正しいか確認
- Worker名にCloudflareの制限に反する文字が含まれていないか確認
- スクリプトファイルのパスが正しいか確認

## 📚 参考資料

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [GitHub Actions Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [1Password CLI Documentation](https://developer.1password.com/docs/cli/)
- [1Password GitHub Actions](https://developer.1password.com/docs/ci-cd/github-actions/)
