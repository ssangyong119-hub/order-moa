# 오더모아 진행현황 재생성 스크립트
# 단일 소스: docs/order-moa-progress-data.json → HTML(대시보드) + XLSX(트래커) 생성.
# 사용: py -3 scripts/generate-progress.py   (리포 루트에서 실행)
# 의존: openpyxl (pip install openpyxl). 수식 없음(값만) — 항상 JSON에서 재생성하므로.
import json
import html as H
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "docs" / "order-moa-progress-data.json"
OUT_HTML = ROOT / "docs" / "order-moa-progress-dashboard.html"
OUT_XLSX = ROOT / "docs" / "order-moa-progress-tracker.xlsx"

STATUS_COLORS = {
    "완료": ("#e6f4ea", "#1e7e34"),
    "진행 중": ("#e7f0fe", "#1a56b0"),
    "다음": ("#fef7e0", "#946200"),
    "보류": ("#f1f3f4", "#5f6368"),
    "제외": ("#fde8e8", "#b02a2a"),
}
XLSX_FILLS = {
    "완료": "C6EFCE",
    "진행 중": "BDD7EE",
    "다음": "FFEB9C",
    "보류": "D9D9D9",
    "제외": "FFC7CE",
}
# CSS 클래스용 슬러그 — "진행 중"처럼 공백 있는 상태가 클래스를 가르지 않게
STATUS_SLUGS = {"완료": "done", "진행 중": "doing", "다음": "next", "보류": "hold", "제외": "cut"}
PHASE_ORDER = ["1차", "1차 보강", "1.5차", "2차"]


def esc(s):
    return H.escape(str(s))


def build_html(d):
    meta, items = d["meta"], d["workItems"]
    counts = {}
    for it in items:
        counts[it["status"]] = counts.get(it["status"], 0) + 1
    done = counts.get("완료", 0)
    active = done + counts.get("진행 중", 0) + counts.get("다음", 0)  # 보류/제외 제외한 1차 트랙
    total = len(items)

    def badge(status):
        bg, fg = STATUS_COLORS.get(status, ("#eee", "#333"))
        return f'<span class="badge" style="background:{bg};color:{fg}">{esc(status)}</span>'

    cards = []
    for phase in PHASE_ORDER:
        phase_items = [it for it in items if it["phase"] == phase]
        if not phase_items:
            continue
        cards.append(f'<h2 class="phase">{esc(phase)}</h2><div class="grid">')
        for it in phase_items:
            docs = "".join(f"<li><code>{esc(x)}</code></li>" for x in it["docs"])
            cards.append(f"""
<div class="card s-{STATUS_SLUGS.get(it['status'], 'hold')}">
  <div class="card-head"><span class="wid">{esc(it['id'])}</span><strong>{esc(it['name'])}</strong>{badge(it['status'])}</div>
  <p class="plain">{esc(it['plain'])}</p>
  <dl>
    <dt>왜 필요한가</dt><dd>{esc(it['why'])}</dd>
    <dt>선행 조건</dt><dd>{esc(it['prereq'])}</dd>
    <dt>확인 방법</dt><dd>{esc(it['verify'])}</dd>
  </dl>
  <details><summary>관련 문서/파일</summary><ul>{docs}</ul></details>
</div>""")
        cards.append("</div>")

    flow = " → ".join(f"<span>{esc(s)}</span>" for s in d["coreFlow"])
    foundation = "".join(
        f"<li><strong>{esc(f['item'])}</strong> — {esc(f['plain'])}</li>" for f in d["foundation"]["items"]
    )
    checklist = "".join(
        f"<tr><td>{esc(c['item'])}</td><td>{esc(c['plain'])}</td><td class='ok'>{esc(c['result'])}</td></tr>"
        for c in d["checklist"]
    )
    excluded = "".join(f"<li><strong>{esc(e['item'])}</strong> — {esc(e['plain'])}</li>" for e in d["excluded"])
    legend = "".join(badge(s) for s in STATUS_COLORS)

    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>오더모아 진행현황 — {esc(meta['updated'])}</title>
