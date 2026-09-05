import { NextResponse } from 'next/server';
import { fetchPosts } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get('limit')) || 20;

    const rawPosts = await fetchPosts(limit);
    const posts = rawPosts.map((p) => (typeof p === 'string' ? JSON.parse(p) : p));

    return NextResponse.json(posts, {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-cache, no-transform',
      },
    });
  } catch (error) {
    console.error('Error fetching posts in API:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}
