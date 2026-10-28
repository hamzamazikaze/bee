/**
 * BENNA pilot data — DEMO VALUES ONLY. Prices follow the brief's illustrative hypothesis
 * (≈50 MAD alone vs ≈30–35 MAD in a group) and must be validated with real kitchens.
 * Workplaces, kitchens and colleagues are placeholders for the pitch.
 */

export type MealSlot = "lunch" | "healthy";
export type Tag = "fait-maison" | "healthy" | "nouveau" | "populaire";
export type City = "casablanca" | "rabat" | "marrakech";

/** The allergens a kitchen declares per dish (a subset of the EU 14 that this menu uses). */
export const ALLERGENS = ["gluten", "lait", "oeufs", "fruits-a-coque", "poisson", "sesame"] as const;
export type Allergen = (typeof ALLERGENS)[number];
export const ALLERGEN_LABEL: Record<Allergen, string> = {
  gluten: "gluten",
  lait: "lait",
  oeufs: "œufs",
  "fruits-a-coque": "fruits à coque",
  poisson: "poisson",
  sesame: "sésame",
};

export type Workplace = {
  id: string;
  name: string;
  area: string;
  pickup: string;
  /** Colleagues already on BENNA at this address. */
  members: number;
  /** Invite code a colleague can share. */
  code: string;
  city: City;
};

export type Kitchen = {
  id: string;
  name: string;
  blurb: string;
  district: string;
  city: City;
  tag: Tag;
  cover: string;
};

export type Dish = {
  id: string;
  name: string;
  description: string;
  slot: MealSlot;
  kitchenId: string;
  /** MAD, through the group order. */
  groupPrice: number;
  /** MAD, comparable individual purchase — the struck-through price. */
  soloPrice: number;
  tag?: Tag;
  /** As declared by the kitchen. Matching excludes on these; the app never claims more. */
  ingredients: string[];
  allergens: Allergen[];
  /** public/images/benna/<id>.webp — a zellige tile shows if it is missing. */
  image: string;
};

export type ParticipantStatus = "host" | "confirmed" | "browsing" | "invited";

export type Participant = {
  id: string;
  name: string;
  initials: string;
  /** public/images/people/<id>.webp — AI-generated portraits of fictional colleagues (demo). */
  photo?: string;
  status: ParticipantStatus;
  items: number;
};

export const WORKPLACES: Workplace[] = [
  { id: "casanearshore-2b", name: "Casanearshore · Bâtiment 2B", area: "Sidi Maârouf, Casablanca", pickup: "Hall d'accueil, rez-de-chaussée", members: 23, code: "CASA2B", city: "casablanca" },
  { id: "technopark", name: "Technopark Casablanca", area: "Route de Nouaceur, Casablanca", pickup: "Cafétéria, 1er étage", members: 41, code: "TECHNO", city: "casablanca" },
  { id: "marina-bc", name: "Marina Business Center", area: "Boulevard des Almohades, Casablanca", pickup: "Accueil tour B", members: 17, code: "MARINA", city: "casablanca" },
  { id: "technopolis-b3", name: "Technopolis · Bâtiment B3", area: "Sala Al Jadida, Rabat-Salé", pickup: "Accueil bâtiment B3", members: 29, code: "RABAT3", city: "rabat" },
  { id: "hay-riad", name: "Hay Riad · Plateau Mahaj", area: "Hay Riad, Rabat", pickup: "Réception, rez-de-chaussée", members: 14, code: "RIAD14", city: "rabat" },
  { id: "gueliz-affaires", name: "Guéliz · Centre d'affaires", area: "Guéliz, Marrakech", pickup: "Lobby, accueil", members: 19, code: "GUELIZ", city: "marrakech" },
];

