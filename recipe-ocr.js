"use strict";

(() => {
  const dialog = document.getElementById("ocr-dialog");
  const form = document.getElementById("recipe-form");
  const imageInput = document.getElementById("ocr-image");
  const direction = document.getElementById("ocr-direction");
  const preview = document.getElementById("ocr-preview");
  const readButton = document.getElementById("ocr-read");
  const transcript = document.getElementById("ocr-transcript");
  const applyButton = document.getElementById("ocr-apply");
  const overwrite = document.getElementById("ocr-overwrite");
  const feedback = document.getElementById("ocr-feedback");
  const draftStatus = document.getElementById("ocr-draft-status");
  const workerUrl = new URL("./ocr-worker.js", document.currentScript.src);
  const photoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  const maxPhotoSize = 20 * 1024 * 1024;

  let worker;
  let previewUrl;
  let timeout;
  let revision = 0;

  function showFeedback(text, error = false) {
    feedback.textContent = text;
    feedback.classList.toggle("error", error);
  }

  function setBusy(busy) {
    readButton.disabled = busy || !imageInput.files.length;
    applyButton.disabled = busy;
    imageInput.disabled = busy;
    direction.disabled = busy;
    transcript.readOnly = busy;
  }

  function stopRead() {
    revision += 1;
    clearTimeout(timeout);
    worker?.terminate();
    worker = null;
    setBusy(false);
  }

  function clearPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    preview.removeAttribute("src");
    preview.hidden = true;
  }

  async function imageForRecognition(file) {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, 3000 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const image = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.94));
      if (!image) throw new Error("Could not prepare image");
      return image;
    } finally {
      bitmap.close();
    }
  }

  document.getElementById("ocr-open").addEventListener("click", () => {
    dialog.showModal();
  });

  document.getElementById("editor-dialog").addEventListener("close", () => {
    draftStatus.textContent = "";
    draftStatus.hidden = true;
  });

  dialog.addEventListener("close", () => {
    clearPreview();
    imageInput.value = "";
    direction.value = "horizontal";
    transcript.value = "";
    overwrite.checked = false;
    showFeedback("");
    stopRead();
  });

  imageInput.addEventListener("change", () => {
    clearPreview();
    showFeedback("");
    const file = imageInput.files[0];
    if (file && (!photoTypes.has(file.type) || file.size > maxPhotoSize)) {
      imageInput.value = "";
      showFeedback("JPEG・PNG・WebP 形式の写真を 20 MB 以内で選択してください。", true);
    } else if (file) {
      previewUrl = URL.createObjectURL(file);
      preview.src = previewUrl;
      preview.hidden = false;
    }
    setBusy(false);
  });

  readButton.addEventListener("click", async () => {
    const file = imageInput.files[0];
    if (!file) return;
    if (location.protocol === "file:") {
      showFeedback("写真を読み取るには GitHub Pages またはローカルサーバーでサイトを開いてください。", true);
      return;
    }

    const current = ++revision;
    setBusy(true);
    showFeedback("写真を準備しています…");
    let image;
    try {
      image = await imageForRecognition(file);
    } catch {
      if (current !== revision || !dialog.open) return;
      stopRead();
      showFeedback("写真を開けませんでした。別の写真を選択してください。", true);
      return;
    }
    if (current !== revision || !dialog.open) return;

    const fail = (text) => {
      if (current !== revision || !dialog.open) return;
      stopRead();
      showFeedback(text, true);
    };

    const unavailable = "文字を読み取れませんでした。ページを読み込み直すか、文字を手入力してください。";
    try {
      showFeedback("読み取り機能を読み込んでいます…");
      worker = new Worker(workerUrl);
      worker.addEventListener("error", () => fail(unavailable));
      worker.addEventListener("message", ({ data }) => {
        if (current !== revision || !dialog.open) return;
        if (data.type === "recognizing") {
          showFeedback("文字を読み取っています…");
        } else if (data.type === "result") {
          stopRead();
          const text = data.text.trim();
          if (!text) {
            showFeedback("文字が見つかりませんでした。ページに近づいて撮り直すか、文字を手入力してください。", true);
          } else {
            transcript.value = text;
            showFeedback("読み取りました。結果を確認してから下書きに反映できます。");
            transcript.focus();
          }
        } else {
          fail(unavailable);
        }
      });

      timeout = setTimeout(() => {
        fail("読み取りに時間がかかっています。写真を1レシピ分に切り抜いてから試してください。");
      }, 90000);
      worker.postMessage({ image, vertical: direction.value === "vertical" });
    } catch {
      fail(unavailable);
    }
  });

  applyButton.addEventListener("click", () => {
    const draft = parseRecipeDraft(transcript.value);
    const fields = Object.entries(draft)
      .filter(([name, value]) => value && (overwrite.checked || !form.elements.namedItem(name).value.trim()));
    const tooLong = fields.some(([name, value]) => {
      const limit = form.elements.namedItem(name).maxLength;
      return typeof value === "string" && limit >= 0 && value.length > limit;
    });
    if (tooLong) {
      showFeedback("入力欄に収まらない項目があります。文字起こしを1レシピ分に絞ってください。", true);
      return;
    }
    if (!fields.length) {
      showFeedback(Object.values(draft).some(Boolean)
        ? "反映できる空欄がありません。置き換える場合はチェックを入れてください。"
        : "料理名や「材料」「作り方」の見出しを付けて、文字起こしを確認してください。", true);
      return;
    }
    for (const [name, value] of fields) form.elements.namedItem(name).value = value;
    draftStatus.textContent = fields.length + "項目を反映しました。分量と手順を確認してから保存してください。";
    draftStatus.hidden = false;
    dialog.close();
  });
})();
