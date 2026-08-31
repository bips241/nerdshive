import mongoose from "mongoose";

declare global {
    // eslint-disable-next-line no-var
    var mongooseCache:
        | {
                conn: typeof mongoose | null;
                promise: Promise<typeof mongoose> | null;
            }
        | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined");
}

const cached = global.mongooseCache || { conn: null, promise: null };
global.mongooseCache = cached;

const connectDB = async () => {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URI, {
            bufferCommands: false,
            serverSelectionTimeoutMS: 15000,
            maxPoolSize: 10,
        });
    }

    try {
        cached.conn = await cached.promise;
        return cached.conn;
    } catch (error) {
        cached.promise = null;
        throw error;
    }
};

export default connectDB;