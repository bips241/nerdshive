import { fetchPosts } from "@/lib/data";
import Post from "./Post";
import PollPostUI from "./PollPostUI";
import GoalPostUI from "./GoalPostUI";
import ProjectPostUI from "./ProjectPostUI";
import ShipLogUI from "./dev-posts/ShipLogUI";
import CodeSosUI from "./dev-posts/CodeSosUI";
import ArchitectureRfcUI from "./dev-posts/ArchitectureRfcUI";
import HackathonCrewUI from "./dev-posts/HackathonCrewUI";
import TechShowdownUI from "./dev-posts/TechShowdownUI";

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
        case "code_sos":
          return <CodeSosUI key={post._id} post={post} />;
        case "architecture_rfc":
          return <ArchitectureRfcUI key={post._id} post={post} />;
        case "hackathon_crew":
          return <HackathonCrewUI key={post._id} post={post} />;
        case "tech_showdown":
          return <TechShowdownUI key={post._id} post={post} />;
        case "media":
          return <Post key={post._id} post={post} />;
        case "poll":
          return <PollPostUI key={post._id} post={post} />;
        case "goal":
          return <GoalPostUI key={post._id} post={post} />;
        case "project":
          return <ProjectPostUI key={post._id} post={post} />;
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
