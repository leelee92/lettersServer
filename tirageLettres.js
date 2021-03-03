const tableauLettres = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
];

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * return : ARRAY - 10 lettres randomisées
 */
module.exports = function tirageLettres() {
  const tirage = [];
  for (i = 0; i < 10; i++) {
    const randomNumber = getRandomInt(0, 25);
    tirage.push(tableauLettres[randomNumber]);
  }
  return tirage;
};
