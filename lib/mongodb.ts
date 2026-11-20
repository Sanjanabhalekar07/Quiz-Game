import { MongoClient } from "mongodb";

const databaseName = process.env.MONGODB_DB ?? "brightside-quiz";

const globalWithMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

let clientPromise = globalWithMongo.mongoClientPromise;

export async function getDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Please define the MONGODB_URI environment variable.");

  clientPromise ??= new MongoClient(uri).connect();
  if (process.env.NODE_ENV !== "production") {
    globalWithMongo.mongoClientPromise = clientPromise;
  }
  const client = await clientPromise;
  return client.db(databaseName);
}
