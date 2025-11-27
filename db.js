// Connexion et gestion MongoDB avec fallback mémoire
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'jeumusical';
const USE_MONGO = !!MONGODB_URI;

let cachedClient = null;
let cachedDb = null;

// Fallback en mémoire si MongoDB n'est pas disponible
let memoryDB = { users: [], songs: [], votes: [] };
let mongoFailed = false;

async function connectToDatabase() {
  // Si MongoDB a déjà échoué, utiliser la mémoire
  if (mongoFailed || !USE_MONGO) {
    return null;
  }

  // Utiliser la connexion en cache si disponible
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  try {
    // Créer nouvelle connexion avec timeout plus court
    const client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    await client.connect();
    const db = client.db(DB_NAME);

    // Mettre en cache pour les prochains appels
    cachedClient = client;
    cachedDb = db;

    console.log('✅ Connecté à MongoDB');
    return { client, db };
  } catch (err) {
    console.error('❌ Erreur MongoDB, fallback vers mémoire:', err.message);
    mongoFailed = true;
    return null;
  }
}

// Helpers pour accéder aux collections
async function getCollection(collectionName) {
  const conn = await connectToDatabase();
  if (conn) {
    return conn.db.collection(collectionName);
  }
  return null; // Utiliser le fallback mémoire
}

async function getUsers() {
  const collection = await getCollection('users');
  if (collection) {
    return await collection.find({}).toArray();
  }
  return memoryDB.users;
}

async function findUserById(id) {
  const collection = await getCollection('users');
  if (collection) {
    return await collection.findOne({ id });
  }
  return memoryDB.users.find(u => u.id === id);
}

async function findUserByFirstName(firstName) {
  const collection = await getCollection('users');
  if (collection) {
    return await collection.findOne({ 
      firstName: { $regex: new RegExp(`^${firstName}$`, 'i') } 
    });
  }
  return memoryDB.users.find(u => u.firstName.toLowerCase() === firstName.toLowerCase());
}

async function createUser(user) {
  const collection = await getCollection('users');
  if (collection) {
    await collection.insertOne(user);
  } else {
    memoryDB.users.push(user);
  }
  return user;
}

async function getSongs() {
  const collection = await getCollection('songs');
  if (collection) {
    return await collection.find({}).toArray();
  }
  return memoryDB.songs;
}

async function findSongById(id) {
  const collection = await getCollection('songs');
  if (collection) {
    return await collection.findOne({ id });
  }
  return memoryDB.songs.find(s => s.id === id);
}

async function findSongByUserId(userId) {
  const collection = await getCollection('songs');
  if (collection) {
    return await collection.findOne({ userId });
  }
  return memoryDB.songs.find(s => s.userId === userId);
}

async function createSong(song) {
  const collection = await getCollection('songs');
  if (collection) {
    await collection.insertOne(song);
  } else {
    memoryDB.songs.push(song);
  }
  return song;
}

async function getVotes() {
  const collection = await getCollection('votes');
  if (collection) {
    return await collection.find({}).toArray();
  }
  return memoryDB.votes;
}

async function findVote(voterUserId, songId) {
  const collection = await getCollection('votes');
  if (collection) {
    return await collection.findOne({ voterUserId, songId });
  }
  return memoryDB.votes.find(v => v.voterUserId === voterUserId && v.songId === songId);
}

async function createVote(vote) {
  const collection = await getCollection('votes');
  if (collection) {
    await collection.insertOne(vote);
  } else {
    memoryDB.votes.push(vote);
  }
  return vote;
}

async function deleteAllSongs() {
  const collection = await getCollection('songs');
  if (collection) {
    await collection.deleteMany({});
  } else {
    memoryDB.songs = [];
  }
}

async function deleteAllVotes() {
  const collection = await getCollection('votes');
  if (collection) {
    await collection.deleteMany({});
  } else {
    memoryDB.votes = [];
  }
}

async function deleteAllUsers() {
  const collection = await getCollection('users');
  if (collection) {
    await collection.deleteMany({});
  } else {
    memoryDB.users = [];
  }
}

module.exports = {
  connectToDatabase,
  getUsers,
  findUserById,
  findUserByFirstName,
  createUser,
  getSongs,
  findSongById,
  findSongByUserId,
  createSong,
  getVotes,
  findVote,
  createVote,
  deleteAllSongs,
  deleteAllVotes,
  deleteAllUsers,
};
