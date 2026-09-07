import { fetchPosts } from "@/lib/data";
import Post from "./Post";
import ShipLogUI from "./dev-posts/ShipLogUI";
import HackathonCrewUI from "./dev-posts/HackathonCrewUI";
import FeedContainer from "./FeedContainer";

const Posts = async () => {
  try {
    const posT: string[] = await fetchPosts();
    const posts = posT.map((post) => JSON.parse(post));

    const postsMeta = posts.map((p) => ({
      id: p._id,
      type: p.postType,
    }));

    const renderedChildren = posts.map((post) => {
      switch (post.postType) {
        case "ship_log":
          return <ShipLogUI key={post._id} post={post} />;
        case "hackathon_crew":
          return <HackathonCrewUI key={post._id} post={post} />;
        case "media":
          return <Post key={post._id} post={post} />;
        default:
          return null;
      }
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
