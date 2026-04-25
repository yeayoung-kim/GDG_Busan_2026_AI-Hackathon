import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Align.ai",
  description:
    "판교어 정렬을 강제하는 2인 화상회의용 커뮤니케이션 실험실",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
