const MongoClient = require("mongodb").MongoClient;

module.exports = function dbConnect(collection, callback) {
  MongoClient.connect(
    "mongodb://localhost:27017",
    { useUnifiedTopology: true },
    (err, client) => {
      const db = client.db("jeumulti").collection(collection);
      callback(db, client);
    }
  );
};
