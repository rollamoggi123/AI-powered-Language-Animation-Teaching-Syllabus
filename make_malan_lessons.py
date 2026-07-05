from pathlib import Path


BASE = Path(__file__).resolve().parent
OUT = BASE / "materials" / "馬蘭_教師3階"
PAGES_SRC = BASE.parent / "materials" / "馬蘭_教師3階_md" / "pages"
PAGES_DST = OUT / "pages"

LESSONS = [
    (1, "第 1 課", "What are you doing?", 5, 9),
    (2, "第 2 課", "Pasuwal ko singi nangra.", 10, 14),
    (3, "第 3 課", "Pasabek ko codad.", 15, 20),
    (4, "第 4 課", "Maliteng ko kahok.", 21, 25),
    (5, "第 5 課", "Mako", 26, 31),
    (6, "第 6 課", "Banahec ako kiso.", 32, 39),
    (7, "第 7 課", "Pina ko tata'angay.", 40, 45),
    (8, "第 8 課", "Pitofo", 46, 50),
    (9, "第 9 課", "Ma'or ko fakat.", 51, 57),
    (10, "第 10 課", "Mataber ko singi.", 58, 63),
]

SUPPLEMENTS = [
    ("補充歌曲與教學資源", 64, 76),
    ("封底與出版資訊", 77, 78),
]


def page_name(page: int) -> str:
    return f"page-{page:02d}.png" if page < 10 else f"page-{page}.png"


def image_lines(start: int, end: int, rel_prefix: str = "pages") -> str:
    lines = []
    for page in range(start, end + 1):
        name = page_name(page)
        lines.append(f"![PDF 第 {page} 頁]({rel_prefix}/{name})")
    return "\n\n".join(lines)


def lesson_md(num: int, label: str, title: str, start: int, end: int) -> str:
    return f"""# 馬蘭 教師3階｜{label}｜{title}

> 來源：`馬蘭 教師3階.pdf`
> PDF 頁面：第 {start}-{end} 頁
> 轉換狀態：此 PDF 為掃描圖像型檔案，目前先提供「Markdown + 頁面圖片」版本，方便學員選課與貼入 AI 工作台。若需要全文文字版，需再進行 OCR。

## 使用方式

1. 先閱讀本課頁面圖片。
2. 將本 Markdown 檔或本課頁面圖片上傳/貼到 Gemini、NotebookLM 或教案工作台。
3. 請 AI 只根據本課內容整理「核心單字、課文、句型、文化重點、課綱對應」。
4. 不可讓 AI 自行預設族別、語別或補寫教材中沒有的內容。

## 給 AI 的分析提示詞

請只根據我提供的「馬蘭 教師3階 {label}」教材內容進行分析，不要自行編造課文、單字、文化背景，也不要改成其他族語或族別。

請輸出：

1. 核心單字表：族語、中文解釋、關聯詞。
2. 課文內容：整理本課可辨識的課文與對話。
3. 句型公式：列出本課主要句型，並只使用教材中可見例句。
4. 文化小百科：整理本課文化或生活情境重點。
5. 課綱對應建議：對應原住民族語文課綱的核心素養、學習表現、學習內容。
6. 資料不足處：若圖片解析不足或看不清楚，請列出需要教師補充的頁面或欄位。

## 教材頁面

{image_lines(start, end)}
"""


def index_md() -> str:
    lesson_rows = "\n".join(
        f"| {num} | [{label}｜{title}](./{num:02d}_lesson.md) | {start}-{end} |"
        for num, label, title, start, end in LESSONS
    )
    supplement_rows = "\n".join(
        f"| {title} | [supplement_{i:02d}.md](./supplement_{i:02d}.md) | {start}-{end} |"
        for i, (title, start, end) in enumerate(SUPPLEMENTS, 1)
    )
    return f"""# 馬蘭 教師3階｜10 課 Markdown 教材包

> 來源 PDF：`D:/教學教案及評量設計實作/馬蘭 教師3階.pdf`
> 轉換日期：2026-07-05
> 說明：此 PDF 目前抽不到文字層，已先轉為 Markdown 檔並嵌入頁面圖片，讓學員可以選擇其中一課進行 AI 分析。

## 課次選擇

| 課次 | Markdown 檔 | PDF 頁面 |
|---:|---|---:|
{lesson_rows}

## 補充資料

| 項目 | Markdown 檔 | PDF 頁面 |
|---|---|---:|
{supplement_rows}

## 現場建議

- 每位學員只選一課分析，避免一次餵入整本 PDF。
- 如果使用 Gemini / NotebookLM，建議上傳本課 Markdown 或本課頁面圖片，不要直接上傳整本 PDF。
- 產出教案前，務必先填寫族別、語別、學習階段與單元名稱。
- 若 AI 讀圖後有看不清楚或猜測內容，請要求它標註「不確定」，不要自行補寫。
"""


def data_js() -> str:
    items = []
    for num, label, title, start, end in LESSONS:
        items.append(
            "  "
            + "{"
            + f'id: "malan-3-{num:02d}", lesson: {num}, title: "{label}｜{title}", md: "materials/馬蘭_教師3階/{num:02d}_lesson.md", pages: "{start}-{end}"'
            + "}"
        )
    return "window.malanLessons = [\n" + ",\n".join(items) + "\n];\n"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    PAGES_DST.mkdir(parents=True, exist_ok=True)
    for page in range(1, 79):
        src = PAGES_SRC / page_name(page)
        dst = PAGES_DST / page_name(page)
        if src.exists() and not dst.exists():
            dst.write_bytes(src.read_bytes())
    for num, label, title, start, end in LESSONS:
        (OUT / f"{num:02d}_lesson.md").write_text(
            lesson_md(num, label, title, start, end), encoding="utf-8"
        )
    for i, (title, start, end) in enumerate(SUPPLEMENTS, 1):
        text = f"""# 馬蘭 教師3階｜{title}

> PDF 頁面：第 {start}-{end} 頁

{image_lines(start, end)}
"""
        (OUT / f"supplement_{i:02d}.md").write_text(text, encoding="utf-8")
    (OUT / "README.md").write_text(index_md(), encoding="utf-8")
    (OUT / "lessons.js").write_text(data_js(), encoding="utf-8")


if __name__ == "__main__":
    main()
