import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://getanuvaad.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/settings',
          '/dashboard/billing',
          '/dashboard/team',
          '/dashboard/workspace',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
