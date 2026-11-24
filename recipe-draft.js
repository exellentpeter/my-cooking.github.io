"use strict";

function parseRecipeDraft(text) {
  const draft = { title: "", servings: "", minutes: "", ingredients: [], steps: [], description: [] };
  const sections = [
    ["ingredients", /^(?:材[料科]|村料|用意するもの)(?=$|[\s:/([)\]】〉」]|\d{1,4}\s*(?:人分|名分))/u],
    ["steps", /^(?:作り方|つくり方|作りかた|つくりかた|手順|調理方法|調理手順)(?=$|[\s:/([)\]】〉」])/u],
    ["description", /^(?:メモ|ポイント|コツ)(?=$|[\s:/([)\]】〉」])/u],
    ["ignore", /^(?:栄養成分|栄養価|エネルギー)(?=$|[\s:/([)\]】〉」])/u],
  ];
  const serving = /(?:^|[^\d])(\d{1,4})\s*(?:人分|名分)/u;
  const duration = /(?:調理時間|所要時間|目安時間)\s*[:/)]?\s*(?:約\s*)?(?:(\d{1,3})\s*時間(?:\s*(\d{1,2})\s*分)?|(\d{1,4})\s*分)/u;
  const quantity = /(?:[\d零〇一二三四五六七八九十百千万]\s*(?:mg|kg|ml|cc|g|l|個|本|枚|袋|束|株|片|切れ|粒|カップ|ミリリットル|グラム|合)(?![A-Za-z])|(?:大|小)さじ|適量|少々|ひとつまみ|\d\s*[⁄/]\s*\d)/iu;
  const stepNumber = /^\d{1,2}(?:[):、]|\.(?!\d))\s*/u;
  const sectionPrefix = /^[\s【[(〈「●■◆▶▼・]+/u;
  const sectionSuffix = /^[\s:/)\]】〉」]+/u;
  const servingLabel = /^\s*[(]?\s*\d{1,4}\s*(?:人分|名分)\s*[)】\]]?\s*[:/：]?\s*/u;
  let section = "intro";
  let numberedSteps = false;

  for (const source of text.split(/\r?\n/)) {
    let line = cleanRecipeLine(source);
    if (!line) continue;

    const heading = line.replace(sectionPrefix, "");
    const marker = sections.find(([, pattern]) => pattern.test(heading));
    if (marker) {
      section = marker[0];
      numberedSteps = false;
      line = heading.replace(marker[1], "").replace(sectionSuffix, "");
    }

    if (section === "intro" || marker?.[0] === "ingredients") {
      const servingMatch = line.match(serving);
      const timeMatch = line.match(duration);
      if (servingMatch && !draft.servings && Number(servingMatch[1]) > 0) draft.servings = Number(servingMatch[1]);
      if (timeMatch && !draft.minutes) {
        const minutes = Number(timeMatch[1] || 0) * 60 + Number(timeMatch[2] || timeMatch[3] || 0);
        if (minutes > 0 && minutes <= 9999) draft.minutes = minutes;
      }
      if (timeMatch) line = line.replace(timeMatch[0], "").trim();
      line = line.replace(servingLabel, "");
    }

    if (!line || section === "ignore") continue;
    const numbered = stepNumber.test(line);
    if (numbered && section === "intro") section = "steps";
    if (section === "ingredients" || (section === "intro" && quantity.test(line))) {
      draft.ingredients.push(line
        .replace(/^[・●■▪•*-]\s*/u, "")
        .replace(/\s*[.・…]{2,}\s*/gu, " ")
        .replace(/(?<=[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー])(?=\d|大さじ|小さじ|適量|少々|ひとつまみ)/u, " "));
    } else if (section === "steps") {
      const item = line.replace(stepNumber, "");
      if (numbered) {
        numberedSteps = true;
        draft.steps.push(item);
      } else if (numberedSteps && draft.steps.length) {
        draft.steps[draft.steps.length - 1] += item;
      } else {
        draft.steps.push(item);
      }
    } else if (section === "description") {
      draft.description.push(line);
    } else if (!draft.title && line.length <= 80 && /[\p{L}]/u.test(line)) {
      draft.title = line;
    }
  }

  return {
    ...draft,
    ingredients: draft.ingredients.join("\n"),
    steps: draft.steps.filter(Boolean).join("\n"),
    description: draft.description.join("\n"),
  };
}

function cleanRecipeLine(line) {
  const japanese = "[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}々ー]";
  return line
    .replace(/^\s*([①-⑳])/u, (_, character) => (character.codePointAt(0) - 0x245f) + ". ")
    .normalize("NFKC")
    .replace(new RegExp("(" + japanese + ")\\s+(?=" + japanese + ")", "gu"), "$1")
    .replace(/\s+([。、.!?])/gu, "$1")
    .replace(/\s+/gu, " ")
    .trim();
}
