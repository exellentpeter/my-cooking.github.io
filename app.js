"use strict";

const storageKey = "kitchen-note.recipes.v1";
const jpegData = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;
const byId = (id) => document.getElementById(id);
const state = { recipes: sampleRecipes, view: "all", category: "all", detailId: null };
const grid = byId("recipe-grid");
const search = byId("search");
const sort = byId("sort");
const categoryBar = byId("categories");
const detail = byId("detail-dialog");
const editor = byId("editor-dialog");
const deleteDialog = byId("delete-dialog");
const backup = byId("backup-dialog");
const form = byId("recipe-form");
const field = (name) => form.elements.namedItem(name);
const toast = byId("toast");

let toastTimer;
let editingId = null;
let editingImage = "";
let imageRequest = 0;

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function icon(name) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  const use = document.createElementNS(ns, "use");
  svg.setAttribute("class", "icon");
  svg.setAttribute("aria-hidden", "true");
  use.setAttribute("href", "#i-" + name);
  svg.append(use);
  return svg;
}

function button(label, className, iconName) {
  const node = element("button", className);
  node.type = "button";
  if (iconName) node.append(icon(iconName));
  node.append(label);
  return node;
}

function message(text, node = toast) {
  node.textContent = text;
  node.hidden = !text;
  if (node === toast) {
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 4200);
  }
}

function readRecipes() {
  const stored = localStorage.getItem(storageKey);
  return stored === null ? sampleRecipes : JSON.parse(stored);
}

async function writeRecipes(merge, errorNode) {
  const persist = () => {
    const recipes = merge(readRecipes());
    localStorage.setItem(storageKey, JSON.stringify(recipes));
    state.recipes = recipes;
    return true;
  };
  try {
    return navigator.locks ? await navigator.locks.request(storageKey, persist) : persist();
  } catch (error) {
    const reason = error.name === "QuotaExceededError"
      ? "ブラウザーの保存容量に達しました。写真を外すか、バックアップを保存してからレシピを整理してください。"
      : "ブラウザーに保存できませんでした。保存先とブラウザーの設定を確認してください。";
    message(reason, errorNode);
    return false;
  }
}

function categoryLabel(category) {
  const label = element("span", "category-label", categories[category]);
  label.dataset.category = category;
  return label;
}

function photo(recipe, className, eager = false) {
  const frame = element("div", "photo " + className);
  frame.dataset.category = recipe.category;
  const placeholder = icon("pot");
  frame.append(placeholder);
  if (recipe.image) {
    const img = element("img");
    img.alt = "";
    img.loading = eager ? "eager" : "lazy";
    img.decoding = "async";
    img.addEventListener("error", () => img.remove(), { once: true });
    img.src = recipe.image;
    frame.append(img);
  }
  return frame;
}

function metadata(recipe, className = "") {
  const meta = element("div", "meta " + className);
  if (recipe.minutes) {
    const time = element("span");
    time.append(icon("clock"), recipe.minutes + "分");
    meta.append(time);
  }
  if (recipe.servings) {
    const people = element("span");
    people.append(icon("users"), recipe.servings + "人分");
    meta.append(people);
  }
  return meta;
}

function favoriteButton(recipe, inDetail = false) {
  const label = recipe.favorite ? "お気に入りから外す" : "お気に入りに追加";
  const control = button(inDetail ? "お気に入り" : "", inDetail ? "button detail-favorite" : "favorite-button", "heart");
  control.setAttribute("aria-pressed", String(recipe.favorite));
  control.setAttribute("aria-label", recipe.title + "を" + label);
  control.title = label;
  control.dataset.favorite = recipe.id;
  return control;
}

function recipeCard(recipe) {
  const card = element("article", "recipe-card");
  const content = element("div", "card-copy");
  const heading = element("h3");
  const open = button(recipe.title, "recipe-open");
  open.dataset.openRecipe = recipe.id;
  heading.append(open);
  content.append(categoryLabel(recipe.category), heading);
  if (recipe.description) content.append(element("p", "card-description", recipe.description));
  content.append(metadata(recipe, "card-meta"));
  card.append(photo(recipe, "card-photo"), content, favoriteButton(recipe));
  return card;
}

function normalized(text) {
  return text.normalize("NFKC").toLocaleLowerCase("ja").replace(/[ァ-ヶ]/g, (letter) =>
    String.fromCharCode(letter.charCodeAt(0) - 0x60));
}

