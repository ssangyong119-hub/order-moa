import type { ReactNode } from "react";

export const metadata = {
  title: "오더모아",
  description: "중간 납품업자 전용 발주 취합 웹 ERP (MVP)",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
