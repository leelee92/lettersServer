const express = require("express");
const http = require("http");
const cors = require("cors");
const MongoClient = require("mongodb").MongoClient;

const tirageLettres = require("./tirageLettres");
const estValide = require("./estValide");

const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: "http://localhost:8080",
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function dbConnect(collection, callback) {
  MongoClient.connect(
    "mongodb://localhost:27017",
    { useUnifiedTopology: true },
    (err, client) => {
      const db = client.db("jeumulti").collection(collection);
      callback(db, client);
    }
  );
}

app.post("/check", (req, res, next) => {
  dbConnect("sockets", async (db, client) => {
    const dada = await db.find({ pseudo: req.body.pseudo }).count();
    dada != 0 ? res.send("error") : res.send(req.body.pseudo);
    client.close();
  });
});

app.get("/scores", (req, res, next) => {
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
});

const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:8080",
  },
});

/**
 * Gestion socket connection
 */

io.on("connection", (socket) => {
  console.log("user connecté");

  /***************EVENEMENTS SOCKET******************/

  socket.on("c-demande-partie", (pseudo) => {
    dbConnect("sockets", async (db, client) => {
      await db.find().toArray((err, documents) => {
        const cursor = documents.length;
        if (cursor < 2) {
          db.insertOne({ socketId: socket.id, pseudo: pseudo }, async (err) => {
            socket.join("room");
            if (err) console.log(err);
            await db.find().toArray((err, documents) => {
              const cursor = documents.length;
              //  si 2 joueurs sont connectés pour pouvoir lancer une partie
              if (cursor == 2) {
                const numeroPartie = Date.now();
                //documents.forEach((document) => {
                io.to("room").emit(
                  "s-redirige-vers-la-partie",
                  numeroPartie,
                  pseudo
                );
                //});
                const mot = tirageLettres();
                console.log(mot);
                // on decale l'envoi du tirage à tous les joueurs de 2 secondes
                setTimeout(() => {
                  io.to("room").emit("s-envoi-tirage", mot);
                  // on demarre le chrono d'1 min seulement quand le tirage est envoyé
                  setTimeout(() => {
                    io.to("room").emit("s-arret-chrono");
                  }, 60000);
                }, 1000);
              } else {
                // on indique au premier joueur qu'il est en attente d'un second joueur
                socket.emit("s-information-queue", {
                  code: 99,
                  message: "En attente d'un autre joueur",
                });
              }
            });
          });
        } else {
          // on refoule un joueur voulant accéder à une partie
          socket.emit("s-information-queue", {
            code: 101,
            message: "Partie en cours, réessayer de vous connecter plus tard",
          });
        }
        //client.close();
      });
    });
  });

  /** */

  socket.on("c-action-lettre", (data) => {
    socket.to("room").emit("s-action-lettre", data);
  });

  /** */

  socket.on("c-envoi-resultat", (pseudo, mot, tirage, partie) => {
    const nbPoints = estValide(mot, tirage) ? mot.length : 0;
    let joueurA, joueurB;

    dbConnect("resultats", (db, client) => {
      db.insertOne(
        {
          socketId: socket.id,
          pseudo: pseudo,
          partie: partie,
          points: Number(nbPoints),
        },
        async (err) => {
          await db.find({ partie: partie }).toArray((err, documents) => {
            const cursor = documents.length;
            if (cursor == 2) {
              joueurA = documents[0];
              joueurB = documents[1];
              if (joueurA.points > joueurB.points) {
                io.to(joueurA.socketId).emit("s-resultat-partie", {
                  message: "Victoire !",
                  score: `${joueurA.pseudo} - ${joueurA.points} VS ${joueurB.pseudo} - ${joueurB.points}`,
                });
                io.to(joueurB.socketId).emit("s-resultat-partie", {
                  message: "Defaite !",
                  score: `${joueurA.pseudo} - ${joueurA.points} VS ${joueurB.pseudo} - ${joueurB.points}`,
                });
              }
              if (joueurA.points < joueurB.points) {
                io.to(joueurB.socketId).emit("s-resultat-partie", {
                  message: "Victoire !",
                  score: `${joueurA.pseudo} - ${joueurA.points} VS ${joueurB.pseudo} - ${joueurB.points}`,
                });
                io.to(joueurA.socketId).emit("s-resultat-partie", {
                  message: "Defaite !",
                  score: `${joueurA.pseudo} - ${joueurA.points} VS ${joueurB.pseudo} - ${joueurB.points}`,
                });
              }
              if (joueurA.points == joueurB.points) {
                io.to("room").emit("s-resultat-partie", {
                  message: "Partie nulle !",
                  score: `${joueurA.pseudo} - ${joueurA.points} VS ${joueurB.pseudo} - ${joueurB.points}`,
                });
              }
            } else return;
            client.close();
            // on vide la bdd sockets afin de permettre à d'autre joueurs de jouer
            dbConnect("sockets", async (db, client) => {
              await db.remove({});
              client.close();
            });
          });
        }
      );
    });
  });

  /** */

  socket.on("disconnect", () => {
    dbConnect("sockets", async (db, client) => {
      const joueur = await db.find({ socketId: socket.id }).count();
      if (joueur) {
        socket.to("room").emit("s-resultat-partie", {
          message: "Partie annulée !",
          score: "",
        });
        await db.remove({});
      } else return;
    });
  });

  socket.on("leave", () => {
    dbConnect("sockets", async (db, client) => {
      const joueur = await db.find({ socketId: socket.id }).count();
      if (joueur) {
        io.to("room").emit("s-resultat-partie", {
          message: "Partie annulée !",
          score: "",
        });
        await db.remove({});
      } else return;
    });
  });
});

const adress = server.listen(8081, () => {
  console.log(`Ecoute sur ${adress.address().port}`);
});