function visibleRecipes() {
  const terms = normalized(search.value).trim().split(/\s+/).filter(Boolean);
  const compareRecent = (first, second) => second.createdAt - first.createdAt;
  const comparators = {
    recent: compareRecent,
    quick: (first, second) => (first.minutes ?? Infinity) - (second.minutes ?? Infinity) || compareRecent(first, second),
    name: (first, second) => first.title.localeCompare(second.title, "ja") || compareRecent(first, second),
  };
  return state.recipes.filter((recipe) => {
    if (state.view === "favorites" && !recipe.favorite) return false;
    if (state.category !== "all" && state.category !== recipe.category) return false;
    if (!terms.length) return true;
    const haystack = normalized([
      recipe.title, categories[recipe.category], recipe.description, ...recipe.ingredients, ...recipe.tags,
    ].join(" "));
    return terms.every((term) => haystack.includes(term));
  }).sort(comparators[sort.value]);
}

function render() {
  const recipes = visibleRecipes();
  const showFavorites = state.view === "favorites";
  const filtered = state.category !== "all" || Boolean(search.value.trim());
  byId("collection-title").textContent = showFavorites ? "お気に入り" : "レシピ一覧";
  byId("recipe-count").textContent = recipes.length + "件";
  document.querySelectorAll("[data-view]").forEach((control) => {
    control.setAttribute("aria-pressed", String(control.dataset.view === state.view));
  });
  categoryBar.querySelectorAll("button").forEach((control) => {
    control.setAttribute("aria-pressed", String(control.dataset.categoryFilter === state.category));
  });
  const cards = document.createDocumentFragment();
  recipes.forEach((recipe) => cards.append(recipeCard(recipe)));
  grid.replaceChildren(cards);
  byId("empty").hidden = recipes.length > 0;
  byId("empty-title").textContent = filtered ? "該当するレシピがありません" : showFavorites ? "お気に入りがまだありません" : "レシピがまだありません";
  byId("empty-text").textContent = filtered
    ? "検索キーワードやカテゴリーを変えてみてください。"
    : showFavorites ? "レシピのハートを押すと、ここに表示されます。" : "また作りたい一皿を登録しましょう。";
  byId("clear-filters").hidden = !filtered;
  byId("empty-add").hidden = filtered || showFavorites;
}

function scrollToCollection() {
  byId("recipe-section").scrollIntoView({ block: "start" });
  byId("collection-title").focus({ preventScroll: true });
}

function selectView(view) {
  state.view = view;
  state.category = "all";
  search.value = "";
  render();
  scrollToCollection();
}

function detailList(title, items, tag) {
  const section = element("section", "detail-section");
  section.append(element("h3", "", title));
  if (items.length) {
    const list = element(tag, "detail-list");
    items.forEach((item) => list.append(element("li", "", item)));
    section.append(list);
  } else {
    section.append(element("p", "subtle", "未登録"));
  }
  return section;
}

function renderDetail(recipe) {
  const intro = element("div", "detail-intro");
  intro.append(categoryLabel(recipe.category), element("h2", "", recipe.title));
  intro.querySelector("h2").id = "detail-title";
  intro.append(metadata(recipe));
  if (recipe.description) intro.append(element("p", "", recipe.description));
  if (recipe.tags.length) {
    const tags = element("div", "tags");
    recipe.tags.forEach((tag) => tags.append(element("span", "tag", "#" + tag)));
    intro.append(tags);
  }
  const actions = element("div", "dialog-actions detail-actions");
  const edit = button("編集", "button", "edit");
  edit.dataset.edit = recipe.id;
  const remove = button("削除", "text-button");
  remove.dataset.requestDelete = recipe.id;
  const error = element("p", "error");
  error.id = "detail-error";
  error.setAttribute("role", "alert");
  error.hidden = true;
  actions.append(remove, favoriteButton(recipe, true), edit);
  const content = byId("detail-content");
  const sections = [intro, detailList("材料", recipe.ingredients, "ul"), detailList("作り方", recipe.steps, "ol"), actions, error];
  if (recipe.image) sections.unshift(photo(recipe, "detail-photo", true));
  content.replaceChildren(...sections);
}

function openDetail(id) {
  const recipe = state.recipes.find((record) => record.id === id);
  if (!recipe) return;
  state.detailId = id;
  renderDetail(recipe);
  detail.showModal();
}

function showPhotoPreview() {
  byId("photo-preview-row").hidden = !editingImage;
  const preview = byId("photo-preview");
  if (editingImage) preview.src = editingImage;
  else preview.removeAttribute("src");
}

function openEditor(recipe) {
  imageRequest += 1;
  editingId = recipe?.id ?? null;
  editingImage = recipe?.image ?? "";
  form.reset();
  byId("editor-title").textContent = recipe ? "レシピを編集" : "レシピを追加";
  byId("save-recipe").disabled = false;
  field("title").value = recipe?.title ?? "";
  field("category").value = recipe?.category ?? "main";
  field("minutes").value = recipe?.minutes ?? "";
  field("servings").value = recipe?.servings ?? "";
  field("description").value = recipe?.description ?? "";
  field("ingredients").value = recipe?.ingredients.join("\n") ?? "";
  field("steps").value = recipe?.steps.join("\n") ?? "";
  field("tags").value = recipe?.tags.join("、") ?? "";
  message("", byId("form-error"));
  showPhotoPreview();
  editor.showModal();
}

