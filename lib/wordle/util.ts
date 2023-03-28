export type WordleGame = {
  tries: number,
  number: number,
  guesses: {
    black: number,
    yellow: number,
    green: number,
  }
  message: string,
  score: number,
}

export function isValidWordleMessage(message: string): boolean {
  const lines = message.split("\n");
  console.log(lines);
  // Check that the message has at least 3 lines (header + guess feedback + one score row)
  if (lines.length <= 2) {
    return false;
  }
  console.log(1);
  // Check that the first line has the expected format
  const headerRegex = /^Wordle \d+ \d+\/\d+$/;
  if (!headerRegex.test(lines[0])) {
    return false;
  }
  console.log(2);
  // Check that there is a blank line after the first line
  if (lines[1].trim() !== "") {
    return false;
  }
  console.log(3);
  // Check that there are between 1 and 6 guess score rows
  const guessScoreRows = lines.slice(2);
  if (guessScoreRows.length < 1 || guessScoreRows.length > 6) {
    return false;
  }
  console.log(4);
  
  // Check that each guess feedback row has exactly 5 emoji squares of the expected colors
  const regex = /\p{Extended_Pictographic}/gu
  for (const row of guessScoreRows) {
    const matches = row.match(regex);
    if (!matches || matches.length != 5
        || !(matches.every((char) => char == '🟩' || char == '🟨' || char == '⬛' ))) {
      return false;
    }
  }
  console.log(5);
  // If all checks pass, the message is well-formed
  return true;
}

const wordleScore: { [key: string]: number } = {
  "🟩": 1,
  "🟨": 2,
  "⬛": 3,
};

export function parseWordleMessage(message: string): WordleGame {
  const lines = message.split('\n');
  const tries = lines.length - 2;
  const number = Number(lines[0].split(' ')[1]);

  // cannot use FP techniques because for..of is the only iteration
  // method that supports emojis
  const acc = [0, 0, 0, 0];
  for (let line of lines.slice(2)) {
    for (let char of line) {
      switch (char) {
        case '⬛':
          acc[0]++;
          acc[3] += wordleScore['⬛'];
          break;
        case '🟨':
          acc[1]++;
          acc[3] += wordleScore['🟨'];
          break;
        case '🟩':
          acc[2]++;
          acc[3] += wordleScore['🟩'];
          break;
      }
    }
  }
  
  const [black, yellow, green, score] = acc;
  return {
    tries,
    number,
    guesses: {
      black,
      yellow,
      green,
    },
    message,
    score
  };
}
