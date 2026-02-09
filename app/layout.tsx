import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "15 Min Tracker",
    description: "Productivity tracker with 15-minute intervals",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
