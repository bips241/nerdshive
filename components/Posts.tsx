import { fetchPosts } from "@/lib/data";
import Post from "./Post";

const Posts = async () => {
  try {
    const posts = await fetchPosts();


    
    return (
      <>
        {posts.map((post) => (
          <Post key={post._id} post={post} />
        ))}
      </>
    );
  } catch (error) {
    console.error("Error fetching posts:", error);
    return <div>Error loading posts</div>;
  }
};

export default Posts;
