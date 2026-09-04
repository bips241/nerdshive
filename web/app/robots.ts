import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nerdshive.online';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/dashboard/p/',
          '/dashboard/user/',
          '/dashboard/explore',
          '/explore',
          '/login',
          '/register',
        ],
        disallow: [
          '/dashboard/settings',
          '/dashboard/messages',
          '/dashboard/create',
          '/dashboard/activity',
          '/dashboard/saved',
          '/api/',
        ],
      },
      {
        userAgent: ['Googlebot', 'Bingbot', 'Applebot'],
        allow: '/',
        disallow: ['/dashboard/settings', '/dashboard/messages', '/api/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
