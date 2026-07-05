const data = window.curriculumData;
const malanLessons = window.malanLessons || [];
const googleDocUrl = "https://docs.google.com/document/create";
const state = {
  selectedCompetencies: new Set(["B1", "B2"]),
  selectedPerformances: new Set(["1-V-5", "3-V-6"]),
  selectedContents: new Set(["Ad-V-3", "Ba-V-5"]),
  selectedStrategies: new Set(["Scaffolding 鷹架理論", "Task-based 任務導向教學"]),
  selectedIssues: new Set(["原住民族教育", "多元文化教育"]),
  activeLesson: null,
  checks: new Set()
};

const titles = {
  materials: "步驟一：教材準備",
  basics: "步驟二：基本資料與教學策略",
  curriculum: "步驟三：課綱對應與核心素養",
  issues: "步驟四：議題融入",
  activities: "步驟五：學生本位活動與評量",
  export: "步驟六：預覽與匯出"
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function normalizeCode(value) {
  return String(value).replaceAll("Ⅴ", "V").toLowerCase();
}

function toast(message) {
  const node = $("#toast");
  node.textContent = message;
  node.classList.add("show");
  window.setTimeout(() => node.classList.remove("show"), 2200);
}

function makeCheckbox({ value, checked, title, detail, datasetType }) {
  const label = document.createElement("label");
  label.className = datasetType === "curriculum" ? "curriculum-item" : "option-card";
  label.innerHTML = `
    <input type="checkbox" value="${value}" ${checked ? "checked" : ""}>
    <span>
      ${datasetType === "curriculum" ? `<span class="tag">${value}</span>` : `<strong>${title}</strong>`}
      ${datasetType === "curriculum" ? `<p>${detail}</p>` : detail ? `<small>${detail}</small>` : ""}
    </span>
  `;
  return label;
}

function renderStrategies() {
  const host = $("#strategyList");
  host.innerHTML = "";
  data.strategies.forEach((strategy) => {
    const node = makeCheckbox({
      value: strategy,
      checked: state.selectedStrategies.has(strategy),
      title: strategy,
      detail: "",
      datasetType: "option"
    });
    node.querySelector("input").addEventListener("change", (event) => {
      toggleSet(state.selectedStrategies, strategy, event.target.checked);
      renderExport();
    });
    host.appendChild(node);
  });
}

function renderLessonPicker() {
  const select = $("#lessonSelect");
  if (!select) return;
  select.innerHTML = "";
  if (!malanLessons.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "尚未建立馬蘭教師3階教材包";
    select.appendChild(option);
    $("#loadLessonBtn").disabled = true;
    return;
  }
  malanLessons.forEach((lesson) => {
    const option = document.createElement("option");
    option.value = lesson.md;
    option.textContent = `${lesson.lesson}. ${lesson.title}（PDF 頁 ${lesson.pages}）`;
    select.appendChild(option);
  });
  updateLessonLink();
}

function updateLessonLink() {
  const select = $("#lessonSelect");
  const link = $("#openLessonLink");
  if (!select || !link) return;
  link.href = select.value || "materials/馬蘭_教師3階/README.md";
}

async function loadSelectedLesson() {
  const select = $("#lessonSelect");
  if (!select?.value) return;
  const lesson = malanLessons.find((item) => item.md === select.value);
  try {
    const response = await fetch(select.value);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    let text = await response.text();
    if (lesson?.vocabulary?.length) {
      text = injectLessonVocabulary(text, lesson);
    }
    state.activeLesson = lesson || null;
    $("#materialText").value = text;
    $("#fileName").textContent = select.selectedOptions[0].textContent;
    analyzeMaterial();
    toast("已載入本課 Markdown。");
  } catch (error) {
    toast("無法直接載入。請用 http://localhost:8770/ 開啟網站，或點「開啟教材包」。");
  }
}

function injectLessonVocabulary(text, lesson) {
  if (text.includes("## 本課生詞")) return text;
  const vocab = lesson.vocabulary
    .map((item) => `| ${item.word} | ${item.meaning} |`)
    .join("\n");
  const block = `\n## 本課生詞\n\n| 族語 | 中文解釋 |\n|---|---|\n${vocab}\n`;
  return text.replace("\n## 給 AI 的分析提示詞", `${block}\n## 給 AI 的分析提示詞`);
}

function renderVocabulary(vocabulary) {
  const wordList = $("#wordList");
  wordList.innerHTML = "";
  vocabulary.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = typeof item === "string" ? item : `${item.word}：${item.meaning}`;
    wordList.appendChild(li);
  });
}

