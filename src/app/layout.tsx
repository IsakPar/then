import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LastMinuteLive - Premium Theater Tickets',
  description: 'Book premium theater tickets at the last minute with guaranteed seating.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  )
} 