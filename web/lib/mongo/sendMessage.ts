// lib/mongo/sendMessage.ts
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// Create or get roomId based on user IDs
const getRoomId = (userId1: string, userId2: string) => {
  return userId1 < userId2 ? `${userId1}-${userId2}` : `${userId2}-${userId1}`;
};

// Send message
export async function sendMessage(currentUserId: string, targetUserId: string, message: string) {
  const roomId = getRoomId(currentUserId, targetUserId);

  await addDoc(collection(db, "rooms", roomId, "messages"), {
    text: message,
    senderId: currentUserId,
    timestamp: serverTimestamp(),
  });
}
