import PostView from "@/components/PostView";
import { fetchPostById } from "@/lib/data";
import { PostWithExtras } from "@/lib/definitions";
import { notFound } from "next/navigation";

type Props = {
  params: {
    id: string;
  };
};


async function PostModal({ params: { id } }: Props) {
  
  const fetchContentType = async (url: string) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.headers.get('Content-Type');
    } catch (error) {
      console.error('Error fetching content type:', error);
      return null;
    }
  };
  
  const post = await fetchPostById(id);
  const posT = JSON.parse(post);

  const contentType = await fetchContentType(posT.fileUrl);
  const isImage = contentType?.startsWith('image');
  

  if (!posT) {
    notFound();
  }


   return <PostView id={id} post={posT} isImage={isImage ?? false} />;
}

export default PostModal;