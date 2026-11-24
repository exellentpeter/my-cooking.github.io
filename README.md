# 台所ノート

材料と作り方を記録し、また作りたい料理を見つける自分用のレシピ帳です。HTML・CSS・JavaScript で動作します。

## 使い方

- 「レシピを追加」から料理名、カテゴリー、調理時間、人数、材料、作り方、メモ、タグ、写真を登録できます。必須項目は料理名です。
- 料理名・食材・タグの検索、カテゴリーでの絞り込み、所要時間や名前での並べ替えができます。
- カードを開くと材料と作り方を確認し、編集・削除できます。ハートを押すとお気に入りに登録できます。
- 初回はサンプルレシピが6件表示されます。通常のレシピと同じように編集・削除できます。


## 料理本の写真からレシピを追加する

1. 「レシピを追加」の「本の写真から入力」を開きます。
2. 日本語の料理本の写真を選び、横書き・縦書きを指定して「文字を読み取る」を押します。JPEG・PNG・WebP に対応し、上限は 20 MB です。
3. 文字起こしを確認し、「下書きを反映」を押します。「材料」「作り方」などの見出しを手がかりに、料理名、材料、作り方、人数、調理時間、メモを仕分けします。
4. 追加フォームで分量と手順を確認して「保存する」を押します。

初期設定では空いている項目だけに反映します。入力済みの項目を入れ替える場合は「入力済みの項目も置き換える」を選びます。見開きや複数の料理が写った写真は、対象の1品だけに切り抜くと読み取りやすくなります。

写真の認識には同梱した [Tesseract.js Core v7.0.0](https://github.com/naptha/tesseract.js-core/tree/v7.0.0) と [日本語モデル](https://github.com/tesseract-ocr/tessdata_fast/tree/4.1.0) を使用します。処理はブラウザー内で行い、本のページ写真はアップロードや保存をしません。ローカルでは下記の HTTP サーバー経由で開いてください。
## 保存とバックアップ

登録内容と写真は、そのサイトを開いたブラウザーのローカルストレージに保存します。端末、ブラウザーのプロファイル、サイトの URL が変わると保存先も変わります。ブラウザーの閲覧データを消去する前に「データの管理」から JSON を保存してください。別の端末などで JSON を読み込むと、登録済みのレシピを残して、ID が異なるレシピを追加します。

サイトを公開すると、画面とサンプルレシピが GitHub Pages に掲載されます。画面から追加したレシピが GitHub に送信されることはありません。

## ローカルで確認する

リポジトリのルートで `python -m http.server 8000 --bind 127.0.0.1` を実行し、ブラウザーで [http://127.0.0.1:8000/](http://127.0.0.1:8000/) を開きます。公開先にもバックアップを読み込めます。

## GitHub Pages

リポジトリの **Settings → Pages** で、公開ソースに **Deploy from a branch**、ブランチに **main**、フォルダーに **/(root)** を指定します。公開元へ反映すると、[GitHub Pages](https://exellentpeter.github.io/my-cooking.github.io/) で確認できます。[`index.html` を公開する手順](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## 料理画像

サンプル画像は、[Open Recipe Corpus](https://github.com/Rippy1911/open-recipe-corpus/tree/86102603bac07d79b94bc35cba5b50346798cc09) の AI 生成イメージです。[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) で提供されています。

- `assets/kitchen.webp` [beef-pepper-rice](https://github.com/Rippy1911/open-recipe-corpus/blob/86102603bac07d79b94bc35cba5b50346798cc09/ai-recipe-images/beef-pepper-rice/hero.webp)
- `assets/salmon.webp` [salmon-rice](https://github.com/Rippy1911/open-recipe-corpus/blob/86102603bac07d79b94bc35cba5b50346798cc09/ai-recipe-images/salmon-rice/hero.webp)
- `assets/pasta.webp` [mushroom-garlic-pasta](https://github.com/Rippy1911/open-recipe-corpus/blob/86102603bac07d79b94bc35cba5b50346798cc09/ai-recipe-images/mushroom-garlic-pasta/hero.webp)
- `assets/soup.webp` [white-bean-vegetable-soup](https://github.com/Rippy1911/open-recipe-corpus/blob/86102603bac07d79b94bc35cba5b50346798cc09/ai-recipe-images/white-bean-vegetable-soup/hero.webp)
- `assets/omelette.webp` [mushroom-omelette](https://github.com/Rippy1911/open-recipe-corpus/blob/86102603bac07d79b94bc35cba5b50346798cc09/ai-recipe-images/mushroom-omelette/hero.webp)
- `assets/salad.webp` [chickpea-couscous](https://github.com/Rippy1911/open-recipe-corpus/blob/86102603bac07d79b94bc35cba5b50346798cc09/ai-recipe-images/chickpea-couscous/hero.webp)
- `assets/curry.webp` [chicken-spinach-curry](https://github.com/Rippy1911/open-recipe-corpus/blob/86102603bac07d79b94bc35cba5b50346798cc09/ai-recipe-images/chicken-spinach-curry/hero.webp)
