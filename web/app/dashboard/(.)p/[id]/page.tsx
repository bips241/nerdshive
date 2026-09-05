import PostView from "@/components/PostView";
import DevPostModal from "@/components/DevPostModal";
import { fetchPostById } from "@/lib/data";
import { notFound } from "next/navigation";

type Props = {
  params: {
    id: string;
  };
};

async function PostModal({ params: { id } }: Props) {
  const post = await fetchPostById(id);
  if (!post) {
    notFound();
  }

  const posT = JSON.parse(post);
  if (!posT) {
    notFound();
  }

  // Handle developer archetype posts in interactive modal
  if (posT.postType && posT.postType !== "media") {
    return <DevPostModal post={posT} />;
  }

  const fetchContentType = async (url?: string) => {
    if (!url) return null;
    try {
      const response = await fetch(url, { method: "HEAD" });
      return response.headers.get("Content-Type");
    } catch (error) {
      console.error("Error fetching content type:", error);
      return null;
    }
  };

  const contentType = posT.fileUrl ? await fetchContentType(posT.fileUrl) : null;
  const isImage = contentType?.startsWith("image");

  return <PostView id={id} post={posT} isImage={isImage ?? false} />;
}

export default PostModal;