/**
 * The invite writer: prompt and template fallback. (Meal requests moved to ./m3ak.)
 */
import { GROUP, type Dish, type Workplace } from "./data";

export type InviteLanguage = "fr" | "darija" | "ar";

/* ---------- Prompts ---------- */

const LANGUAGE_BRIEF: Record<InviteLanguage, string> = {
  fr: "en français",
  darija:
    "en darija marocaine (PAS en français) écrite en lettres latines, comme sur WhatsApp. Exemple de ton : « Salam l'équipe 👋 ana kan commandi l'ghda f BENNA, livraison m3a 12:30 f l'hall. Chkoun bgha m3aya ? »",
  ar: "en arabe, en lettres arabes, ton simple et amical",
};

export function invitePrompt(language: InviteLanguage, workplace: Workplace, dishes: Dish[]): string {
  return [
    `Écris un message WhatsApp ${LANGUAGE_BRIEF[language]}, 3 lignes maximum, pour inviter des collègues`,
    "à rejoindre la commande groupée du déjeuner sur BENNA (plats marocains faits maison).",
    `Hôte : ${GROUP.host}. Lieu : ${workplace.name}. Retrait : ${workplace.pickup}. Livraison : ${GROUP.delivery}.`,
    `Plats du jour à citer (2 maximum) : ${dishes.map((dish) => dish.name).join(", ")}.`,
    "Recopie tels quels l'heure, le lieu et le point de retrait, sans les abréger.",
    "Termine par le texte exact {LINK} sur sa propre ligne. Pas de hashtag, un emoji au plus.",
    'Réponds en JSON : {"message":"…"}',
  ].join("\n");
}

/* ---------- Invite templates (fallback) ---------- */

export function inviteTemplate(language: InviteLanguage, workplace: Workplace, dishes: Dish[]): string {
  const names = dishes.slice(0, 2).map((dish) => dish.name).join(" et ");
  if (language === "darija") {
    return `Salam l'équipe 👋 kan commandiw l'ghda f BENNA, livraison ${GROUP.delivery} f ${workplace.pickup}.\nLyoum kayn ${names}.\n{LINK}`;
  }
  if (language === "ar") {
    return `السلام عليكم 👋 كنطلبو الغدا جماعة فـ BENNA، التوصيل على ${GROUP.delivery} فـ ${workplace.pickup}.\nاليوم كاين ${names}.\n{LINK}`;
  }
  return `Bonjour l'équipe 👋 Je lance la commande du déjeuner sur BENNA, livraison à ${GROUP.delivery} (${workplace.pickup}).\nAu menu : ${names}.\n{LINK}`;
}