export const KITCHENS: Kitchen[] = [
  { id: "lalla-khadija", name: "Cuisine Lalla Khadija", blurb: "Tajines mijotés et plats du jour, comme à la maison.", district: "Maârif", city: "casablanca", tag: "fait-maison", cover: "/images/benna/tajine-poulet-citron.webp" },
  { id: "dar-zineb", name: "Dar Zineb", blurb: "Couscous du vendredi, rfissa et harira maison.", district: "Hay Hassani", city: "casablanca", tag: "populaire", cover: "/images/benna/couscous-7-legumes.webp" },
  { id: "khodra", name: "Khodra Kitchen", blurb: "Assiettes légères, légumes du marché, bowls.", district: "Gauthier", city: "casablanca", tag: "healthy", cover: "/images/benna/zaalouk-taktouka.webp" },
  { id: "dar-bahia", name: "Dar Bahia", blurb: "Seffa, tajine aux pruneaux et légumineuses du marché.", district: "Agdal", city: "rabat", tag: "fait-maison", cover: "/images/benna/tajine-agneau-pruneaux.webp" },
  { id: "lalla-mina", name: "Cuisine Lalla Mina", blurb: "Pastilla, couscous tfaya et salades fraîches.", district: "Hassan", city: "rabat", tag: "populaire", cover: "/images/benna/pastilla-poulet.webp" },
  { id: "dar-tanjia", name: "Dar Tanjia", blurb: "Tanjia cuite au four du hammam, poisson à la chermoula.", district: "Mouassine", city: "marrakech", tag: "populaire", cover: "/images/benna/tanjia-marrakchia.webp" },
  { id: "ftour-gueliz", name: "Cuisine Guéliz", blurb: "Bowls de légumineuses et harira marrakchia.", district: "Guéliz", city: "marrakech", tag: "healthy", cover: "/images/benna/harira-marrakchia.webp" },
];

const img = (id: string) => `/images/benna/${id}.webp`;

type DishSeed = Omit<Dish, "image">;
const dish = (entry: DishSeed): Dish => ({ ...entry, image: img(entry.id) });

