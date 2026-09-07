import { fetchPostById } from "@/lib/data";
import EditPost from "@/components/EditPost";
import { notFound, redirect } from "next/navigation";
import { PostWithExtras } from "@/lib/definitions";
import { auth } from "@/auth";

type Props = {
  params: {
    id: string;
  };
};

async function EditPostPage({ params: { id } }: Props) {
  const session = await auth();
  const currentUserId = session?.user?._id?.toString();

  if (!currentUserId) {
    redirect("/login");
  }

  const posT: PostWithExtras = await fetchPostById(id);
  const post = JSON.parse(posT as any);

  if (!post) {
    notFound();
  }

  const postAuthorId =
    typeof post.userId === "object" && post.userId !== null
      ? post.userId._id?.toString() || post.userId.toString()
      : post.userId?.toString();

  if (postAuthorId !== currentUserId) {
    redirect("/dashboard");
  }

  return <EditPost id={id} post={post} />;
}

export default EditPostPage;