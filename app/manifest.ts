import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Prado — Field Service Management',
    short_name: 'Prado',
    description:
      'The all-in-one workspace built for modern service and landscaping professionals. Schedule jobs, manage team workflows, track customers, and simplify billing seamlessly.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0a9d73',
    theme_color: '#0a9d73',
    orientation: 'any',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: '/screen1.webp',
        sizes: '898x476',
        type: 'image/webp',
        form_factor: 'wide',
        label: 'Prado Dashboard Overview',
      },
    ],
  };
}
