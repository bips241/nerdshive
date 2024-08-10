import { fetchPosts } from "@/lib/data";
import Post from "./Post";

const Posts = async () => {
  try {
    const posT: string[] = await fetchPosts();
    const posts = posT.map(post => JSON.parse(post));



    
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
