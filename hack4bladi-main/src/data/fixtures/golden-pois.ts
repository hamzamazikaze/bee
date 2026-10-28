/**
 * The four golden demo POIs, with the coordinates the app must know locally.
 *
 * FIXTURES — not the curated dataset. The AI/Data worker's 25 researched POIs live in
 * src/data/pois.ts. These four exist so the Casablanca demo renders with Gemini, routing,
 * weather and social metadata all dead.
 *
 * media.heroImage points at /images/poi/<slug>.webp. Those files ship as art-directed
 * placeholders today; replacing one with a photograph of the same name is the entire
 * change. media.fallbackImage is the category image, and always resolves.
 */
import type { OpeningHours, POI, TimeWindow } from "@/types/poi";
import type { Weekday } from "@/types/common";
import { localizePoi } from "@/data/content";

/** Art-directed per-interest imagery, shared with the onboarding tiles. */
const CULTURE = "/images/vibes/culture.webp";
const FOOD = "/images/vibes/food.webp";

function everyDay(open: string, close: string, needsVerification = false): OpeningHours {
  const window: TimeWindow[] = [{ open, close }];
  const weekly = {} as Record<Weekday, TimeWindow[]>;
  for (let day = 0; day <= 6; day += 1) weekly[day as Weekday] = window;
  return { weekly, needsVerification };
}

export const HABOUS: POI = localizePoi({
  id: "poi-habous",
  slug: "quartier-habous",
  name: "Quartier Habous",
  localizedName: { fr: "Quartier des Habous", ar: "حي الأحباس" },
  city: "Casablanca",
  region: "Casablanca-Settat",
  coordinates: { lat: 33.57746, lng: -7.60639 },
  coordinateType: "representative",
  categories: ["culture", "food", "hidden_gems"],
  tags: ["new medina", "artisan", "arches", "olives", "bookshops"],
  openingHours: everyDay("08:00", "20:00"),
  baseDurationMinutes: 75,
  priceRange: "free",
  approxPriceMad: [0, 0],
  indoorOutdoor: "outdoor",
  walkingScore: 2,
  cultural: {
    story: {
      en: "Built in the 1930s, the Habous is a medina that was drawn on paper. French architects borrowed Fez and Marrakech arches, then laid them out on straight, shaded streets. The result is neither old city nor colonial quarter: it is Casablanca's own idea of itself.",
      fr: "Construit dans les années 1930, le quartier des Habous est une médina dessinée sur plan. Des architectes français ont emprunté les arcs de Fès et de Marrakech, puis les ont posés sur des rues droites et ombragées. Ni vieille ville ni quartier colonial : l'idée que Casablanca se fait d'elle-même.",
      ar: "بُني حي الأحباس في ثلاثينيات القرن الماضي كمدينة مرسومة على الورق. استعار المهندسون الفرنسيون أقواس فاس ومراكش ووضعوها في شوارع مستقيمة مظللة. ليس مدينة قديمة ولا حيًا استعماريًا، بل صورة الدار البيضاء عن نفسها.",
    },
    tip: {
      en: "The bookshops near the mosque open late morning. Come before 11:00 and the arcades are still quiet.",
      fr: "Les librairies près de la mosquée ouvrent en fin de matinée. Venez avant 11h, les arcades sont encore calmes.",
      ar: "تفتح المكتبات قرب المسجد في أواخر الصباح. تعال قبل الحادية عشرة لتجد الأروقة هادئة.",
    },
  },
  media: { heroImage: "/images/poi/habous.webp", fallbackImage: CULTURE },
  hero: true,
  signature: false,
  priority: 4,
  verification: "verified",
  availability: { status: "open" },
  baseRouteIds: ["route-food-local-life"],
});

export const MARCHE_CENTRAL: POI = localizePoi({
  id: "poi-marche-central",
  slug: "marche-central",
  name: "Marché Central",
  localizedName: { fr: "Marché Central", ar: "السوق المركزي" },
  city: "Casablanca",
  region: "Casablanca-Settat",
  coordinates: { lat: 33.59483, lng: -7.61201 },
  coordinateType: "exact",
  categories: ["food", "culture", "hidden_gems"],
  tags: ["seafood", "spices", "art deco", "flowers", "lunch"],
  openingHours: everyDay("07:00", "19:00"),
  baseDurationMinutes: 75,
  priceRange: "free",
  approxPriceMad: [0, 0],
  indoorOutdoor: "mixed",
  walkingScore: 2,
  cultural: {
    story: {
      en: "Behind a 1917 Art Deco gateway, the Central Market still works the way it always has: fishmongers at the back, flowers at the front, spice stalls in between. Buy your fish at a counter and the stall opposite will grill it for you.",
      fr: "Derrière un portail Art déco de 1917, le Marché Central fonctionne toujours pareil : les poissonniers au fond, les fleurs devant, les épices entre les deux. Achetez votre poisson à un étal, celui d'en face vous le grillera.",
      ar: "خلف بوابة آرت ديكو من عام 1917، ما زال السوق المركزي يعمل كما كان دائمًا: بائعو السمك في العمق، الزهور في المقدمة، والتوابل بينهما. اشترِ سمكك من طاولة، وسيشويه لك الكشك المقابل.",
    },
    tip: {
      en: "Agree the price per kilo before the fish is weighed. Grilling is usually a small extra.",
      fr: "Fixez le prix au kilo avant la pesée. La grillade coûte généralement un petit supplément.",
      ar: "اتفق على سعر الكيلو قبل الوزن. الشيّ عادة بمقابل بسيط.",
    },
  },
  media: { heroImage: "/images/poi/marche-central.webp", fallbackImage: FOOD },
  hero: true,
  signature: false,
  priority: 4,
  verification: "verified",
  availability: { status: "open" },
  baseRouteIds: ["route-food-local-life"],
});

