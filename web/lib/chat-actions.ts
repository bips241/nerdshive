"use server";

import { auth } from "@/auth";
import connectDB from "@/lib/db";
import { Server, Message, ChatRoom, User } from "@/models/User";
import mongoose from "mongoose";
import crypto from "crypto";

// Helper: Ensure user is authenticated
async function getAuthUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?._id) {
    throw new Error("Unauthorized: Please sign in");
  }
  return session.user._id.toString();
}

/**
 * 1. Fetch all servers user belongs to (or creates default if none)
 */
export async function getUserServers() {
  await connectDB();
  const userId = await getAuthUserId();

  try {
    let servers = await Server.find({
      "members.user": new mongoose.Types.ObjectId(userId),
    }).sort({ createdAt: -1 });

    // Seed default public community if user has no servers
    if (servers.length === 0) {
      const defaultServer = await createDefaultServer(userId);
      servers = [defaultServer];
    }

    return JSON.parse(JSON.stringify(servers));
  } catch (error) {
    console.error("Error fetching user servers:", error);
    return [];
  }
}

/**
 * Helper to seed a starter server
 */
async function createDefaultServer(ownerId: string) {
  const inviteCode = "nerdshive-hub-" + crypto.randomBytes(3).toString("hex");
  const server = new Server({
    name: "NerdShive HQ",
    description: "The global community for developers, hackers, and creators.",
    iconUrl: "",
    ownerId: new mongoose.Types.ObjectId(ownerId),
    inviteCode,
    members: [
      {
        user: new mongoose.Types.ObjectId(ownerId),
        role: "owner",
        joinedAt: new Date(),
      },
    ],
    channels: [
      {
        name: "general",
        type: "text",
        topic: "Welcome to NerdShive HQ text lounge",
        createdAt: new Date(),
      },
      {
        name: "code-sos",
        type: "text",
        topic: "Live bug triage & peer debugging questions",
        createdAt: new Date(),
      },
      {
        name: "dev-lounge",
        type: "voice",
        topic: "Voice hangout for community developers",
        createdAt: new Date(),
      },
      {
        name: "pair-hacking",
        type: "video",
        topic: "Multi-party video & screen sharing workspace",
        createdAt: new Date(),
      },
    ],
  });

  await server.save();
  return server;
}

/**
 * 2. Create a new server
 */
export async function createServerAction(data: {
  name: string;
  description?: string;
  iconUrl?: string;
}) {
  await connectDB();
  const userId = await getAuthUserId();

  if (!data.name || data.name.trim().length === 0) {
    return { error: "Server name is required" };
  }

  try {
    const inviteCode = crypto.randomBytes(4).toString("hex");
    const server = new Server({
      name: data.name.trim(),
      description: data.description?.trim() || "",
      iconUrl: data.iconUrl || "",
      ownerId: new mongoose.Types.ObjectId(userId),
      inviteCode,
      members: [
        {
          user: new mongoose.Types.ObjectId(userId),
          role: "owner",
          joinedAt: new Date(),
        },
      ],
      channels: [
        {
          name: "general",
          type: "text",
          topic: "General conversation",
          createdAt: new Date(),
        },
        {
          name: "voice-lounge",
          type: "voice",
          topic: "Casual voice chat",
          createdAt: new Date(),
        },
        {
          name: "screen-share",
          type: "video",
          topic: "Video & screen sharing room",
          createdAt: new Date(),
        },
      ],
    });

    await server.save();
    return { success: true, server: JSON.parse(JSON.stringify(server)) };
  } catch (error: any) {
    console.error("Error creating server:", error);
    return { error: error.message || "Failed to create server" };
  }
}

/**
 * 3. Create a channel in a server
 */
export async function createChannelAction(data: {
  serverId: string;
  name: string;
  type: "text" | "voice" | "video";
  topic?: string;
}) {
  await connectDB();
  const userId = await getAuthUserId();

  try {
    const server = await Server.findById(data.serverId);
    if (!server) return { error: "Server not found" };

    // Check membership
    const isMember = server.members.some(
      (m) => m.user.toString() === userId
    );
    if (!isMember) return { error: "You are not a member of this server" };

    const sanitizedName = data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");

    const newChannel = {
      _id: new mongoose.Types.ObjectId(),
      name: sanitizedName,
      type: data.type,
      topic: data.topic || "",
      createdAt: new Date(),
    };

    server.channels.push(newChannel as any);
    await server.save();

    return { success: true, channel: JSON.parse(JSON.stringify(newChannel)) };
  } catch (error: any) {
    console.error("Error creating channel:", error);
    return { error: error.message || "Failed to create channel" };
  }
}

/**
 * 4. Join server by invite code
 */