export const DISHES: Dish[] = [
  // Casablanca · Cuisine Lalla Khadija
  dish({ id: "tajine-poulet-citron", name: "Tajine poulet, citron & olives", description: "Poulet fermier, citron confit, olives violettes, pain maison.", slot: "lunch", kitchenId: "lalla-khadija", groupPrice: 34, soloPrice: 50, tag: "populaire", ingredients: ["poulet", "citron confit", "olives", "oignons", "pain"], allergens: ["gluten"] }),
  dish({ id: "tajine-kefta", name: "Tajine kefta aux œufs", description: "Boulettes épicées, sauce tomate, œufs, pain maison.", slot: "lunch", kitchenId: "lalla-khadija", groupPrice: 32, soloPrice: 45, ingredients: ["kefta de bœuf", "sauce tomate", "oeufs", "pain"], allergens: ["gluten", "oeufs"] }),
  dish({ id: "adass", name: "Adass, lentilles mijotées", description: "Lentilles au cumin et à l'huile d'olive, pain complet.", slot: "lunch", kitchenId: "lalla-khadija", groupPrice: 22, soloPrice: 32, ingredients: ["lentilles", "cumin", "huile d'olive", "pain complet"], allergens: ["gluten"] }),
  dish({ id: "tajine-sardines", name: "Tajine de kefta de sardines", description: "Boulettes de sardines à la chermoula, sauce tomate, pommes de terre.", slot: "lunch", kitchenId: "lalla-khadija", groupPrice: 30, soloPrice: 44, tag: "nouveau", ingredients: ["sardines", "chermoula", "sauce tomate", "pommes de terre", "pain"], allergens: ["poisson", "gluten"] }),

  // Casablanca · Dar Zineb
  dish({ id: "couscous-7-legumes", name: "Couscous aux sept légumes", description: "Semoule roulée main, légumes de saison, bouillon parfumé.", slot: "lunch", kitchenId: "dar-zineb", groupPrice: 35, soloPrice: 50, tag: "fait-maison", ingredients: ["semoule", "carottes", "courgettes", "potiron", "navets", "pois chiches", "bouillon"], allergens: ["gluten"] }),
  dish({ id: "rfissa", name: "Rfissa au poulet", description: "Msemen effiloché, lentilles, fenugrec, ras el hanout.", slot: "lunch", kitchenId: "dar-zineb", groupPrice: 38, soloPrice: 55, tag: "nouveau", ingredients: ["poulet", "msemen", "lentilles", "fenugrec", "ras el hanout"], allergens: ["gluten"] }),
  dish({ id: "harira-dattes", name: "Harira & dattes", description: "Bol de harira maison, dattes, chebakia le vendredi.", slot: "lunch", kitchenId: "dar-zineb", groupPrice: 18, soloPrice: 26, ingredients: ["harira", "tomates", "lentilles", "pois chiches", "vermicelles", "dattes"], allergens: ["gluten", "sesame"] }),

  // Casablanca · Khodra Kitchen
  dish({ id: "zaalouk-taktouka", name: "Assiette zaalouk & taktouka", description: "Aubergines et poivrons grillés, pois chiches, pain complet.", slot: "lunch", kitchenId: "khodra", groupPrice: 28, soloPrice: 40, tag: "healthy", ingredients: ["aubergines", "poivrons", "tomates", "pois chiches", "pain complet"], allergens: ["gluten"] }),
  dish({ id: "bowl-poulet-chermoula", name: "Bowl poulet chermoula", description: "Poulet grillé à la chermoula, boulgour, légumes vapeur.", slot: "lunch", kitchenId: "khodra", groupPrice: 32, soloPrice: 45, tag: "healthy", ingredients: ["poulet", "chermoula", "boulgour", "légumes vapeur"], allergens: ["gluten"] }),
  dish({ id: "tajine-legumes", name: "Tajine de légumes & olives", description: "Courgettes, carottes, pommes de terre, petits pois et olives, sans viande.", slot: "lunch", kitchenId: "khodra", groupPrice: 26, soloPrice: 38, tag: "healthy", ingredients: ["courgettes", "carottes", "pommes de terre", "petits pois", "olives", "pain complet"], allergens: ["gluten"] }),

  // Rabat · Dar Bahia
  dish({ id: "seffa-poulet", name: "Seffa medfouna au poulet", description: "Vermicelles vapeur, poulet aux oignons, cannelle et amandes.", slot: "lunch", kitchenId: "dar-bahia", groupPrice: 36, soloPrice: 52, tag: "nouveau", ingredients: ["vermicelles", "poulet", "oignons", "cannelle", "amandes", "sucre glace"], allergens: ["gluten", "fruits-a-coque"] }),
  dish({ id: "tajine-agneau-pruneaux", name: "Tajine d'agneau aux pruneaux", description: "Agneau fondant, pruneaux, amandes grillées et sésame.", slot: "lunch", kitchenId: "dar-bahia", groupPrice: 42, soloPrice: 60, tag: "populaire", ingredients: ["agneau", "pruneaux", "amandes", "sésame", "pain"], allergens: ["gluten", "fruits-a-coque", "sesame"] }),
  dish({ id: "loubia", name: "Loubia, haricots blancs", description: "Haricots blancs à la tomate et au cumin, pain maison.", slot: "lunch", kitchenId: "dar-bahia", groupPrice: 20, soloPrice: 30, ingredients: ["haricots blancs", "sauce tomate", "cumin", "pain"], allergens: ["gluten"] }),
  dish({ id: "bissara", name: "Bissara & huile d'olive", description: "Purée de fèves au cumin, filet d'huile d'olive, pain.", slot: "lunch", kitchenId: "dar-bahia", groupPrice: 15, soloPrice: 22, tag: "healthy", ingredients: ["fèves", "huile d'olive", "cumin", "ail", "pain"], allergens: ["gluten"] }),

  // Rabat · Cuisine Lalla Mina
  dish({ id: "pastilla-poulet", name: "Pastilla au poulet", description: "Feuilles croustillantes, poulet aux épices, amandes et cannelle.", slot: "lunch", kitchenId: "lalla-mina", groupPrice: 40, soloPrice: 58, tag: "fait-maison", ingredients: ["feuilles de brick", "poulet", "oeufs", "amandes", "cannelle"], allergens: ["gluten", "oeufs", "fruits-a-coque"] }),
  dish({ id: "couscous-tfaya", name: "Couscous tfaya au poulet", description: "Couscous du vendredi, poulet, tfaya d'oignons caramélisés et raisins secs.", slot: "lunch", kitchenId: "lalla-mina", groupPrice: 38, soloPrice: 55, tag: "populaire", ingredients: ["semoule", "poulet", "oignons caramélisés", "raisins secs", "pois chiches", "amandes"], allergens: ["gluten", "fruits-a-coque"] }),
  dish({ id: "salade-thon", name: "Salade marocaine au thon", description: "Tomates, concombre, poivrons, thon, œuf dur, olives.", slot: "lunch", kitchenId: "lalla-mina", groupPrice: 26, soloPrice: 38, tag: "healthy", ingredients: ["tomates", "concombre", "poivrons", "thon", "oeuf", "olives"], allergens: ["poisson", "oeufs"] }),

  // Marrakech · Dar Tanjia
  dish({ id: "tanjia-marrakchia", name: "Tanjia marrakchia", description: "Bœuf confit au citron, cumin et smen, cuit lentement.", slot: "lunch", kitchenId: "dar-tanjia", groupPrice: 45, soloPrice: 65, tag: "populaire", ingredients: ["bœuf", "citron confit", "cumin", "smen", "ail", "pain"], allergens: ["gluten", "lait"] }),
  dish({ id: "tajine-hout-chermoula", name: "Tajine de poisson à la chermoula", description: "Poisson blanc, chermoula, poivrons et pommes de terre.", slot: "lunch", kitchenId: "dar-tanjia", groupPrice: 40, soloPrice: 58, tag: "nouveau", ingredients: ["poisson blanc", "chermoula", "poivrons", "tomates", "pommes de terre", "pain"], allergens: ["poisson", "gluten"] }),

  // Marrakech · Cuisine Guéliz
  dish({ id: "bowl-lentilles-legumes", name: "Bowl lentilles & légumes rôtis", description: "Lentilles vertes, légumes rôtis, herbes fraîches, citron.", slot: "lunch", kitchenId: "ftour-gueliz", groupPrice: 28, soloPrice: 40, tag: "healthy", ingredients: ["lentilles", "carottes", "courgettes", "poivrons", "herbes fraîches", "citron"], allergens: [] }),
  dish({ id: "harira-marrakchia", name: "Harira marrakchia & chebakia", description: "Harira épaisse aux lentilles et pois chiches, chebakia au miel.", slot: "lunch", kitchenId: "ftour-gueliz", groupPrice: 18, soloPrice: 26, ingredients: ["harira", "lentilles", "pois chiches", "tomates", "chebakia", "miel"], allergens: ["gluten", "sesame"] }),
];

