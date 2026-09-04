import { SinglePostSkeleton } from "@/components/Skeletons";
import { Suspense } from "react";
import { Separator } from "@/components/ui/separator";
import SinglePost from "@/components/SinglePost";
import MorePosts from "@/components/MorePosts";
import type { Metadata } from "next";
import connectDB from "@/lib/db";
import { Post } from "@/models/User";

type Props = {
  params: {
    id: string;
  };
};

export async function generateMetadata({ params: { id } }: Props): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nerdshive.online";

  try {
    if (process.env.MONGODB_URI) {
      await connectDB();
      const post: any = await Post.findById(id).populate("userId", "user_name").lean();
      if (post) {
        const username = post.userId?.user_name || "developer";
        let title = `Discussion by @${username}`;
        let description = post.caption || "Join the discussion on NerdShive.";
        let tags: string[] = ["nerdshive", post.postType || "engineering"];

        if (post.postType === "ship_log" && post.shipLog?.title) {
          title = `[Ship Log] ${post.shipLog.title} by @${username}`;
          description = post.shipLog.pitch || description;
          if (post.shipLog.techStack) tags.push(...post.shipLog.techStack);
        } else if (post.postType === "code_sos" && post.codeSos?.title) {
          title = `[Code SOS] ${post.codeSos.title} (${post.codeSos.language || "Code"})`;
          description = post.codeSos.triedSteps || post.codeSos.errorLog || description;
        } else if (post.postType === "architecture_rfc" && post.architectureRfc?.title) {
          title = `[System RFC] ${post.architectureRfc.title}`;
          description = post.architectureRfc.challenge || description;
        } else if (post.postType === "hackathon_crew" && post.hackathonCrew?.hackathonName) {
          title = `[Crew Call] ${post.hackathonCrew.hackathonName}`;
          description = `Assembling a team for ${post.hackathonCrew.hackathonName}. Seeking: ${(post.hackathonCrew.rolesNeed || []).join(", ")}`;
        } else if (post.postType === "tech_showdown" && post.techShowdown?.topic) {
          title = `[Tech Showdown] ${post.techShowdown.topic}`;
          description = `Debate & benchmark: ${post.techShowdown.optionA?.name} vs ${post.techShowdown.optionB?.name}. Cast your vote!`;
        }

        const ogImageUrl = `${siteUrl}/api/og?title=${encodeURIComponent(title)}&desc=${encodeURIComponent(description.slice(0, 100))}&type=${post.postType || "post"}`;

        return {
          title,
          description: description.slice(0, 160),
          keywords: tags,
          alternates: {
            canonical: `${siteUrl}/dashboard/p/${id}`,
          },
          openGraph: {
            title,
            description: description.slice(0, 160),
            url: `${siteUrl}/dashboard/p/${id}`,
            siteName: "NerdShive",
            type: "article",
            publishedTime: post.createdAt ? new Date(post.createdAt).toISOString() : undefined,
            authors: [username],
            images: [
              {
                url: post.fileUrl || ogImageUrl,
                width: 1200,
                height: 630,
                alt: title,
              },
            ],
          },
          twitter: {
            card: "summary_large_image",
            title,
            description: description.slice(0, 160),
            images: [post.fileUrl || ogImageUrl],
          },
        };
      }
    }
  } catch (e) {
    console.warn("[SEO] Error generating post metadata:", e);
  }

  return {
    title: "Developer Post",
    description: "View open-source engineering updates and code SOS discussions on NerdShive.",
  };
}

async function PostPage({ params: { id } }: Props) {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nerdshive.online";
  
  let jsonLdArticle: any = null;
  try {
    if (process.env.MONGODB_URI) {
      await connectDB();
      const postData: any = await Post.findById(id).populate("userId", "user_name").lean();
      if (postData) {
        const username = postData.userId?.user_name || "developer";
        const title = postData.shipLog?.title || postData.codeSos?.title || postData.architectureRfc?.title || postData.caption || "Developer Post";
        jsonLdArticle = {
          "@context": "https://schema.org",
          "@type": postData.postType === "code_sos" ? "SoftwareSourceCode" : "TechArticle",
          headline: title,
          url: `${siteUrl}/dashboard/p/${id}`,
          datePublished: postData.createdAt ? new Date(postData.createdAt).toISOString() : undefined,
          dateModified: postData.updatedAt ? new Date(postData.updatedAt).toISOString() : undefined,
          author: {
            "@type": "Person",
            name: username,
            url: `${siteUrl}/dashboard/user/${encodeURIComponent(username)}`,
          },
          publisher: {
            "@type": "Organization",
            name: "NerdShive",
            url: siteUrl,
          },
          image: postData.fileUrl || `${siteUrl}/api/og?title=${encodeURIComponent(title)}`,
          interactionStatistic: {
            "@type": "InteractionCounter",
            interactionType: "https://schema.org/LikeAction",
            userInteractionCount: postData.likes?.length || 0,
          },
        };
      }
    }
  } catch (err) {
    // Non-blocking fallback
  }

  return (
    <div>
      {jsonLdArticle && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }}
        />
      )}
      <Suspense fallback={<SinglePostSkeleton />}>
        <SinglePost id={id} />
      </Suspense>

      <Separator className="my-12 max-w-3xl lg:max-w-4xl mx-auto" />

      <Suspense>
        <MorePosts postId={id} />
      </Suspense>
    </div>
  );
}

export default PostPage;
