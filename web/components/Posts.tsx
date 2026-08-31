import { fetchPosts } from "@/lib/data";
import Post from "./Post";
import PollPostUI from "./PollPostUI";
import GoalPostUI from "./GoalPostUI";
import ProjectPostUI from "./ProjectPostUI";

const Posts = async () => {
  try {
    const posT: string[] = await fetchPosts();
    const posts = posT.map(post => JSON.parse(post));

    

    return (
      <>
        {posts.map((post) => {
          switch (post.postType) {
            case 'media':
              return <Post key={post._id} post={post} />;
            case 'poll':
              return <PollPostUI key={post._id} post={post} />;
            case 'goal':
              return <GoalPostUI key={post._id} post={post} />;
            case 'project':
              console.log("Project Post:", post);
              return <ProjectPostUI key={post._id} post={post} />;
            default:
              return null;
          }
        })}
      </>
    );
  } catch (error) {
    console.error("Error fetching posts:", error);
    return <div>Error loading posts</div>;
  }
};

export default Posts;
