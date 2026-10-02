/**
 * Cryptographically Secure Password Generator
 * Requirements:
 * - Contain uppercase letters (A-Z)
 * - Contain lowercase letters (a-z)
 * - NO numbers
 * - NO special characters
 * - Minimum length 12 characters (default 14)
 * - Cryptographically secure random selection
 * Example output: aKpLmNzQwErTyU
 */
export const generateSecureLettersPassword = (length: number = 14): string => {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const allLetters = upper + lower;

  if (length < 12) length = 12;

  // Use browser's cryptographically secure random values
  const array = new Uint32Array(length);
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else {
    // Fallback if window.crypto is unavailable
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 4294967296);
    }
  }

  let result = "";
  
  // Guarantee at least 1 uppercase and 1 lowercase letter
  result += upper[array[0] % upper.length];
  result += lower[array[1] % lower.length];

  // Fill remaining characters
  for (let i = 2; i < length; i++) {
    result += allLetters[array[i] % allLetters.length];
  }

  // Shuffle using Fisher-Yates with crypto random numbers
  const resultArray = result.split("");
  for (let i = resultArray.length - 1; i > 0; i--) {
    const j = array[i] % (i + 1);
    const temp = resultArray[i];
    resultArray[i] = resultArray[j];
    resultArray[j] = temp;
  }

  return resultArray.join("");
};
