const wordleScore: { [key: string]: number } = {
  "🟩": 1,
  "🟨": 2,
  "⬛": 3,
};

export function getWordleScore(message: any): number {
  let score = 0;
  for (let char of message) {
    score += wordleScore[char] || 0;
  }
  return score;
}

export function getWordleNumber(str: string): number | undefined {
  const match = str.match(/\d+/);

  if (match) {
    return parseInt(match[0], 10);
  }

  return undefined;
}
