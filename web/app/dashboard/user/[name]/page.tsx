import { auth } from "@/auth";
import EditProfileButton from "@/components/editBtn";
import FollowButton from "@/components/followBtn";
import UserAvatar from "@/components/UserAvatar";
import { fetchProfilePosts } from "@/lib/data";
import connectDB from "@/lib/db";
import { User, Follows, Post } from "@/models/User";
import { Globe, GitFork, Star, Code, GitPullRequest, ShieldCheck, Sparkles, ExternalLink, Award, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchGitHubProofOfWork } from "@/lib/github";

import type { Metadata } from "next";

type Props = {
  params: {
    name: string;
  };
};

export async function generateMetadata({ params: { name } }: Props): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nerdshive.online";
  const normalizedName = decodeURIComponent(name).trim();

  try {
    if (process.env.MONGODB_URI) {
      await connectDB();
      const profileUser: any = await User.findOne({
        $or: [
          { user_name: normalizedName },
          { user_name: new RegExp(`^${normalizedName}$`, 'i') },
        ],
      }).select('user_name bio techStack radarStatus image repo').lean();

      if (profileUser) {
        const title = `${profileUser.user_name} - Developer Proof of Work & Portfolio`;
        const stackDesc = profileUser.techStack?.length ? `Skilled in ${profileUser.techStack.join(', ')}.` : '';
        const radarDesc = profileUser.radarStatus && profileUser.radarStatus !== 'none'
          ? `Beacon Active: ${profileUser.radarStatus.replace(/_/g, ' ')}.`
          : '';
        const description = (profileUser.bio || `${stackDesc} ${radarDesc}` || `Explore developer dossier, open-source projects, and ship logs of @${profileUser.user_name}.`).slice(0, 160);

        const ogImageUrl = `${siteUrl}/api/og?title=${encodeURIComponent(profileUser.user_name)}&desc=${encodeURIComponent(description.slice(0, 100))}&type=profile`;

        return {
          title,
          description,
          keywords: [
            "developer portfolio",
            profileUser.user_name,
            ...(profileUser.techStack || []),
            "open source engineer",
            "proof of work",
            "nerdshive",
          ],
          alternates: {
            canonical: `${siteUrl}/dashboard/user/${encodeURIComponent(normalizedName)}`,
          },
          openGraph: {
            title,
            description,
            url: `${siteUrl}/dashboard/user/${encodeURIComponent(normalizedName)}`,
            siteName: "NerdShive",
            type: "profile",
            images: [
              {
                url: profileUser.image || ogImageUrl,
                width: 1200,
                height: 630,
                alt: `${profileUser.user_name} Developer Profile`,
              },
            ],
          },
          twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [profileUser.image || ogImageUrl],
          },
        };
      }
    }
  } catch (err) {
    console.warn("[SEO] Error generating profile metadata:", err);
  }

  return {
    title: `${normalizedName} - Developer Profile | NerdShive`,
    description: `View developer proof of work, ship logs, and projects on NerdShive.`,
  };
}

type ProfilePost = {
  _id: string;
  fileUrl: string;
  caption?: string;
};

function getMediaType(url?: string): "video" | "image" | "unknown" {
  if (!url) return "unknown";
  const cleanUrl = url.split("?")[0].toLowerCase();
  if (cleanUrl.endsWith(".mp4") || cleanUrl.endsWith(".mov") || cleanUrl.endsWith(".webm") || cleanUrl.endsWith(".quicktime")) {
    return "video";
  }
  return "image";
}