<style>
  * {{ box-sizing: border-box; }}
  body {{ font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; margin: 0; background: #f6f7f9; color: #202124; line-height: 1.55; }}
  .wrap {{ max-width: 1100px; margin: 0 auto; padding: 24px 16px 64px; }}
  header.top {{ background: #1f2a44; color: #fff; padding: 28px 16px; }}
  header.top .wrap {{ padding: 0 16px; }}
  h1 {{ margin: 0 0 6px; font-size: 24px; }}
  .sub {{ color: #c8d0e0; font-size: 14px; margin: 2px 0; }}
  .focus {{ background: #fff3cd; border: 1px solid #f0d47a; color: #6b5200; padding: 10px 14px; border-radius: 8px; margin: 18px 0; font-size: 15px; }}
  .progressbar {{ background: #e3e6ea; border-radius: 999px; height: 18px; overflow: hidden; margin: 8px 0 4px; }}
  .progressbar > div {{ background: #34a853; height: 100%; }}
  .counts {{ font-size: 13px; color: #5f6368; }}
  .flow {{ background: #fff; border: 1px solid #e0e3e8; border-radius: 10px; padding: 12px 16px; font-size: 13px; color: #3c4043; }}
  .flow span {{ white-space: nowrap; }}
  h2 {{ font-size: 18px; margin: 32px 0 12px; border-left: 5px solid #1f2a44; padding-left: 10px; }}
  h2.phase {{ border-left-color: #34a853; }}
  .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }}
  .card {{ background: #fff; border: 1px solid #e0e3e8; border-radius: 10px; padding: 14px 16px; }}
  .card.s-done {{ border-left: 5px solid #34a853; }}
  .card.s-doing {{ border-left: 5px solid #4285f4; }}
  .card.s-next {{ border-left: 5px solid #fbbc04; }}
  .card.s-hold {{ border-left: 5px solid #9aa0a6; }}
  .card.s-cut {{ border-left: 5px solid #ea4335; }}
  .card-head {{ display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }}
  .wid {{ font-size: 12px; color: #80868b; font-weight: 700; }}
  .badge {{ font-size: 12px; padding: 2px 10px; border-radius: 999px; font-weight: 700; margin-left: auto; }}
  .plain {{ margin: 4px 0 10px; font-size: 14px; }}
  dl {{ margin: 0; font-size: 13px; }}
  dt {{ font-weight: 700; color: #5f6368; margin-top: 6px; }}
  dd {{ margin: 0 0 2px; }}
  details {{ margin-top: 8px; font-size: 12px; color: #5f6368; }}
  details ul {{ margin: 4px 0 0 16px; padding: 0; }}
  code {{ background: #f1f3f4; padding: 1px 5px; border-radius: 4px; font-size: 11px; }}
  ul.simple {{ background: #fff; border: 1px solid #e0e3e8; border-radius: 10px; margin: 0; padding: 14px 16px 14px 34px; font-size: 14px; }}
  ul.simple li {{ margin: 4px 0; }}
  table {{ width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e0e3e8; border-radius: 10px; overflow: hidden; font-size: 13px; }}
  th, td {{ text-align: left; padding: 8px 12px; border-bottom: 1px solid #eef0f3; }}
  th {{ background: #f1f3f4; }}
  td.ok {{ color: #1e7e34; font-weight: 700; }}
  .legend {{ display: flex; gap: 6px; flex-wrap: wrap; margin: 10px 0 0; }}
  footer {{ margin-top: 40px; font-size: 12px; color: #80868b; }}
</style>
</head>
<body>
<header class="top">
  <div class="wrap">
    <h1>오더모아 진행현황</h1>
    <p class="sub">{esc(meta['purpose'])}</p>
    <p class="sub">기준일 {esc(meta['updated'])} · 브랜치 <code style="background:#33405f;color:#dfe6f5">{esc(meta['branch'])}</code></p>
  </div>
</header>
<div class="wrap">
  <div class="focus">📌 <strong>지금 하는 일:</strong> {esc(meta['currentFocus'])}</div>

  <h2>전체 진행률 (작업 보드 {total}개 기준)</h2>
  <div class="progressbar"><div style="width:{round(done / total * 100)}%"></div></div>
  <p class="counts">완료 {done} · 다음 {counts.get('다음', 0)} · 보류 {counts.get('보류', 0)} — 1차 트랙(보류 제외) {done}/{active} 완료</p>
  <div class="legend">{legend}</div>

  <h2>핵심 흐름 (이 순서가 제품의 전부)</h2>
  <div class="flow">{flow}</div>

  <h2>{esc(d['foundation']['title'])}</h2>
  <ul class="simple">{foundation}</ul>

  <h2 style="border-left-color:#fbbc04">작업 보드 — 다음에 채울 것</h2>
  {''.join(cards)}

  <h2>검증 체크리스트 (마지막 확인 기준)</h2>
  <table><tr><th>항목</th><th>쉬운 설명</th><th>결과</th></tr>{checklist}</table>

  <h2 style="border-left-color:#ea4335">만들지 않는 것 (착수 금지)</h2>
  <ul class="simple">{excluded}</ul>

  <footer>단일 원본: <code>docs/order-moa-progress-data.json</code> — 고친 뒤 <code>py -3 scripts/generate-progress.py</code>로 이 파일과 XLSX를 재생성합니다.
  차수·범위 기준: <code>{esc(meta['charter'])}</code></footer>
</div>
</body>
</html>
"""


def build_xlsx(d):
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.utils import get_column_letter

    wb = Workbook()
    head_font = Font(name="Malgun Gothic", bold=True, color="FFFFFF")
    head_fill = PatternFill("solid", start_color="1F2A44")
    base_font = Font(name="Malgun Gothic", size=10)
    wrap = Alignment(wrap_text=True, vertical="top")

    def style_header(ws, ncols):
        for c in range(1, ncols + 1):
            cell = ws.cell(row=1, column=c)
            cell.font = head_font
            cell.fill = head_fill
            cell.alignment = Alignment(vertical="center")

    def fill_sheet(ws, headers, rows, widths):
        ws.append(headers)
        for r in rows:
            ws.append(r)
        style_header(ws, len(headers))
        for i, w in enumerate(widths, 1):
            ws.column_dimensions[get_column_letter(i)].width = w
        for row in ws.iter_rows(min_row=2):
            for cell in row:
                cell.font = base_font
                cell.alignment = wrap
        ws.freeze_panes = "A2"

    meta, items = d["meta"], d["workItems"]
    counts = {}
    for it in items:
        counts[it["status"]] = counts.get(it["status"], 0) + 1

    ws = wb.active
    ws.title = "요약"
    fill_sheet(
        ws,
        ["항목", "내용"],
        [
            ["프로젝트", meta["project"]],
            ["목적", meta["purpose"]],
            ["기준일", meta["updated"]],
            ["브랜치", meta["branch"]],
            ["지금 하는 일", meta["currentFocus"]],
            ["차수 기준(헌장)", meta["charter"]],
            ["작업 보드", f"총 {len(items)}개 — " + " · ".join(f"{k} {v}" for k, v in counts.items())],
            ["Supabase", meta["supabase"]],
            ["최근 커밋", "\n".join(meta["recentCommits"])],
        ],
        [18, 110],
    )

    ws = wb.create_sheet("작업보드")
    fill_sheet(
        ws,
        ["ID", "작업", "상태", "차수", "쉬운 설명", "왜 필요한가", "선행 조건", "확인 방법", "관련 문서/파일"],
        [
            [it["id"], it["name"], it["status"], it["phase"], it["plain"], it["why"], it["prereq"], it["verify"], "\n".join(it["docs"])]
            for it in items
        ],
        [6, 26, 8, 9, 44, 40, 32, 38, 44],
    )
    for row in ws.iter_rows(min_row=2, min_col=3, max_col=3):
        for cell in row:
            fill = XLSX_FILLS.get(cell.value)
            if fill:
                cell.fill = PatternFill("solid", start_color=fill)

    ws = wb.create_sheet("완료된 기반")
    fill_sheet(ws, ["항목", "쉬운 설명"], [[f["item"], f["plain"]] for f in d["foundation"]["items"]], [34, 90])

    ws = wb.create_sheet("검증 체크리스트")
    fill_sheet(ws, ["항목", "쉬운 설명", "결과"], [[c["item"], c["plain"], c["result"]] for c in d["checklist"]], [30, 56, 18])

    ws = wb.create_sheet("제외 기능")
    fill_sheet(ws, ["항목", "이유"], [[e["item"], e["plain"]] for e in d["excluded"]], [30, 80])

    wb.save(OUT_XLSX)


def main():
    d = json.loads(DATA.read_text(encoding="utf-8"))
    OUT_HTML.write_text(build_html(d), encoding="utf-8")
    build_xlsx(d)
    print(f"OK: {OUT_HTML.name}, {OUT_XLSX.name} (source: {DATA.name}, updated {d['meta']['updated']})")


if __name__ == "__main__":
    main()