function getStageText() {
  const stage = $("#stage");
  if (stage.value === "custom") {
    return $("#customStage").value.trim() || "自訂學習階段（尚未填寫）";
  }
  return stage.selectedOptions[0].textContent;
}

function updateCustomStageVisibility() {
  const isCustom = $("#stage").value === "custom";
  $("#customStageField").classList.toggle("hidden", !isCustom);
  renderExport();
}

function renderIssues() {
  const host = $("#issueList");
  host.innerHTML = "";
  data.issues.forEach((issue) => {
    const node = makeCheckbox({
      value: issue,
      checked: state.selectedIssues.has(issue),
      title: issue,
      detail: "",
      datasetType: "option"
    });
    node.querySelector("input").addEventListener("change", (event) => {
      toggleSet(state.selectedIssues, issue, event.target.checked);
      renderExport();
    });
    host.appendChild(node);
  });
}

function renderCurriculum() {
  const keyword = normalizeCode($("#curriculumSearch").value.trim());
  renderCompetencies(keyword);
  renderPerformances(keyword);
  renderContents(keyword);
  renderSelectionSummary();
}

function itemMatches(keyword, ...parts) {
  if (!keyword) return true;
  return normalizeCode(parts.join(" ")).includes(keyword);
}

function renderCompetencies(keyword) {
  const host = $("#competencyList");
  host.innerHTML = "";
  data.competencies
    .filter((item) => itemMatches(keyword, item.id, item.code, item.title, item.text))
    .forEach((item) => {
      const node = makeCheckbox({
        value: item.id,
        checked: state.selectedCompetencies.has(item.id),
        title: `${item.id} ${item.title}`,
        detail: `${item.code}｜${item.text}`,
        datasetType: "option"
      });
      node.querySelector("input").addEventListener("change", (event) => {
        toggleSet(state.selectedCompetencies, item.id, event.target.checked);
        renderSelectionSummary();
        renderExport();
      });
      host.appendChild(node);
    });
}

function renderPerformances(keyword) {
  const host = $("#performanceList");
  host.innerHTML = "";
  data.performances
    .filter((item) => itemMatches(keyword, item.code, item.category, item.text))
    .forEach((item) => {
      const node = makeCheckbox({
        value: item.code,
        checked: state.selectedPerformances.has(item.code),
        detail: `${item.category}｜${item.text}`,
        datasetType: "curriculum"
      });
      node.querySelector("input").addEventListener("change", (event) => {
        toggleSet(state.selectedPerformances, item.code, event.target.checked);
        renderSelectionSummary();
        renderExport();
      });
      host.appendChild(node);
    });
}

function renderContents(keyword) {
  const host = $("#contentList");
  host.innerHTML = "";
  data.contents
    .filter((item) => itemMatches(keyword, item.code, item.theme, item.text))
    .forEach((item) => {
      const node = makeCheckbox({
        value: item.code,
        checked: state.selectedContents.has(item.code),
        detail: `${item.theme}｜${item.text}`,
        datasetType: "curriculum"
      });
      node.querySelector("input").addEventListener("change", (event) => {
        toggleSet(state.selectedContents, item.code, event.target.checked);
        renderSelectionSummary();
        renderExport();
      });
      host.appendChild(node);
    });
}

function toggleSet(set, value, checked) {
  if (checked) set.add(value);
  else set.delete(value);
}

function selectedObjects(list, set, key = "code") {
  return list.filter((item) => set.has(item[key]));
}

function renderSelectionSummary() {
  const competencies = selectedObjects(data.competencies, state.selectedCompetencies, "id");
  const performances = selectedObjects(data.performances, state.selectedPerformances);
  const contents = selectedObjects(data.contents, state.selectedContents);
  $("#selectionSummary").innerHTML = `
    已選核心素養：${competencies.map((item) => item.code).join("、") || "未選"}<br>
    已選學習表現：${performances.map((item) => item.code).join("、") || "未選"}<br>
    已選學習內容：${contents.map((item) => item.code).join("、") || "未選"}
  `;
}

