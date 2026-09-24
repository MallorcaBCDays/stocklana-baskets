import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stocklana Baskets | Programmable On-Chain Index Baskets",
  description:
    "Programmable on-chain index baskets for tokenized assets on Solana. Weighted baskets, fungible shares, deterministic custody, a live Devnet deposit flow and a locally verified Jupiter CPI path.",
  metadataBase: new URL("https://stocklanabaskets.com"),
  openGraph: {
    title: "Stocklana Baskets",
    description:
      "Programmable on-chain index baskets for tokenized assets on Solana.",
    url: "https://stocklanabaskets.com",
    siteName: "Stocklana Baskets",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stocklana Baskets",
    description:
      "Programmable on-chain index baskets for tokenized assets on Solana.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
