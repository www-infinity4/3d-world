import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Context Gears", description: "Paragraph-level conversations, corrections, revisions, and categorized token edits." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
