const dbConnect = require("./db.config");

module.exports = (req, res, next) => {
  dbConnect("resultats", async (db, client) => {
    const reponse = await db
      .aggregate([
        {
          $group: {
            _id: "$partie",
            infos: {
              $addToSet: {
                $concat: ["$pseudo", " - ", { $toString: "$points" }],
              },
            },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 50 },
      ])
      .toArray();
    client.close();
    res.send(reponse);
  });
};
