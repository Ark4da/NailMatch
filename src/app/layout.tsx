import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NailMatch",
  description: "Генератор похожих дизайнов маникюра по загруженному фото."
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({
  children
}: RootLayoutProps): React.JSX.Element {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
