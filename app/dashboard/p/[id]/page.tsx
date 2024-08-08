import { SinglePostSkeleton } from "@/components/Skeletons";
import { Suspense } from "react";
import { Separator } from "@/components/ui/separator";
import SinglePost from "@/components/SinglePost";
import MorePosts from "@/components/MorePosts";

type Props = {
  params: {
    id: string;
  };
};

function PostPage({ params: { id } }: Props) {
  return (
    <div>
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
