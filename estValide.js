const dictionnaire = require("./data/dictionnaireformate.json");

//const tirage = ["I", "E", "A", "Y", "C", "Z", "U", "L", "Z", "I"];

/**
 * @param {string} word
 * return TRUE si la réponse est valide et FALSE si la réponse est erronnée.
 */
module.exports = function estValide(mot, tirage) {
  let valide = true;
  const tableauLettresMot = mot.split("");
  if (dictionnaire[mot] != undefined) {
    tableauLettresMot.forEach((lettreMot) => {
      const resultat = tirage.includes(lettreMot.toUpperCase());
      if (resultat == false) {
        valide = false;
      }
    });
  } else valide = false;
  console.log(valide);
  return valide;
};
