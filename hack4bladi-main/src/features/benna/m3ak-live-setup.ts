/**
 * BENNA M3AK en direct — what the voice model is allowed to be, decided on the server.
 *
 * The setup below is sealed into the ephemeral token: the browser cannot change the
 * model, the voice, the instructions or the tool. Same rule as the text M3AK: the model
 * only fills a MealRequest through `chercher_plats`; dishes and prices come back from
 * the database, and it may only say what the tool returned.
 */
import { CONCEPTS, PREFERENCES, type MealRequest } from "./m3ak";

export const LIVE_TOOL = "chercher_plats";

export function liveSystemPrompt(): string {
  return [
    "Tu es M3AK, l'assistant vocal de BENNA (déjeuners marocains faits maison, livrés au bureau).",
    "Réponds dans la langue de la personne : darija, français ou arabe. Phrases courtes, ton chaleureux, 2 phrases au plus.",
    `Avant de citer un plat, appelle TOUJOURS l'outil ${LIVE_TOOL} avec ce que la personne veut.`,
    "Tu ne cites QUE les plats renvoyés par l'outil, avec leur prix exact. N'invente jamais un plat, un prix ou un ingrédient.",
    "Si l'outil ne renvoie rien, dis-le et propose d'élargir le budget ou d'enlever une exclusion.",
    "Tu ne passes pas commande : invite la personne à toucher le + sur la carte du plat.",
    "Allergies : rappelle de vérifier auprès de la cuisine. Tu ne parles que des repas BENNA ; pour le reste, ramène poliment au menu.",
    "Darija : bghit = je veux, bla/بلا = sans, djaj = poulet, lham = viande, hout = poisson, lkhodra = légumes,",
    "3dess = lentilles, bid = œufs, khfif = léger, l7arr = piquant, lghda = déjeuner.",
  ].join("\n");
}

/** Gemini schema for MealRequest — same closed vocabulary as the text extractor. */
const conceptList = { type: "ARRAY", items: { type: "STRING", enum: [...CONCEPTS] } };

export const LIVE_TOOL_DECLARATION = {
  name: LIVE_TOOL,
  description: "Cherche dans le menu du jour les plats qui correspondent à la demande. Seule source des plats et des prix.",
  parameters: {
    type: "OBJECT",
    properties: {
      budgetMad: { type: "INTEGER", description: "Budget maximum en dirhams, si la personne en donne un." },
      wants: { ...conceptList, description: "Ce que la personne veut manger." },
      excludes: { ...conceptList, description: "Ce que la personne refuse." },
      preferences: { type: "ARRAY", items: { type: "STRING", enum: [...PREFERENCES] } },
    },
  },
};

/** Tool arguments → MealRequest, tolerant of omitted fields (the model skips empty ones). */
export function requestFromToolArgs(args: unknown): unknown {
  const a = (args ?? {}) as Partial<Record<keyof MealRequest, unknown>>;
  return {
    budgetMad: typeof a.budgetMad === "number" ? Math.round(a.budgetMad) : null,
    wants: Array.isArray(a.wants) ? a.wants : [],
    excludes: Array.isArray(a.excludes) ? a.excludes : [],
    meal: null,
    preferences: Array.isArray(a.preferences) ? a.preferences : [],
  };
}