export default async function ProfilePage({ params: { name } }: Props) {
  const session = await auth();
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nerdshive.online";

  await connectDB();
  const normalizedName = decodeURIComponent(name).trim();
  let profileUser: any = await User.findOne({
    $or: [
      { user_name: normalizedName },
      { user_name: new RegExp(`^${normalizedName}$`, 'i') },
    ],
  }).lean();

  if (!profileUser) {
    // If the logged-in user renamed their profile, redirect to their new profile URL
    if (session?.user?._id) {
      const activeUser = await User.findById(session.user._id).select('user_name').lean();
      if (activeUser && activeUser.user_name !== normalizedName) {
        redirect(`/dashboard/user/${encodeURIComponent(activeUser.user_name)}`);
      }
    }

    return (
      <div className="text-center py-12 text-muted-foreground">
        User not found.
      </div>
    );
  }

  const profileUserId = profileUser._id.toString();
  const isOwnProfile = session?.user?.user_name === name;

  // Aggregate real stats
  const [postCount, followersCount, followingCount] = await Promise.all([
    Post.countDocuments({ userId: profileUserId }),
    Follows.countDocuments({ followingId: profileUserId }),
    Follows.countDocuments({ followerId: profileUserId }),
  ]);

  const [githubStats, profilePostsRaw] = await Promise.all([
    fetchGitHubProofOfWork(profileUser.repo),
    fetchProfilePosts(name).catch((err) => {
      console.error("Error fetching profile posts:", err);
      return [];
    }),
  ]);

  const parsedPosts: { post: ProfilePost; type: "video" | "image" | "unknown" }[] = profilePostsRaw.map((postStr) => {
    const post: ProfilePost = JSON.parse(postStr);
    return { post, type: getMediaType(post.fileUrl) };
  });

  const jsonLdProfile = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    dateCreated: profileUser.createdAt ? new Date(profileUser.createdAt).toISOString() : undefined,
    dateModified: profileUser.updatedAt ? new Date(profileUser.updatedAt).toISOString() : undefined,
    mainEntity: {
      "@type": "Person",
      name: profileUser.user_name,
      alternateName: name,
      description: profileUser.bio || "Developer on NerdShive",
      image: profileUser.image,
      sameAs: [
        profileUser.website,
        profileUser.repo ? `https://github.com/${profileUser.repo}` : undefined,
      ].filter(Boolean),
      knowsAbout: profileUser.techStack || [],
      interactionStatistic: [
        {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/FollowAction",
          userInteractionCount: followersCount,
        },
      ],
    },
  };

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProfile) }}
      />

      {/* Guest Onboarding Banner */}
      {!session && (
        <div className="bg-primary/10 border border-primary/20 text-foreground text-xs px-4 py-3 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span>You are viewing <strong>@{profileUser.user_name}</strong>'s public developer dossier. Join NerdShive to pair debug, assemble hackathon teams, and launch ship logs.</span>
          </div>
          <Link href="/register" className="shrink-0 px-3.5 py-1.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors">
            Sign Up Free
          </Link>
        </div>
      )}

      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
        <UserAvatar
          user={{
            image: profileUser.image,
            user_name: profileUser.user_name,
            email: profileUser.email,
          }}
          className={`h-24 w-24 ${isOwnProfile ? "border-2 border-primary" : ""}`}
        />
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{name}</h1>
            {profileUser.gender && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                {profileUser.gender}
              </span>
            )}
            {profileUser.radarStatus && profileUser.radarStatus !== 'none' && (
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border shadow-sm animate-pulse ${
                profileUser.radarStatus === 'open_for_hackathons'
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                  : profileUser.radarStatus === 'seeking_cofounder'
                  ? 'bg-purple-500/10 text-purple-500 border-purple-500/30'
                  : profileUser.radarStatus === 'open_for_collab'
                  ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                  : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
              }`}>
                <span className="h-2 w-2 rounded-full bg-current" />
                {profileUser.radarStatus === 'open_for_hackathons' && '🎯 Open for Hackathons'}
                {profileUser.radarStatus === 'seeking_cofounder' && '🚀 Seeking Co-Founder'}
                {profileUser.radarStatus === 'open_for_collab' && '🤝 Open for Collab'}
                {profileUser.radarStatus === 'open_for_work' && '💼 Open for Work'}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <div>
              <span className="font-semibold text-foreground">{postCount}</span> posts
            </div>
            <div>
              <span className="font-semibold text-foreground">{followersCount}</span> followers
            </div>
            <div>
              <span className="font-semibold text-foreground">{followingCount}</span> following
            </div>
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <Award className="h-3.5 w-3.5" />
              <span>{profileUser.debugKarma || 0}</span> Karma
            </div>
            {(profileUser.bugsSolvedCount || 0) > 0 && (
              <div className="flex items-center gap-1 text-primary font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{profileUser.bugsSolvedCount}</span> Bugs Solved
              </div>
            )}
          </div>

          <div className="flex gap-2 items-center pt-1">
            {isOwnProfile ? (
              <EditProfileButton
                initialData={{
                  user_name: profileUser.user_name,
                  bio: profileUser.bio,
                  gender: profileUser.gender,
                  website: profileUser.website,
                  repo: profileUser.repo,
                  radarStatus: profileUser.radarStatus,
                  techStack: profileUser.techStack,
                }}
              />
            ) : session?.user ? (
              <FollowButton name={name} followerId={session.user._id || ""} />
            ) : (
              <Link href="/login" className="inline-flex items-center text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
                Follow @{profileUser.user_name}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Bio, Tech Stack & Social Links */}
      <div className="space-y-3 text-sm border-t pt-4">
        {profileUser.bio ? (
          <p className="text-foreground whitespace-pre-line leading-relaxed">{profileUser.bio}</p>
        ) : (
          <p className="text-muted-foreground italic">No bio provided yet.</p>
        )}

        {/* Tech Stack Badges */}
        {profileUser.techStack && profileUser.techStack.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {profileUser.techStack.map((tech: string, i: number) => (
              <span
                key={i}
                className="text-xs px-2.5 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium border border-border/50"
              >
                {tech}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-4 pt-1">
          {profileUser.website && (
            <Link
              href={profileUser.website.startsWith("http") ? profileUser.website : `https://${profileUser.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-primary hover:underline text-xs"
            >
              <Globe className="h-3.5 w-3.5" />
              {profileUser.website.replace(/^https?:\/\//, "")}
            </Link>
          )}

          {profileUser.repo && (
            <Link
              href={profileUser.repo.startsWith("http") ? profileUser.repo : `https://${profileUser.repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-primary hover:underline text-xs"
            >
              <GitFork className="h-3.5 w-3.5" />
              GitHub Profile / Repo
            </Link>
          )}
        </div>
      </div>

      {/* GitHub Proof-of-Work Dossier */}
      {githubStats && (
        <div className="border-t pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Verified GitHub Proof-of-Work
              </h2>
            </div>
            <Link
              href={`https://github.com/${githubStats.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              @{githubStats.username} <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          {/* Metrics summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border bg-card space-y-0.5">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">Public Repos</span>
              <p className="text-lg font-extrabold text-foreground">{githubStats.publicRepos}</p>
            </div>
            <div className="p-3 rounded-xl border bg-card space-y-0.5">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold flex items-center gap-1">
                <Star className="h-3 w-3 text-amber-500" /> Stargazers
              </span>
              <p className="text-lg font-extrabold text-foreground">{githubStats.totalStars}</p>
            </div>
            <div className="p-3 rounded-xl border bg-card space-y-0.5 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">Followers</span>
              <p className="text-lg font-extrabold text-foreground">{githubStats.followers}</p>
            </div>
          </div>

          {/* Top Verified Languages */}
          {githubStats.topLanguages && githubStats.topLanguages.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                <Code className="h-3.5 w-3.5 text-primary" /> Verified Primary Languages:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {githubStats.topLanguages.map((lang: string, idx: number) => (
                  <span
                    key={idx}
                    className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Top Repositories Showcase */}
          {githubStats.featuredRepos && githubStats.featuredRepos.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                <GitFork className="h-3.5 w-3.5 text-purple-500" /> Top Open-Source Projects:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {githubStats.featuredRepos.slice(0, 4).map((repo: any, idx: number) => (
                  <Link
                    key={idx}
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-xl border bg-card hover:bg-secondary/40 transition-colors space-y-2 block group"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-foreground group-hover:underline truncate max-w-[200px]">
                        {repo.name}
                      </span>
                      <span className="text-[10px] flex items-center gap-0.5 text-amber-500 font-semibold">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> {repo.stars}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {repo.description}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      <span>{repo.language}</span>
                      {repo.forks > 0 && <span>• {repo.forks} forks</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Media Posts Grid */}
      <div className="border-t pt-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Posts
        </h2>

        {parsedPosts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No media posts yet.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {parsedPosts.map(({ post, type }, i) => {
              const isVideo = type === "video";
              const fileUrl = post.fileUrl;

              return (
                <div
                  key={post._id || i}
                  className="aspect-square bg-muted rounded-md overflow-hidden relative group"
                >
                  {isVideo ? (
                    <video
                      src={fileUrl}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      playsInline
                    />
                  ) : fileUrl ? (
                    <img
                      src={fileUrl}
                      alt={post.caption || `Post ${i + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                      No Media
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