/**
 * The weekly rotation, Monday (1) to Friday (5). BENNA is lunch only; Friday is
 * couscous day. Each kitchen only delivers its own city, so a workplace sees its city's share.
 */
const LUNCH_WEEK: Record<1 | 2 | 3 | 4 | 5, string[]> = {
  1: ["tajine-poulet-citron", "adass", "zaalouk-taktouka", "bowl-poulet-chermoula", "harira-dattes", "tajine-agneau-pruneaux", "loubia", "salade-thon", "bissara", "tanjia-marrakchia", "bowl-lentilles-legumes", "harira-marrakchia"],
  2: ["tajine-kefta", "tajine-sardines", "harira-dattes", "tajine-legumes", "bowl-poulet-chermoula", "seffa-poulet", "loubia", "bissara", "salade-thon", "tajine-hout-chermoula", "bowl-lentilles-legumes", "harira-marrakchia"],
  3: ["tajine-poulet-citron", "rfissa", "adass", "zaalouk-taktouka", "tajine-legumes", "harira-dattes", "pastilla-poulet", "tajine-agneau-pruneaux", "bissara", "salade-thon", "tanjia-marrakchia", "tajine-hout-chermoula", "bowl-lentilles-legumes"],
  4: ["tajine-kefta", "rfissa", "tajine-sardines", "zaalouk-taktouka", "bowl-poulet-chermoula", "seffa-poulet", "pastilla-poulet", "loubia", "tanjia-marrakchia", "bowl-lentilles-legumes", "harira-marrakchia"],
  5: ["couscous-7-legumes", "harira-dattes", "zaalouk-taktouka", "tajine-legumes", "tajine-poulet-citron", "couscous-tfaya", "bissara", "salade-thon", "tanjia-marrakchia", "tajine-hout-chermoula", "bowl-lentilles-legumes"],
};

