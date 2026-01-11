import type { ReactNode } from "react";

export const metadata = {
  title: "shorts-demand-proof",
  description: "API for shorts demand proof processing"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
