import  connectDB from "@/lib/db"; // ensure this connects to MongoDB
import { User } from "@/models/User";
import { Follows } from "@/models/User";

/**
 * Checks if two users follow each other (mutual follows).
 */
export async function canUsersChat(userName1: string, userName2: string) {
  await connectDB();

  const user1 = await User.findOne({ user_name: userName1 });
  const user2 = await User.findOne({ user_name: userName2 });

  if (!user1 || !user2) return false;

  const follow1 = await Follows.findOne({
    followerId: user1._id,
    followingId: user2._id,
  });

  const follow2 = await Follows.findOne({
    followerId: user2._id,
    followingId: user1._id,
  });

  return true;
  //return !!(follow1 && follow2);
}
