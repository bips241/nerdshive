import { auth } from "@/auth";
import { cache } from "react";

export const getSession = cache(async () => {
  const session = await auth();
  return session;
});
export const getUserId = async () => {
  const session = await auth();
  console.log(session);
  const userId = session?.user?._id;

  if (!userId) {
    throw new Error("You must be signed in to use this feature");
  }

  return userId;
};