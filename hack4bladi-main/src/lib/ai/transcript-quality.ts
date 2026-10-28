/**
 * Is this transcript worth believing?
 *
 * A speech model that cannot parse its audio does not return an error or an empty string —
 * it returns fluent, grammatical, confident nonsense. That is why this exists: an empty
 * answer already falls through to the next engine, and a hallucinated one does not.
 *
 * Both failures below were observed on real Darija recordings through /test-openai:
 *
 *   "شكرا على المشاهدة. سأذهب اليوم إلى المنزل. أتمنى أن أجد شيء جيد هنا.
 *    أتمنى أن أجد شيء جيد هنا. أتمنى أن أجد شيء جيد هنا."
 *
 * "Thanks for watching" is a subtitle artifact from the training data, and the sentence
 * after it repeats three times. Neither has anything to do with what was said.
 *
 * Deliberately narrow. A false positive costs a traveller twenty seconds waiting for the
 * slower engine; being clever here would cost them a correct transcript. Only patterns
 * with no legitimate reading are listed.
 */

/**
 * Subtitle boilerplate that reaches transcripts through the training data rather than the
 * microphone. Nobody planning a day in Casablanca says any of these.
 */
const ARTIFACTS: readonly string[] = [
  "شكرا على المشاهدة",
  "شكرا للمشاهدة",
  "اشتركوا في القناة",
  "ترجمة نانسي قنقر",
  "thanks for watching",
  "thank you for watching",
  "subscribe to my channel",
  "sous-titres réalisés",
  "sous-titrage société radio",
];

