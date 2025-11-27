// Connexion et gestion MongoDB
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'jeumusical';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  // Utiliser la connexion en cache si disponible
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI non définie dans les variables d\'environnement');
  }

  // Créer nouvelle connexion
  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 1,
  });

  await client.connect();
  const db = client.db(DB_NAME);

  // Mettre en cache pour les prochains appels
  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

// Helpers pour accéder aux collections
async function getCollection(collectionName) {
  const { db } = await connectToDatabase();
  return db.collection(collectionName);
}

async function getUsers() {
  const collection = await getCollection('users');
  return await collection.find({}).toArray();
}

async function findUserById(id) {
  const collection = await getCollection('users');
  return await collection.findOne({ id });
}

async function findUserByFirstName(firstName) {
  const collection = await getCollection('users');
  return await collection.findOne({ 
    firstName: { $regex: new RegExp(`^${firstName}$`, 'i') } 
  });
}

async function createUser(user) {
  const collection = await getCollection('users');
  await collection.insertOne(user);
  return user;
}

async function getSongs() {
  const collection = await getCollection('songs');
  return await collection.find({}).toArray();
}

async function findSongById(id) {
  const collection = await getCollection('songs');
  return await collection.findOne({ id });
}

async function findSongByUserId(userId) {
  const collection = await getCollection('songs');
  return await collection.findOne({ userId });
}

async function createSong(song) {
  const collection = await getCollection('songs');
  await collection.insertOne(song);
  return song;
}

async function getVotes() {
  const collection = await getCollection('votes');
  return await collection.find({}).toArray();
}

async function findVote(voterUserId, songId) {
  const collection = await getCollection('votes');
  return await collection.findOne({ voterUserId, songId });
}

async function createVote(vote) {
  const collection = await getCollection('votes');
  await collection.insertOne(vote);
  return vote;
}

async function deleteAllSongs() {
  const collection = await getCollection('songs');
  await collection.deleteMany({});
}

async function deleteAllVotes() {
  const collection = await getCollection('votes');
  await collection.deleteMany({});
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
};
