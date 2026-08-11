import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'QuickTrack | Rendimiento de conductores',
  description: 'Reporte diario de entregas por conductor.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
