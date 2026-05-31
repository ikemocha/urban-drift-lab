# Urban Drift Lab

地図UI風の2D都市シミュレーション実験です。

建物を直接きれいに並べる箱庭ではなく、プレイヤーが街路、駅、緑地、用途誘導、政策に介入し、その副作用として都市が年単位で変化していく様子を観察することを目指しています。

## Current Prototype

- ブラウザだけで動く静的プロトタイプ
- 地理院地図風の2Dキャンバス表示
- 60個の区画ポリゴンによる小都市
- 区画ごとの用途、地価、建蔽率上限、容積率上限、建物フットプリント
- 年送りによる自然開発、建替え、地価変化、人口・雇用変化
- 人口、地価、渋滞、満足度のレイヤー表示
- 地区差、推移グラフ、都市ログ

## Run

`index.html` をブラウザで開くだけで動きます。

ローカルサーバーで見る場合:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:4173/index.html
```

## Test

Bundled Node.js が使える場合:

```powershell
& 'C:\Users\kasek\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --check app.js
& 'C:\Users\kasek\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' smoke-test.js
```

## Files

- `index.html`: UI shell
- `styles.css`: layout and visual design
- `app.js`: simulation, rendering, interactions
- `smoke-test.js`: lightweight runtime smoke test with a DOM/canvas mock