export const SACRE_COEUR: POI = localizePoi({
  id: "poi-sacre-coeur",
  slug: "espace-sacre-coeur",
  name: "Espace Sacré-Cœur",
  localizedName: { fr: "Église du Sacré-Cœur", ar: "كنيسة القلب المقدس" },
  city: "Casablanca",
  region: "Casablanca-Settat",
  coordinates: { lat: 33.59134, lng: -7.62449 },
  coordinateType: "exact",
  categories: ["culture", "art_creative", "hidden_gems"],
  tags: ["art deco", "neo-gothic", "deconsecrated", "exhibitions", "white concrete"],
  openingHours: everyDay("10:00", "18:00", true),
  baseDurationMinutes: 60,
  priceRange: "30_60",
  approxPriceMad: [40, 60],
  indoorOutdoor: "indoor",
  walkingScore: 1,
  cultural: {
    story: {
      en: "A white neo-Gothic cathedral that has not held a mass since 1956. Deconsecrated, it became a school, then a stage, then an exhibition hall. The concrete vaults were poured, not carved: Casablanca doing Europe in its own material.",
      fr: "Une cathédrale néo-gothique blanche qui n'a plus dit la messe depuis 1956. Désacralisée, elle fut école, puis scène, puis salle d'exposition. Ses voûtes furent coulées, non sculptées : Casablanca fait l'Europe dans sa propre matière.",
      ar: "كاتدرائية بيضاء بطراز قوطي جديد لم تُقم فيها قداديس منذ 1956. بعد نزع تكريسها صارت مدرسة، ثم مسرحًا، ثم قاعة معارض. أقواسها صُبّت ولم تُنحت: الدار البيضاء تصنع أوروبا بموادها.",
    },
    tip: {
      en: "Opening hours follow the current exhibition. Check on the day before you build your afternoon around it.",
      fr: "Les horaires suivent l'exposition en cours. Vérifiez le jour même avant d'organiser votre après-midi autour.",
      ar: "تتبع أوقات الفتح المعرض الجاري. تحقق في اليوم نفسه قبل أن تبني فترة ما بعد الظهر حولها.",
    },
  },
  media: { heroImage: "/images/poi/sacre-coeur.webp", fallbackImage: CULTURE },
  hero: true,
  signature: false,
  priority: 3,
  verification: "needs_verification",
  availability: {
    status: "open",
    note: {
      en: "Access depends on the current exhibition programme.",
      fr: "L'accès dépend du programme d'expositions en cours.",
      ar: "يعتمد الدخول على برنامج المعارض الحالي.",
    },
  },
  baseRouteIds: ["route-culture-heritage", "route-hidden-gems"],
});

export const HASSAN_II: POI = localizePoi({
  id: "poi-hassan-ii",
  slug: "mosquee-hassan-ii",
  name: "Mosquée Hassan II",
  localizedName: { fr: "Mosquée Hassan II", ar: "مسجد الحسن الثاني" },
  city: "Casablanca",
  region: "Casablanca-Settat",
  coordinates: { lat: 33.60847, lng: -7.6326 },
  coordinateType: "exact",
  categories: ["culture", "coast_nature", "art_creative"],
  tags: ["atlantic", "guided visit", "zellige", "minaret", "sunset"],
  openingHours: everyDay("09:00", "17:00", true),
  baseDurationMinutes: 90,
  priceRange: "60_150",
  approxPriceMad: [140, 140],
  indoorOutdoor: "mixed",
  walkingScore: 2,
  cultural: {
    story: {
      en: "Two thirds of it stands over the Atlantic, on a platform built into the sea. Six thousand Moroccan craftsmen cut the cedar, plaster and zellige by hand. The minaret is the tallest in the world, and its laser points east toward Mecca.",
      fr: "Les deux tiers de la mosquée s'avancent sur l'Atlantique, sur une plateforme bâtie dans la mer. Six mille artisans marocains ont taillé à la main le cèdre, le plâtre et le zellige. Son minaret, le plus haut du monde, pointe un laser vers La Mecque.",
      ar: "يقوم ثلثا المسجد فوق المحيط الأطلسي على منصة شُيدت في البحر. نحت ستة آلاف حرفي مغربي الأرز والجبس والزليج يدويًا. مئذنته الأعلى في العالم، وشعاعها يشير شرقًا نحو مكة.",
    },
    tip: {
      en: "It is one of the few mosques in Morocco open to non-Muslims, but only on a guided visit. Book the 16:00 slot and you leave into the sunset.",
      fr: "C'est l'une des rares mosquées du Maroc ouvertes aux non-musulmans, uniquement en visite guidée. Réservez le créneau de 16h et vous ressortez au coucher du soleil.",
      ar: "من المساجد القليلة في المغرب المفتوحة لغير المسلمين، بزيارة مصحوبة بمرشد فقط. احجز موعد الرابعة عصرًا لتخرج مع الغروب.",
    },
  },
  media: {
    heroImage: "/images/poi/hassan-ii.webp",
    fallbackImage: CULTURE,
    heroVideo: null,
  },
  hero: true,
  signature: true,
  priority: 5,
  verification: "verified",
  availability: { status: "open" },
  baseRouteIds: ["route-culture-heritage", "route-best-of-region"],
});

/** Ordered exactly as the golden day runs. */
export const GOLDEN_POIS: POI[] = [HABOUS, MARCHE_CENTRAL, SACRE_COEUR, HASSAN_II];
