import type { Metadata } from 'next'
import localFont from 'next/font/local'
import Navbar from './components/Navbar'
import './globals.css'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'Fastbill | AN General Trading',
  description: 'An in-house billing software for AN General Trading',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#f8faf8] text-slate-800 selection:bg-sage-200 selection:text-sage-900`}>
        <Navbar />
        {children}
      </body>
    </html>
  )
}