export async function joinServerByInviteAction(inviteCode: string) {
  await connectDB();
  const userId = await getAuthUserId();

  try {
    const server = await Server.findOne({ inviteCode: inviteCode.trim() });
    if (!server) return { error: "Invalid invite code" };

    const alreadyMember = server.members.some(
      (m) => m.user.toString() === userId
    );

    if (!alreadyMember) {
      server.members.push({
        user: new mongoose.Types.ObjectId(userId),
        role: "member",
        joinedAt: new Date(),
      });
      await server.save();
    }

    return { success: true, server: JSON.parse(JSON.stringify(server)) };
  } catch (error: any) {
    console.error("Error joining server:", error);
    return { error: error.message || "Failed to join server" };
  }
}

/**
 * 5. Get channel messages
 */
export async function getChannelMessages(channelId: string, limit = 50) {
  await connectDB();
  await getAuthUserId();

  try {
    const messages = await Message.find({
      channelId: new mongoose.Types.ObjectId(channelId),
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("senderId", "user_name image avatar");

    // Return in chronological order
    const reversed = messages.reverse();
    return JSON.parse(JSON.stringify(reversed));
  } catch (error) {
    console.error("Error fetching channel messages:", error);
    return [];
  }
}

/**
 * 6. Send channel message
 */
export async function sendChannelMessageAction(data: {
  channelId: string;
  serverId: string;
  message: string;
  codeSnippet?: { language: string; code: string };
  attachments?: { url: string; fileType: string; fileName: string }[];
}) {
  await connectDB();
  const userId = await getAuthUserId();

  if (!data.message.trim() && !data.codeSnippet?.code && (!data.attachments || data.attachments.length === 0)) {
    return { error: "Message content cannot be empty" };
  }

  try {
    const newMsg = new Message({
      channelId: new mongoose.Types.ObjectId(data.channelId),
      serverId: new mongoose.Types.ObjectId(data.serverId),
      senderId: new mongoose.Types.ObjectId(userId),
      message: data.message.trim(),
      codeSnippet: data.codeSnippet,
      attachments: data.attachments || [],
      createdAt: new Date(),
    });

    await newMsg.save();

    // Populate sender info for return
    const populated = await Message.findById(newMsg._id).populate(
      "senderId",
      "user_name image avatar"
    );

    return { success: true, message: JSON.parse(JSON.stringify(populated)) };
  } catch (error: any) {
    console.error("Error sending channel message:", error);
    return { error: error.message || "Failed to send message" };
  }
}

/**
 * 7. Direct Message: Get or Create DM Room
 */
export async function getOrCreateDirectChatRoomAction(targetUserId: string) {
  await connectDB();
  const userId = await getAuthUserId();

  if (userId === targetUserId) {
    return { error: "Cannot create DM with yourself" };
  }

  try {
    let room = await ChatRoom.findOne({
      participants: {
        $all: [
          new mongoose.Types.ObjectId(userId),
          new mongoose.Types.ObjectId(targetUserId),
        ],
      },
    }).populate("participants", "user_name image avatar");

    if (!room) {
      room = new ChatRoom({
        participants: [
          new mongoose.Types.ObjectId(userId),
          new mongoose.Types.ObjectId(targetUserId),
        ],
      });
      await room.save();
      room = await ChatRoom.findById(room._id).populate(
        "participants",
        "user_name image avatar"
      );
    }

    return { success: true, room: JSON.parse(JSON.stringify(room)) };
  } catch (error: any) {
    console.error("Error creating DM room:", error);
    return { error: error.message || "Failed to open direct chat" };
  }
}

/**
 * 8. Get Direct Messages
 */
export async function getDirectMessages(chatRoomId: string, limit = 50) {
  await connectDB();
  await getAuthUserId();

  try {
    const messages = await Message.find({
      chatRoomId: new mongoose.Types.ObjectId(chatRoomId),
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("senderId", "user_name image avatar");

    return JSON.parse(JSON.stringify(messages.reverse()));
  } catch (error) {
    console.error("Error fetching direct messages:", error);
    return [];
  }
}

/**
 * 9. Send Direct Message
 */
export async function sendDirectMessageAction(data: {
  chatRoomId: string;
  receiverId: string;
  message: string;
}) {
  await connectDB();
  const userId = await getAuthUserId();

  if (!data.message.trim()) {
    return { error: "Message cannot be empty" };
  }

  try {
    const newMsg = new Message({
      chatRoomId: new mongoose.Types.ObjectId(data.chatRoomId),
      senderId: new mongoose.Types.ObjectId(userId),
      receiverId: new mongoose.Types.ObjectId(data.receiverId),
      message: data.message.trim(),
      createdAt: new Date(),
    });

    await newMsg.save();

    const populated = await Message.findById(newMsg._id).populate(
      "senderId",
      "user_name image avatar"
    );

    return { success: true, message: JSON.parse(JSON.stringify(populated)) };
  } catch (error: any) {
    console.error("Error sending direct message:", error);
    return { error: error.message || "Failed to send direct message" };
  }
}
