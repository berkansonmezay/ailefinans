import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Aile Finans ve Yaşam Yönetimi",
  description: "Ailenizin finansal ve yaşam kayıtlarını tek bir platformda yönetin.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans bg-bg-primary text-text-primary antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
        >
          {children}
          <Toaster 
          position="top-right" 
          toastOptions={{
            style: {
              background: 'var(--color-bg-card)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)'
            },
            success: {
              iconTheme: {
                primary: 'var(--color-success)',
                secondary: 'white',
              },
            },
            error: {
              iconTheme: {
                primary: 'var(--color-danger)',
                secondary: 'white',
              },
            },
          }} 
        />
        </ThemeProvider>
      </body>
    </html>
  );
}