/** ISO weekday 1–7 → the rotation day served. Demo: weekends serve Monday so a weekend pitch has food. */
export const servedWeekday = (isoWeekday: number): 1 | 2 | 3 | 4 | 5 =>
  (isoWeekday >= 1 && isoWeekday <= 5 ? isoWeekday : 1) as 1 | 2 | 3 | 4 | 5;

export function menuIdsFor(isoWeekday: number): string[] {
  return LUNCH_WEEK[servedWeekday(isoWeekday)];
}

/** Casablanca's ISO weekday today (1 = Monday). */
export function casablancaWeekday(now = new Date()): number {
  const day = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "Africa/Casablanca" }).format(now);
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(day) + 1;
}

/** Today's dishes for a workplace: its city's kitchens, today's rotation. */
export function todaysDishes(workplace: Workplace | undefined, now = new Date()): Dish[] {
  const ids = new Set(menuIdsFor(casablancaWeekday(now)));
  const city = workplace?.city ?? "casablanca";
  return DISHES.filter((entry) => ids.has(entry.id) && kitchenById(entry.kitchenId)?.city === city);
}

/** The workplace's lunch group today. The host opened it; colleagues join with the link. */
export const GROUP = {
  name: "Déjeuner du jour",
  host: "Salma",
  delivery: "12:30",
  /** Minutes until cutoff when the demo starts — keeps the countdown alive on stage. */
  cutoffInMinutes: 47,
  capacity: 20,
};

export const PARTICIPANTS: Participant[] = [
  { id: "salma", name: "Salma B.", initials: "SB", photo: "/images/people/salma.webp", status: "host", items: 1 },
  { id: "youssef", name: "Youssef A.", initials: "YA", photo: "/images/people/youssef.webp", status: "confirmed", items: 2 },
  { id: "imane", name: "Imane K.", initials: "IK", photo: "/images/people/imane.webp", status: "confirmed", items: 1 },
  { id: "hamza", name: "Hamza E.", initials: "HE", photo: "/images/people/hamza.webp", status: "confirmed", items: 1 },
  { id: "khadija", name: "Khadija M.", initials: "KM", photo: "/images/people/khadija.webp", status: "confirmed", items: 3 },
  { id: "omar", name: "Omar T.", initials: "OT", photo: "/images/people/omar.webp", status: "confirmed", items: 1 },
  { id: "nadia", name: "Nadia R.", initials: "NR", photo: "/images/people/nadia.webp", status: "confirmed", items: 1 },
  { id: "mehdi", name: "Mehdi L.", initials: "ML", photo: "/images/people/mehdi.webp", status: "browsing", items: 1 },
  { id: "sara", name: "Sara Z.", initials: "SZ", photo: "/images/people/sara.webp", status: "confirmed", items: 2 },
  { id: "anas", name: "Anas F.", initials: "AF", photo: "/images/people/anas.webp", status: "invited", items: 0 },
];

export type OptionGroup = {
  id: string;
  label: string;
  /** "single" = radio (exactly one), "multi" = checkboxes (up to `max`). */
  kind: "single" | "multi";
  max?: number;
  choices: { id: string; label: string; extra?: number }[];
};

