const dbConnect = require("./db.config");

module.exports = (req, res, next) => {
  dbConnect("sockets", async (db, client) => {
    try {
      const dada = await db.find({ pseudo: req.body.pseudo }).count();
      dada != 0 ? res.send("error") : res.send(req.body.pseudo);
      client.close();
    } catch (e) {
      console.log(e);
    } finally {
    }
  });
};
