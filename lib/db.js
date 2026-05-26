const { MongoClient } = require('mongodb');

// Ensure you set MONGODB_URI in your environment variables.
// Example: mongodb+srv://<username>:<password>@cluster0.mongodb.net/naziastudio?retryWrites=true&w=majority
const uri = process.env.MONGODB_URI;

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  if (!uri) {
    console.warn('MONGODB_URI is not set in environment variables.');
    return null;
  }

  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  await client.connect();
  const db = client.db('naziastudio'); // Database name

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

async function getCollection(name) {
  const connection = await connectToDatabase();
  if (!connection) return null;
  return connection.db.collection(name);
}

module.exports = {
  connectToDatabase,
  getCollection
};
