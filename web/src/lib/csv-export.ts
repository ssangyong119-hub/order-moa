// CSV 생성/다운로드 유틸 — 저장 데이터 내보내기(W15)에서 공용 사용.
// 엑셀 한글 깨짐 방지(BOM), 콤마·따옴표·개행 escape, 수식 인젝션 최소 방어.

function escapeCell(value: string | number): string {
  let s = value === null || value === undefined ? "" : String(value);
  // CSV 인젝션 방어: =,+,-,@ 로 시작하는 셀은 엑셀이 수식으로 해석 → 앞에 작은따옴표.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  // 콤마·따옴표·개행 포함 시 큰따옴표로 감싸고 내부 따옴표는 2배.
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** 2차원 배열 → CSV 문자열(escape 포함). BOM은 downloadCsv에서 부착. */
export function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\n");
}

/** rows를 CSV 파일로 다운로드(브라우저). UTF-8 BOM 부착 → 엑셀 한글 정상. */
export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
