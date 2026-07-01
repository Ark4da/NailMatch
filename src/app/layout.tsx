import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NailMatch",
  description: "Find manicure ideas similar to your uploaded photo."
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({
  children
}: RootLayoutProps): React.JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