function splitItems(value, delimiter = /\r?\n/) {
  return value.split(delimiter).map((item) => item.trim()).filter(Boolean);
}

async function preparePhoto(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
    throw new Error("JPEG・PNG・WebP の写真を 10 MB 以内で選択してください。");
  }
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 960 / Math.max(bitmap.width, bitmap.height));
    const canvas = element("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.78);
    if (!jpegData.test(data) || data.length > 450000) throw new Error("写真が大きすぎます。別の写真をお試しください。");
    return data;
  } finally {
    bitmap.close();
  }
}

field("photo").addEventListener("change", async () => {
  const file = field("photo").files[0];
  if (!file) return;
  const request = ++imageRequest;
  byId("save-recipe").disabled = true;
  message("", byId("form-error"));
  try {
    const image = await preparePhoto(file);
    if (request !== imageRequest || !editor.open) return;
    editingImage = image;
    showPhotoPreview();
  } catch (error) {
    if (request === imageRequest && editor.open) {
      const reason = error.name === "Error" ? error.message : "写真を読み込めませんでした。別の写真をお試しください。";
      message(reason, byId("form-error"));
      field("photo").value = "";
    }
  } finally {
    if (request === imageRequest) byId("save-recipe").disabled = false;
  }
});

byId("remove-photo").addEventListener("click", () => {
  imageRequest += 1;
  editingImage = "";
  field("photo").value = "";
  byId("save-recipe").disabled = false;
  showPhotoPreview();
  field("photo").focus();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const save = byId("save-recipe");
  if (save.disabled) return;
  const title = field("title").value.trim();
  if (!title) {
    message("料理名を入力してください。", byId("form-error"));
    field("title").focus();
    return;
  }
  const values = {
    title,
    category: field("category").value,
    minutes: field("minutes").valueAsNumber || null,
    servings: field("servings").valueAsNumber || null,
    ingredients: splitItems(field("ingredients").value),
    steps: splitItems(field("steps").value),
    description: field("description").value.trim(),
    tags: [...new Set(splitItems(field("tags").value, /[,、，\n]/))],
    image: editingImage,
  };
  const previousId = editingId;
  const id = previousId ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
  save.disabled = true;
  const saved = await writeRecipes((recipes) => {
    if (!previousId) return [{ ...values, id, favorite: false, createdAt: Date.now() }, ...recipes];
    if (!recipes.some((recipe) => recipe.id === id)) throw new Error("Recipe missing");
    return recipes.map((recipe) => recipe.id === id ? { ...recipe, ...values } : recipe);
  }, byId("form-error"));
  save.disabled = false;
  if (!saved) return;
  editor.close();
  if (previousId && detail.open) {
    renderDetail(state.recipes.find((recipe) => recipe.id === id));
    detail.querySelector("[data-edit]").focus({ preventScroll: true });
    render();
    return;
  }
  selectView("all");
  message("レシピを保存しました。");
});

async function toggleFavorite(id, control) {
  control.disabled = true;
  const saved = await writeRecipes((recipes) => recipes.map((recipe) =>
    recipe.id === id ? { ...recipe, favorite: !recipe.favorite } : recipe),
  detail.open ? byId("detail-error") : toast);
  control.disabled = false;
  if (!saved) return;
  render();
  const recipe = state.recipes.find((record) => record.id === id);
  if (detail.open && recipe) {
    const replacement = favoriteButton(recipe, true);
    control.replaceWith(replacement);
    replacement.focus({ preventScroll: true });
  } else {
    const replacement = [...grid.querySelectorAll("[data-favorite]")].find((item) => item.dataset.favorite === id);
    (replacement ?? byId("collection-title")).focus({ preventScroll: true });
  }
}

byId("confirm-delete").addEventListener("click", async (event) => {
  const id = state.detailId;
  if (!id) return;
  const control = event.currentTarget;
  control.disabled = true;
  const saved = await writeRecipes((recipes) => recipes.filter((recipe) => recipe.id !== id), byId("delete-message"));
  control.disabled = false;
  if (!saved) return;
  deleteDialog.close();
  detail.close();
  render();
  message("レシピを削除しました。");
});

byId("export-recipes").addEventListener("click", () => {
  const data = JSON.stringify({ version: 1, recipes: state.recipes }, null, 2);
  const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  const link = element("a");
  link.href = url;
  link.download = "kitchen-note-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  message("バックアップを保存しました。", byId("backup-result"));
});

