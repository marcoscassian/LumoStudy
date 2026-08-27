import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import ThemeProvider from "./components/theme-provider";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "LumoStudy",
  description: "Plataforma de estudos inspirada em Harry Potter",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={poppins.className}>
        <ThemeProvider />
        {children}
      </body>
    </html>
  );
}