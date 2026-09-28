import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// Cache the connection on globalThis so hot reloads in development and warm
// serverless invocations in production reuse a single connection pool.
const globalForMongoose = globalThis as unknown as { _mongoose?: MongooseCache };
const cache: MongooseCache = (globalForMongoose._mongoose ??= { conn: null, promise: null });

export async function dbConnect(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.");
  }

  cache.promise ??= mongoose
    .connect(uri, {
      bufferCommands: false,
      // Small pool: the Atlas free tier caps connections and serverless
      // functions each hold their own pool.
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10_000,
    })
    .catch((err) => {
      cache.promise = null;
      throw err;
    });

  cache.conn = await cache.promise;
  return cache.conn;
}
