type LetterType = '🟨' | '🟩' | '⬛';

interface GameCardRow {
  letters: LetterType[];
}

interface GameCard {
  rows: GameCardRow[];
}

function scoreWordle(gameCard: GameCard): number { 
  const correctValue = 1; // best score is 5
  const correctPositionValue = 2; 
  const wrongValue = 3;

  let score = 0;
  for (let row of gameCard.rows) {
    for (let letter of row.letters) {
      if (letter === '🟨') {
        score += correctValue;
      } else if (letter === '🟩') {
        score += correctPositionValue;
      } else {
        score += wrongValue;
      }
    }
  }

  return score;
}