export const OPTION_GROUPS: Record<MealSlot, OptionGroup[]> = {
  lunch: [
    { id: "portion", label: "Portion", kind: "single", choices: [{ id: "normale", label: "Normale" }, { id: "grande", label: "Grande", extra: 8 }] },
    { id: "pain", label: "Accompagnement", kind: "single", choices: [{ id: "pain-maison", label: "Pain maison" }, { id: "pain-complet", label: "Pain complet" }, { id: "sans-pain", label: "Sans pain" }] },
    { id: "pref", label: "Préférences", kind: "multi", max: 2, choices: [{ id: "sans-piment", label: "Sans piment" }, { id: "sauce-a-part", label: "Sauce à part" }, { id: "sans-coriandre", label: "Sans coriandre" }] },
  ],
  healthy: [
    { id: "portion", label: "Portion", kind: "single", choices: [{ id: "normale", label: "Normale" }, { id: "grande", label: "Grande", extra: 8 }] },
    { id: "pref", label: "Préférences", kind: "multi", max: 2, choices: [{ id: "sans-piment", label: "Sans piment" }, { id: "sauce-a-part", label: "Sauce à part" }] },
  ],
};

/** Default choice per single-choice group — what a quick "+" from the menu orders. */
export function defaultOptions(dish: Dish): string[] {
  return OPTION_GROUPS[dish.slot].filter((group) => group.kind === "single").map((group) => group.choices[0].id);
}

export function optionExtra(dish: Dish, options: string[]): number {
  return OPTION_GROUPS[dish.slot]
    .flatMap((group) => group.choices)
    .filter((choice) => options.includes(choice.id))
    .reduce((sum, choice) => sum + (choice.extra ?? 0), 0);
}

export function optionLabels(dish: Dish, options: string[]): string[] {
  const defaults = defaultOptions(dish);
  return OPTION_GROUPS[dish.slot]
    .flatMap((group) => group.choices)
    .filter((choice) => options.includes(choice.id) && !defaults.includes(choice.id))
    .map((choice) => choice.label);
}

/** What each colleague put in the group order (demo). */
export const PARTICIPANT_DISHES: Record<string, string[]> = {
  salma: ["couscous-7-legumes"],
  youssef: ["tajine-poulet-citron", "harira-dattes"],
  imane: ["bowl-poulet-chermoula"],
  hamza: ["tajine-kefta"],
  khadija: ["rfissa", "adass", "harira-dattes"],
  omar: ["couscous-7-legumes"],
  nadia: ["zaalouk-taktouka"],
  mehdi: ["tajine-poulet-citron"],
  sara: ["rfissa", "harira-dattes"],
  anas: [],
};

/** The shared delivery, as the traveller follows it. */
export const ORDER_STEPS = [
  { label: "Commande confirmée", detail: "Votre plat rejoint la commande du groupe." },
  { label: "Groupe clôturé", detail: "Toutes les commandes du bâtiment partent ensemble." },
  { label: "En préparation", detail: "Les cuisines partenaires préparent sur commande." },
  { label: "En livraison", detail: "Un seul trajet pour tout le groupe." },
  { label: "Arrivée au point de retrait", detail: "Récupérez votre sac à votre nom." },
];

export const PAYMENT_LABEL = { card: "Carte bancaire (simulé)", cash: "Espèces au retrait" } as const;

export const TAG_LABEL: Record<Tag, string> = {
  "fait-maison": "Fait maison",
  healthy: "Healthy",
  nouveau: "Nouveau",
  populaire: "Populaire",
};

export const dishById = (id: string) => DISHES.find((dish) => dish.id === id);
export const kitchenById = (id: string) => KITCHENS.find((kitchen) => kitchen.id === id);
export const workplaceById = (id: string | null) => WORKPLACES.find((place) => place.id === id);

export const formatMad = (value: number) => `${value} DH`;
