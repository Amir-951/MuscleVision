import type {Metadata} from 'next';
import type {ReactNode} from 'react';

import '@/app/globals.css';
import {AuthProvider} from '@/components/providers/auth-provider';

export const metadata: Metadata = {
  title: 'MuscleVision Web',
  description: 'Biomechanics lab for movement analysis, coaching, and nutrition.',
};

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
