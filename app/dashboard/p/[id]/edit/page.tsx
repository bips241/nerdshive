import { fetchPostById } from "@/lib/data";
import EditPost from "@/components/EditPost";
import { notFound } from "next/navigation";
import { PostWithExtras } from "@/lib/definitions";

type Props = {
  params: {
    id: string;
  };
};

async function EditPostPage({ params: { id } }: Props) {
  const posT: PostWithExtras = await fetchPostById(id);

  const post = JSON.parse(posT);

  if (!post) {
    notFound();
  }

   return <EditPost id={id} post={post} />;
}

export default EditPostPage;