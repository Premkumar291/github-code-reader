import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Codebase Assistant — AI-Powered Code Q&A",
    template: "%s | Codebase Assistant",
  },
  description:
    "Upload any GitHub repository and ask questions about your codebase using AI. Get instant, accurate answers with file citations.",
  keywords: ["codebase search", "AI code assistant", "RAG", "GitHub", "code Q&A"],
  authors: [{ name: "Codebase Assistant" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Codebase Assistant",
    description: "Ask questions about any GitHub codebase using AI",
    siteName: "Codebase Assistant",
  },
  twitter: {
    card: "summary_large_image",
    title: "Codebase Assistant",
    description: "Ask questions about any GitHub codebase using AI",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
