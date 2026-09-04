import { auth } from "@/auth";
import EditProfileButton from "@/components/editBtn";
import FollowButton from "@/components/followBtn";
import UserAvatar from "@/components/UserAvatar";
import { fetchProfilePosts } from "@/lib/data";
import connectDB from "@/lib/db";
import { User, Follows, Post } from "@/models/User";
import { Globe, GitFork } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

type Props = {
  params: {
    name: string;
  };
};

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
  if (!session) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        You are not authorized to view this profile. Please log in.
      </div>
    );
  }

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
    if (session.user?._id) {
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
  const isOwnProfile = session.user?.user_name === name;

  // Aggregate real stats
  const [postCount, followersCount, followingCount] = await Promise.all([
    Post.countDocuments({ userId: profileUserId }),
    Follows.countDocuments({ followingId: profileUserId }),
    Follows.countDocuments({ followerId: profileUserId }),
  ]);

  let profilePostsRaw: string[] = [];
  try {
    profilePostsRaw = await fetchProfilePosts(name);
  } catch (error) {
    console.error("Error fetching profile posts:", error);
  }

  const parsedPosts: { post: ProfilePost; type: "video" | "image" | "unknown" }[] = profilePostsRaw.map((postStr) => {
    const post: ProfilePost = JSON.parse(postStr);
    return { post, type: getMediaType(post.fileUrl) };
  });

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">
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

          <div className="flex space-x-6 text-sm text-muted-foreground">
            <div>
              <span className="font-semibold text-foreground">{postCount}</span> posts
            </div>
            <div>
              <span className="font-semibold text-foreground">{followersCount}</span> followers
            </div>
            <div>
              <span className="font-semibold text-foreground">{followingCount}</span> following
            </div>
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
            ) : (
              <FollowButton name={name} followerId={session.user?._id || ""} />
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
