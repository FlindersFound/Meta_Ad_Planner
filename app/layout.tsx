export const metadata = {
  title: 'Meta Paid Ads Planner',
  description: 'Meta Paid Ads Planner',
}
import "./globals.css";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