function analyzeMaterial() {
  const text = $("#materialText").value.trim();
  const wordList = $("#wordList");
  wordList.innerHTML = "";
  if (!text) {
    toast("請先貼入教材文字或 Markdown。");
    return;
  }
  if (state.activeLesson?.vocabulary?.length) {
    renderVocabulary(state.activeLesson.vocabulary);
  } else {
    renderVocabulary(extractWords(text));
  }
  $("#patternResult").textContent = "請以教材中的句子建立句型公式，避免自行補入未提供的族語例句。";
  $("#cultureResult").textContent = "已讀取教材文字。請在課綱對應步驟選擇學習表現與內容，再產生完整教案。";
  renderExport();
  toast("已完成教材摘要草稿。");
}

function extractWords(text) {
  const candidates = text
    .split(/[\s,，、。；;:：()（）\[\]【】\n\r]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 3 && /[A-Za-z]/.test(item));
  return [...new Set(candidates)].slice(0, 8).length
    ? [...new Set(candidates)].slice(0, 8)
    : ["待由教材萃取", "請貼入本課單字", "不可自行編造"];
}

function generateRationale() {
  const tribe = $("#tribe").value.trim() || "本族";
  const unit = $("#unitName").value.trim() || "本單元";
  $("#rationale").value = `本課以${tribe}語文教材「${unit}」為核心，透過學生生活經驗、族語文本理解與文化主體性的連結，引導學生在真實情境中使用族語表達想法。教學設計兼顧聆聽、說話、閱讀、書寫與綜合應用，並以課綱核心素養作為活動與評量的對齊依據。`;
  $("#objectives").value = `1. 能理解本課關鍵詞彙、句型與文本大意。\n2. 能使用族語或雙語方式表達自身經驗與觀點。\n3. 能連結教材中的文化知識與部落/社區生活。\n4. 能完成一項可觀察的學習產出，並依規準進行自評或互評。`;
  renderExport();
}

function generateActivities() {
  const unit = $("#unitName").value.trim() || "本課主題";
  $("#learningTasks").value = `活動一：文本定位\n學生閱讀或聆聽「${unit}」教材，標記關鍵詞、句型與文化線索。\n\n活動二：情境任務\n學生以小組方式設計一段生活情境對話，必須使用本課詞彙與句型，並說明其文化意義。\n\n活動三：公開分享\n學生以口說、短文、海報或錄音方式呈現成果，回應同儕提問並修正表達。`;
  $("#rubric").value = `優良：能正確使用本課詞彙與句型，清楚連結文化意義，表達流暢且能回應提問。\n達成：能使用主要詞彙與句型，能說明基本文化重點，表達大致清楚。\n待加強：詞彙或句型使用不足，文化連結不明確，需要教師或同儕鷹架支持。`;
  renderExport();
}

function generateIssueRationale() {
  const selected = [...state.selectedIssues];
  const tribe = $("#tribe").value.trim() || "本族";
  const unit = $("#unitName").value.trim() || "本課教材";
  if (!selected.length) {
    toast("請先至少選擇一項融入議題。");
    return;
  }
  $("#issueRationale").value = `本課以「${unit}」為學習情境，融入「${selected.join("、")}」。教學時先引導學生從教材文本辨識與${tribe}語文、文化生活、部落/社區經驗相關的議題線索，再透過小組討論、資料查找、口語表達或短文書寫，說明議題與自身生活的關聯。學生最後需提出一項具體行動或反思，例如訪談家人、整理部落觀點、比較不同世代看法、提出友善溝通方式，讓議題融入不只停留在價值宣示，而能回到族語使用、文化理解與素養表現。`;
  renderExport();
}

function renderChecks() {
  const host = $("#qualityChecks");
  host.innerHTML = "";
  data.qualityChecks.forEach((check) => {
    const node = makeCheckbox({
      value: check,
      checked: state.checks.has(check),
      title: check,
      detail: "",
      datasetType: "option"
    });
    node.querySelector("input").addEventListener("change", (event) => {
      toggleSet(state.checks, check, event.target.checked);
      renderExport();
    });
    host.appendChild(node);
  });
}

