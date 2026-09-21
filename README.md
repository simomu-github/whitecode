# Whitecode

難解プログラミング言語 [Whitespace](https://en.wikipedia.org/wiki/Whitespace_(programming_language)) 専用のデスクトップエディタ。Tauri + React + TypeScript 製。

技術スタックの詳細は [whitecode-stack.md](whitecode-stack.md) を参照。

## 開発環境

- Node.js 26.8.2(nodenv / `.node-version`)
- pnpm(Corepack 経由。`npm i -g corepack && corepack enable pnpm`)
- Rust と [Tauri の前提ライブラリ](https://tauri.app/start/prerequisites/)

## コマンド

```sh
pnpm install     # 依存関係のインストール
pnpm tauri dev   # 開発モードで起動
pnpm tauri build # リリースビルド
```

## 推奨 IDE 設定

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
