import React from 'react';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { getHackathonBySlug } from '@/lib/hackathon-actions';
import HackathonHubClient from '@/components/hackathons/HackathonHubClient';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface HackathonPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: HackathonPageProps): Promise<Metadata> {
  const hackathon = await getHackathonBySlug(params.slug);
  if (!hackathon) {
    return {
      title: 'Hackathon Not Found | NerdShive',
    };
  }

  return {
    title: `${hackathon.name} — Official Event Hub & Squads | NerdShive`,
    description: hackathon.tagline || hackathon.description?.slice(0, 160),
  };
}

export default async function HackathonHubPage({ params }: HackathonPageProps) {
  const session = await auth();
  const currentUserId = session?.user?._id?.toString();

  const hackathon = await getHackathonBySlug(params.slug);
  if (!hackathon) {
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <HackathonHubClient
        hackathon={hackathon}
        currentUserId={currentUserId}
      />
    </div>
  );
}
