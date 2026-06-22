import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'OJT Monitoring System — BatSU DTC',
  description:
    'On-the-Job Training monitoring platform for interns at the Digital Transformation Center, Batangas State University.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
