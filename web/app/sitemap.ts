import { MetadataRoute } from 'next';
import connectDB from '@/lib/db';
import { User, Post } from '@/models/User';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nerdshive.online';
  const now = new Date();

  // Core high-authority static indexable routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/dashboard/explore`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.95,
    },
    {
      url: `${siteUrl}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${siteUrl}/register`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  let dynamicUserRoutes: MetadataRoute.Sitemap = [];
  let dynamicPostRoutes: MetadataRoute.Sitemap = [];

  try {
    if (process.env.MONGODB_URI) {
      await connectDB();

      // Index public developer profiles
      const users = await User.find({ isVerified: true })
        .select('user_name updatedAt')
        .limit(1000)
        .lean();

      dynamicUserRoutes = users
        .filter((u: any) => u.user_name)
        .map((u: any) => ({
          url: `${siteUrl}/dashboard/user/${encodeURIComponent(u.user_name)}`,
          lastModified: u.updatedAt || now,
          changeFrequency: 'weekly' as const,
          priority: 0.9,
        }));

      // Index public developer posts across archetypes
      const posts = await Post.find({})
        .select('_id updatedAt postType')
        .sort({ createdAt: -1 })
        .limit(2000)
        .lean();

      dynamicPostRoutes = posts.map((p: any) => ({
        url: `${siteUrl}/dashboard/p/${p._id.toString()}`,
        lastModified: p.updatedAt || now,
        changeFrequency: 'weekly' as const,
        priority: 0.85,
      }));
    }
  } catch (error) {
    console.warn('[SEO] Dynamic sitemap DB query warning, falling back to static routes:', error);
  }

  return [...staticRoutes, ...dynamicUserRoutes, ...dynamicPostRoutes];
}
