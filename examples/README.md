# Examples

Cloudflare Workers のクリーンアップアクション (cleanup) の実装例です。

## 📖 完全ガイド

**詳細なドキュメント、パターン別ガイド、シーン別実装例は以下をご覧ください：**

👉 **[cleanup/README.md](./cleanup/README.md)** ← ここから始めてください

---

## サンプルファイル

### cleanup/

cleanup アクションのサンプル実装：

- **`cleanup/using-secrets.yml`** - GitHub Secrets を使った基本的な例
- **`cleanup/using-1pass-cli.yml`** - 1Password CLI を使った例
- **`cleanup/gitflow-cleanup.yml`** - Git Flow（複数環境）パターン例
- **`cleanup/advanced-cleanup.yml`** - 応用例（ドライラン、Slack 通知など）

---

## クイックスタート

1. **cleanup/README.md を読む** → 4つの削除パターンを理解
2. **サンプルファイルをコピー** → `.github/workflows/` に配置
3. **自分の環境に合わせて編集** → Worker 名のプリフィックスなど
4. **Secrets を設定** → CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID

詳細は [cleanup/README.md](./cleanup/README.md) をご覧ください。