function renderExport() {
  const tribe = $("#tribe").value.trim();
  const language = $("#languageVariety").value.trim();
  const unit = $("#unitName").value.trim();
  const competencies = selectedObjects(data.competencies, state.selectedCompetencies, "id");
  const performances = selectedObjects(data.performances, state.selectedPerformances);
  const contents = selectedObjects(data.contents, state.selectedContents);
  const text = `# 實作培訓簡報大綱：教學教案及評量設計實作

## 一、基本資料
- 授課教師：${$("#designer").value.trim() || "蘿拉麻吉 Rolla Moggi 老師"}
- 族別：${tribe || "尚未填寫，生成前必須確認"}
- 語別 / 方言別：${language || "尚未填寫，生成前必須確認"}
- 學習階段：${getStageText()}
- 單元名稱：${unit || "尚未填寫"}
- 班級人數：${$("#classSize").value.trim() || "尚未填寫"}

## 二、教材摘要
${$("#materialText").value.trim() ? $("#materialText").value.trim().slice(0, 900) : "尚未貼入教材。請先貼入指定課次 Markdown 或教師手冊摘要。"}

## 三、課程設計理念
${$("#rationale").value.trim() || "尚未產生。"}

## 四、學習目標
${$("#objectives").value.trim() || "尚未產生。"}

## 五、課綱對應
### 核心素養
${competencies.map((item) => `- ${item.code} ${item.title}：${item.text}`).join("\n") || "- 尚未選擇"}

### 學習表現
${performances.map((item) => `- ${item.code}（${item.category}）：${item.text}`).join("\n") || "- 尚未選擇"}

### 學習內容
${contents.map((item) => `- ${item.code}（${item.theme}）：${item.text}`).join("\n") || "- 尚未選擇"}

### 補充課綱指標
${$("#customIndicators").value.trim() || "- 尚未填寫"}

## 六、教學策略
${[...state.selectedStrategies].map((item) => `- ${item}`).join("\n") || "- 尚未選擇"}

## 七、議題融入
${[...state.selectedIssues].map((item) => `- ${item}`).join("\n") || "- 尚未選擇"}

${$("#issueRationale").value.trim() || "議題轉化說明尚未填寫。"}

## 八、學生本位活動
${$("#learningTasks").value.trim() || "尚未產生。"}

## 九、評量規準
${$("#rubric").value.trim() || "尚未產生。"}

## 十、AI 生成防呆指令
- 只能根據教師提供的教材、族別、語別與課綱選項生成。
- 不得預設為布農族或任何未填寫的族別。
- 不得編造教材中沒有的族語詞彙、課文、文化背景。
- 若資料不足，請列出需要教師補充的欄位。
`;
  $("#exportText").value = text;
}

function buildCurriculumIndicatorsMarkdown() {
  const unit = $("#unitName").value.trim() || "尚未填寫";
  const tribe = $("#tribe").value.trim() || "尚未填寫";
  const language = $("#languageVariety").value.trim() || "尚未填寫";
  const competencies = selectedObjects(data.competencies, state.selectedCompetencies, "id");
  const performances = selectedObjects(data.performances, state.selectedPerformances);
  const contents = selectedObjects(data.contents, state.selectedContents);
  return `# 課綱指標對應表：教學教案及評量設計實作

## 一、基本資料
- 單元名稱：${unit}
- 族別：${tribe}
- 語別 / 方言別：${language}
- 學習階段：${getStageText()}
- 設計者：${$("#designer").value.trim() || "蘿拉麻吉 Rolla Moggi 老師"}

## 二、總綱核心素養
${competencies.map((item) => `- ${item.code} ${item.title}：${item.text}`).join("\n") || "- 尚未選擇"}

## 三、學習表現
${performances.map((item) => `- ${item.code}（${item.category}）：${item.text}`).join("\n") || "- 尚未選擇"}

## 四、學習內容
${contents.map((item) => `- ${item.code}（${item.theme}）：${item.text}`).join("\n") || "- 尚未選擇"}

## 五、補充課綱指標／學員手動輸入
${$("#customIndicators").value.trim() || "尚未填寫"}
`;
}

async function writeClipboardText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch (error) {
    const helper = document.createElement("textarea");
    helper.value = value;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.left = "-9999px";
    document.body.appendChild(helper);
    helper.select();
    const copied = document.execCommand("copy");
    helper.remove();
    return copied;
  }
}

async function copyTarget(id) {
  const node = document.getElementById(id);
  if (!node) return;
  const value = node.value || node.textContent;
  await writeClipboardText(value);
  toast("已複製到剪貼簿。");
}

async function copyWordCloudTerms() {
  const lessonWords = state.activeLesson?.vocabulary?.map((item) => item.word) || [];
  const visibleWords = $$("#wordList li").map((item) => item.textContent.split("：")[0].trim());
  const terms = (lessonWords.length ? lessonWords : visibleWords).filter(Boolean);
  if (!terms.length) {
    toast("請先在步驟一載入或分析本課教材。");
    return;
  }
  await writeClipboardText(terms.join("\n"));
  toast("已複製本課生字，可貼到 WordArt。");
}