function validBackupRecipe(recipe) {
  if (!recipe || typeof recipe !== "object" || Array.isArray(recipe)) return false;
  const text = (value, max) => typeof value === "string" && value.length <= max;
  const lines = (value, max) => Array.isArray(value) && value.every((item) => text(item, max))
    && value.join("\n").length <= max;
  const quantity = (value) => value === null || Number.isInteger(value) && value >= 1 && value <= 9999;
  const { id, title, category, description, ingredients, steps, tags, minutes, servings, favorite, createdAt, image } = recipe;
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(id)
    && text(title, 80) && Boolean(title.trim()) && typeof category === "string" && Object.hasOwn(categories, category)
    && text(description, 2000) && lines(ingredients, 6000) && lines(steps, 10000) && lines(tags, 240)
    && quantity(minutes) && quantity(servings) && typeof favorite === "boolean"
    && Number.isSafeInteger(createdAt) && createdAt >= 0
    && (image === "" || samplePhotos.has(image) || text(image, 450000) && jpegData.test(image));
}

byId("import-recipes").addEventListener("click", () => byId("import-file").click());
byId("import-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;
  const result = byId("backup-result");
  const importControl = byId("import-recipes");
  importControl.disabled = true;
  try {
    if (file.size > 12 * 1024 * 1024) throw new Error("File too large");
    const data = JSON.parse(await file.text());
    if (data?.version !== 1 || !Array.isArray(data.recipes) || !data.recipes.every(validBackupRecipe)) {
      throw new Error("Invalid backup");
    }
    let added = 0;
    const saved = await writeRecipes((recipes) => {
      const merged = new Map(recipes.map((recipe) => [recipe.id, recipe]));
      for (const recipe of data.recipes) {
        if (merged.has(recipe.id)) continue;
        const { id, title, category, description, ingredients, steps, tags, minutes, servings, favorite, createdAt, image } = recipe;
        merged.set(id, { id, title, category, description, ingredients, steps, tags, minutes, servings, favorite, createdAt, image });
        added += 1;
      }
      return [...merged.values()];
    }, result);
    if (saved) {
      render();
      message(added ? added + "件のレシピを追加しました。" : "追加する新しいレシピはありませんでした。", result);
    }
  } catch {
    message("バックアップを読み込めませんでした。台所ノートから保存した JSON ファイルを選んでください。", result);
  } finally {
    importControl.disabled = false;
  }
});

for (const [key, label] of [["all", "すべて"], ...Object.entries(categories)]) {
  const filter = button(label, "filter");
  filter.dataset.categoryFilter = key;
  categoryBar.append(filter);
  if (key !== "all") field("category").append(new Option(label, key));
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  const data = target.dataset;

  if ("close" in data) target.closest("dialog").close();
  if ("add" in data) openEditor();
  if ("browse" in data) selectView("all");
  if (data.view) selectView(data.view);
  if (data.categoryFilter) {
    state.category = data.categoryFilter;
    render();
  }
  if (data.openRecipe) openDetail(data.openRecipe);
  if (data.favorite) toggleFavorite(data.favorite, target);
  if (data.edit) {
    const recipe = state.recipes.find((record) => record.id === data.edit);
    if (recipe) openEditor(recipe);
  }
  if (data.requestDelete) {
    const recipe = state.recipes.find((record) => record.id === data.requestDelete);
    if (recipe) {
      byId("delete-message").textContent = "「" + recipe.title + "」を削除しますか？";
      deleteDialog.showModal();
    }
  }
  if ("openBackup" in data) {
    message("", byId("backup-result"));
    backup.showModal();
  }
});

search.addEventListener("input", render);
sort.addEventListener("change", render);
byId("clear-filters").addEventListener("click", () => {
  state.category = "all";
  search.value = "";
  render();
  search.focus();
});

detail.addEventListener("close", () => {
  const opener = [...grid.querySelectorAll("[data-open-recipe]")].find((item) => item.dataset.openRecipe === state.detailId);
  state.detailId = null;
  (opener ?? byId("collection-title")).focus({ preventScroll: true });
});

window.addEventListener("storage", (event) => {
  if (event.key !== storageKey && event.key !== null) return;
  try {
    state.recipes = readRecipes();
    render();
    if (detail.open && !editor.open && !deleteDialog.open) {
      const recipe = state.recipes.find((record) => record.id === state.detailId);
      if (recipe) renderDetail(recipe);
      else detail.close();
    }
  } catch {
    message("別のタブで変更したレシピを読み込めませんでした。");
  }
});

try {
  state.recipes = readRecipes();
} catch {
  message("保存済みのレシピを読み込めませんでした。");
}
render();