function normalise(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * The same sentence three times over is a decoder stuck in a loop, not a person.
 *
 * Three rather than two: "لا لا" and "no, no" are things people say, and a traveller
 * repeating themselves for emphasis must not lose their transcript over it.
 */
function loops(text: string): boolean {
  const sentences = text
    .split(/[.!?۔،؟\n]+/)
    .map((part) => normalise(part))
    /* Two words or fewer repeats innocently — "yes yes yes", "salam salam". */
    .filter((part) => part.split(" ").length > 2);
  if (sentences.length < 3) return false;

  const counts = new Map<string, number>();
  for (const sentence of sentences) {
    const seen = (counts.get(sentence) ?? 0) + 1;
    if (seen >= 3) return true;
    counts.set(sentence, seen);
  }
  return false;
}

/**
 * Is this transcript mostly Arabic script?
 *
 * The engine used to be chosen from the interface language, which quietly assumed the two
 * agree. In Morocco they routinely do not: the app opens in French, and the traveller
 * speaks Darija into it. That sent the recording down the Whisper-first path — the one
 * measured on /test-openai as losing the city the whole day is built around.
 *
 * So a French or English session now looks at what came back. Arabic script in the answer
 * means Darija was spoken whatever the menu says, and MoulSot is worth the wait.
 *
 * Ratio rather than presence, because a Moroccan sentence is normally half French:
 * "كيدير les vlogs tout le temps" is Darija with French in it, and one Latin word must not
 * disqualify it. Punctuation, digits and spaces are ignored — only letters vote.
 */
export function isMostlyArabic(text: string): boolean {
  const letters = [...text].filter((character) => /\p{L}/u.test(character));
  if (letters.length < 4) return false;
  const arabic = letters.filter((character) => /\p{Script=Arabic}/u.test(character)).length;
  return arabic / letters.length >= 0.5;
}

/**
 * The commonest function words of the two languages the app can ask Whisper for.
 *
 * Function words, never content words: they are short, they are unavoidable, and they do
 * not depend on the subject. Any real French sentence contains several of these; a
 * transliterated Darija one contains none.
 */
const FUNCTION_WORDS: readonly (readonly string[])[] = [
  // fr
  ["je", "tu", "il", "elle", "on", "nous", "vous", "le", "la", "les", "un", "une",
    "des", "de", "du", "et", "ou", "mais", "pour", "avec", "dans", "sur", "que", "qui",
    "est", "sont", "veux", "voudrais", "aimerais", "au", "aux", "ce", "cette", "mon",
    "ma", "mes", "plus", "tres", "pas", "ne", "en", "journee", "jour"],
  // en
  ["i", "you", "we", "the", "an", "and", "or", "but", "for", "with", "in", "on", "at",
    "to", "of", "that", "this", "is", "are", "was", "want", "would", "like", "my",
    "our", "some", "not", "do", "can", "day", "food"],
  // es
  ["yo", "quiero", "quisiera", "los", "las", "una", "unos", "unas", "pero", "por",
    "para", "con", "sin", "que", "muy", "dia", "estoy", "soy", "mi", "un", "en"],
  // de
  ["ich", "wir", "der", "die", "das", "ein", "eine", "und", "oder", "aber", "fur",
    "mit", "ohne", "auf", "zu", "von", "ist", "sind", "mochte", "will", "einen",
    "nicht", "tag", "einem"],
  // it
  ["io", "vorrei", "voglio", "lo", "gli", "una", "ma", "per", "con", "senza", "che",
    "sono", "molto", "giornata", "giorno", "tranquilla"],
  // pt
  ["eu", "quero", "queria", "os", "as", "uma", "um", "uns", "com", "sem", "para",
    "por", "mas", "muito", "dia", "estou", "sou", "em"],
].map((words) => words);

/**
 * Does this read as one of the European languages the app speaks?
 *
 * Note what this deliberately does NOT take: a locale. Which language someone speaks has
 * nothing to do with which menu they picked, and every version of this that consulted the
 * interface language was wrong in the same way — the app opens in French and a Moroccan
 * speaks Darija into it, so the preference was never evidence about the audio.
 *
 * The question is asked in the only direction that has a stable answer. Transliterated
 * Darija has no agreed spelling and the engine guesses differently every run — one pass
 * returned "Salaam, biyit nimshi l Casablanca", the next "Sulaam, biët nimjiël Casablanca"
 * — so no list of Darija spellings can keep up. Function words can: "je", "une", "the",
 * "ich", "quiero" are short, unavoidable, and present in any real sentence of their
 * language, and in none of those transcripts.
 *
 * Too short to judge returns true — "carry on", never a wrong turn into a twenty-second
 * wait on no evidence.
 */
export function looksEuropean(text: string): boolean {
  const words = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z]+/)
    .filter(Boolean);

  /* Two or three words is a greeting, not a sentence, and may legitimately carry no
     function word at all: "Casablanca, aujourd'hui". */
  if (words.length < 4) return true;

  /*
   * Two hits within a single language, never one hit anywhere.
   *
   * The first version pooled all six vocabularies into one set and let a single match
   * pass, which is how "Salaam, biët nimsi el Casablanca bak nakel she haj me zayena"
   * was classified as European: `el` is Spanish, `she` is English, and neither has
   * anything to do with what was said. A pooled bag of six languages is large enough
   * that transliterated Arabic hits it by accident. Two words agreeing on one language
   * is a claim about grammar; one word is a coincidence.
   */
  const seen = new Set(words);
  return FUNCTION_WORDS.some(
    (vocabulary) => vocabulary.filter((word) => seen.has(word)).length >= 2,
  );
}

/**
 * This transcript is Arabic or Darija, whatever the interface happens to be set to.
 *
 * Either it came back in Arabic script, or it came back in Latin letters that belong to no
 * European language we speak — which in this app means a transliterated Darija sentence.
 * Both are worth the Darija engine's twenty seconds.
 */
export function needsDarijaEngine(text: string): boolean {
  return isMostlyArabic(text) || !looksEuropean(text);
}

/**
 * True when the transcript shows a model that had nothing to work with.
 *
 * Callers treat this exactly as they treat an empty answer: try the next engine.
 */
export function looksHallucinated(text: string): boolean {
  const haystack = normalise(text);
  if (!haystack) return false;
  if (ARTIFACTS.some((artifact) => haystack.includes(normalise(artifact)))) return true;
  return loops(text);
}
