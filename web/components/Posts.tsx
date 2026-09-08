import { fetchPosts } from "@/lib/data";
import Post from "./Post";
import ShipLogUI from "./dev-posts/ShipLogUI";
import HackathonCrewUI from "./dev-posts/HackathonCrewUI";
import FeedContainer, { FeedItemWrapper } from "./FeedContainer";

const Posts = async () => {
  try {
    const posT: string[] = await fetchPosts();
    const posts = posT.map((post) => JSON.parse(post));

    const postsMeta = posts.map((p) => ({
      id: p._id,
      type: p.postType,
    }));

    const renderedChildren = posts.map((post) => {
      let content = null;
      switch (post.postType) {
        case "ship_log":
          content = <ShipLogUI post={post} />;
          break;
        case "hackathon_crew":
          content = <HackathonCrewUI post={post} />;
          break;
        case "media":
          content = <Post post={post} />;
          break;
        default:
          return null;
      }
      return (
        <FeedItemWrapper key={post._id} postType={post.postType}>
          {content}
        </FeedItemWrapper>
      );
    });

    return (
      <FeedContainer postsMeta={postsMeta}>
        {renderedChildren}
      </FeedContainer>
    );
  } catch (error) {
    console.error("Error fetching posts:", error);
    return <div>Error loading posts</div>;
  }
};

export default Posts;
