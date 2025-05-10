import { auth } from "@/auth";
import EditProfileButton from "@/components/editBtn";

import UserAvatar from "@/components/UserAvatar";
import { fetchProfilePosts } from "@/lib/data";


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

async function fetchContentType(url: string): Promise<string | null> {
    try {
        const response = await fetch(url, { method: "HEAD" });
        return response.headers.get("Content-Type");
    } catch (error) {
        console.error("Failed to fetch content type:", error);
        return null;
    }
}

export default async function ProfilePage({ params: { name } }: Props) {
    const session = await auth();
    if (!session) {
        return (
            <div className="text-center">
                You are not authorized to view this profile.
            </div>
        );
    }
    const user = session.user;
    const href = `/dashboard/user/${session.user.user_name}`;
    const isActive = `/dashboard/user/${name}` === href;

    let profilePost: string[] = [];
    try {
        profilePost = await fetchProfilePosts(name);
        console.log("Profile Posts:", profilePost);

        profilePost.forEach((post: string, index: number) => {
            console.log(`Post ${index + 1}:`, JSON.parse(post));
        });
    } catch (error) {
        console.log("Database Error:", error);
    }

    const parsedPosts = await Promise.all(
        profilePost.map(async (postStr) => {
            const post: ProfilePost = JSON.parse(postStr);
            const type = await fetchContentType(post.fileUrl);
            return { post, type };
        })
    );

    return (
        <div className="space-y-6 p-4 max-w-4xl mx-auto">
            {/* Profile Header */}
            <div className="flex items-center space-x-6">
                <UserAvatar
                    user={user}
                    className={`h-24 w-24 ${isActive && "border-2 border-white"}`}
                />
                <div className="space-y-3">
                    <div className="text-2xl font-semibold">{name}</div>
                    <div className="flex space-x-4 text-sm text-muted-foreground">
                        <div>
                            <span className="font-medium text-foreground">120</span> posts
                        </div>
                        <div>
                            <span className="font-medium text-foreground">4.2k</span> followers
                        </div>
                        <div>
                            <span className="font-medium text-foreground">380</span> following
                        </div>
                    </div>
                    <EditProfileButton />
                </div>
            </div>

            {/* Bio */}
            <div className="space-y-1 text-sm">
                <div className="font-medium text-foreground">SDE I at Amazon</div>
                <div className="text-muted-foreground">
                    Frontend dev • Coffee addict ☕ • React nerd
                </div>
            </div>

            {/* Post Grid */}
            <div className="grid grid-cols-3 gap-2">
                {parsedPosts.map(({ post, type }, i) => {
                    const isVideo = type?.startsWith("video/");
                    const isImage = type?.startsWith("image/");
                    const fileUrl = post.fileUrl;

                    return (
                        <div
                            key={post._id || i}
                            className="aspect-square bg-muted rounded-md overflow-hidden"
                        >
                            {isVideo ? (
                                <video
                                    src={fileUrl}
                                    className="w-full h-full object-cover"
                                    muted
                                    loop
                                    playsInline
                                />
                            ) : isImage ? (
                                <img
                                    src={fileUrl}
                                    alt={post.caption || `Post ${i + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                                    Unsupported file
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
