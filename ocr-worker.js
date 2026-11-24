"use strict";

self.addEventListener("message", async ({ data }) => {
  const { image, vertical } = data;
  const language = vertical ? "jpn_vert" : "jpn";
  try {
    importScripts("./vendor/ocr/tesseract-core-lstm.wasm.js");
    const [module, model] = await Promise.all([
      TesseractCore(),
      fetch("./vendor/ocr/" + language + ".traineddata").then((response) => {
        if (!response.ok) throw new Error("Recognition model unavailable");
        return response.arrayBuffer();
      }),
    ]);

    module.FS.writeFile(language + ".traineddata", new Uint8Array(model));
    if (!vertical) {
      // This mode handles horizontal text without trying to load the vertical model.
      module.FS.writeFile("/ocr-config", "tessedit_load_sublangs\n");
    }
    const api = new module.TessBaseAPI();
    try {
      if (api.Init(null, language, 1, vertical ? undefined : "/ocr-config") !== 0) {
        throw new Error("Recognition model could not start");
      }
      api.SetVariable("tessedit_pageseg_mode", vertical ? "5" : "3");
      module.FS.writeFile("/input", new Uint8Array(await image.arrayBuffer()));
      if (api.SetImageFile(1, 0) !== 0) throw new Error("Could not open image");
      self.postMessage({ type: "recognizing" });
      const text = api.GetUTF8Text();
      self.postMessage({ type: "result", text });
    } finally {
      api.End();
      module.destroy(api);
    }
  } catch (error) {
    console.error(error);
    self.postMessage({ type: "error" });
  }
}, { once: true });