async function copyAndOpenGoogleDoc() {
  renderExport();
  const docWindow = window.open("about:blank", "_blank", "noopener");
  await writeClipboardText($("#exportText").value);
  if (docWindow) {
    docWindow.location = googleDocUrl;
  } else {
    window.open(googleDocUrl, "_blank", "noopener");
  }
  toast("已複製教案內容。空白 Google 文件開啟後請按 Ctrl+V 貼上。");
}

function downloadMarkdown() {
  renderExport();
  const blob = new Blob([$("#exportText").value], { type: "text/markdown;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "教學教案及評量設計實作.md";
  link.click();
  URL.revokeObjectURL(link.href);
}

function downloadCurriculumIndicators() {
  const blob = new Blob([buildCurriculumIndicatorsMarkdown()], { type: "text/markdown;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "課綱指標對應表.md";
  link.click();
  URL.revokeObjectURL(link.href);
  toast("已下載課綱指標對應表。");
}

function resetAll() {
  $$("input[type='text'], input:not([type]), textarea").forEach((node) => {
    if (node.id !== "designer") node.value = "";
  });
  $("#designer").value = "蘿拉麻吉 Rolla Moggi 老師";
  state.selectedCompetencies = new Set(["B1", "B2"]);
  state.selectedPerformances = new Set(["1-V-5", "3-V-6"]);
  state.selectedContents = new Set(["Ad-V-3", "Ba-V-5"]);
  state.selectedStrategies = new Set(["Scaffolding 鷹架理論", "Task-based 任務導向教學"]);
  state.selectedIssues = new Set(["原住民族教育", "多元文化教育"]);
  state.activeLesson = null;
  state.checks.clear();
  init();
  toast("已清空並回到預設選項。");
}

function bindNavigation() {
  $$(".step-link").forEach((button) => {
    button.addEventListener("click", () => showPanel(button.dataset.step));
  });
}

function showPanel(id) {
  $$(".step-link").forEach((button) => button.classList.toggle("active", button.dataset.step === id));
  $$(".panel").forEach((panel) => panel.classList.toggle("active", panel.id === id));
  $("#page-title").textContent = titles[id];
  if (id === "export") renderExport();
}

function bindInputs() {
  ["tribe", "languageVariety", "stage", "customStage", "unitName", "designer", "classSize", "materialText", "rationale", "objectives", "customIndicators", "issueRationale", "learningTasks", "rubric"].forEach((id) => {
    document.getElementById(id).addEventListener("input", renderExport);
  });
  $("#stage").addEventListener("change", updateCustomStageVisibility);
  $("#curriculumSearch").addEventListener("input", renderCurriculum);
  $("#lessonSelect").addEventListener("change", updateLessonLink);
  $("#loadLessonBtn").addEventListener("click", loadSelectedLesson);
  $("#analyzeBtn").addEventListener("click", analyzeMaterial);
  $("#ideaBtn").addEventListener("click", generateRationale);
  $("#issueIdeaBtn").addEventListener("click", generateIssueRationale);
  $("#activityBtn").addEventListener("click", generateActivities);
  $("#copyToGoogleDocBtn").addEventListener("click", copyAndOpenGoogleDoc);
  $("#downloadBtn").addEventListener("click", downloadMarkdown);
  $("#downloadCurriculumBtn").addEventListener("click", downloadCurriculumIndicators);
  $("#resetBtn").addEventListener("click", resetAll);
  $("#previewBtn").addEventListener("click", () => showPanel("export"));
  $("#copyWordCloudBtn").addEventListener("click", copyWordCloudTerms);
  $$(".copy-button").forEach((button) => {
    if (button.dataset.copyTarget) {
      button.addEventListener("click", () => copyTarget(button.dataset.copyTarget));
    }
  });
  $("#fileInput").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    state.activeLesson = null;
    $("#fileName").textContent = file.name;
    if (file.name.endsWith(".md") || file.name.endsWith(".txt")) {
      $("#materialText").value = await file.text();
      analyzeMaterial();
    } else {
      toast("此靜態版可記錄檔名；PDF/Word 請先轉 Markdown 後貼上。");
    }
  });
}

function init() {
  renderLessonPicker();
  renderStrategies();
  renderIssues();
  renderCurriculum();
  renderChecks();
  updateCustomStageVisibility();
  renderExport();
}

bindNavigation();
bindInputs();
init();
