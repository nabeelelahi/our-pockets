/**
 * Optional throwaway MongoDB for local development (no Atlas account needed).
 * Data lives only while this process runs.
 *
 *   npm run db:local
 *   # then in .env.local: MONGODB_URI=mongodb://127.0.0.1:27017/our-pockets
 */
import { MongoMemoryServer } from "mongodb-memory-server";

const port = Number(process.env.LOCAL_DB_PORT ?? 27017);

MongoMemoryServer.create({ instance: { port } }).then((server) => {
  console.log(`Local MongoDB running at ${server.getUri()}our-pockets`);
  console.log("Data is lost when you stop this process (Ctrl+C).");
  const stop = () => server.stop().then(() => process.exit(0));
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
});
