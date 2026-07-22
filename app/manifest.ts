import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Prado — Field Service Management',
    short_name: 'Prado',
    description:
      'The all-in-one workspace built for modern service and landscaping professionals. Schedule jobs, manage team workflows, track customers, and simplify billing seamlessly.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#10b981',
    orientation: 'landscape-primary',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
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
