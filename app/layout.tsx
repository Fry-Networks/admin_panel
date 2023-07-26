import './globals.css';
import { Analytics } from '@vercel/analytics/react';
import Nav from './nav';

import { Suspense } from 'react';

export const metadata = {
  title: 'Fry Admin Panel',
  description:
    'An admin dashboard to manage users and their registrations.'
};


export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-gray-50">
      <body className="h-full">
        <Suspense>
          <Nav />
        </Suspense>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
