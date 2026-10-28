/**
 * The five curated day templates.
 *
 * These are foundations, not itineraries. The trip engine personalises from them and
 * must never return one raw — a template has 4-5 POI ids, a trip always has exactly
 * TRIP_STOP_COUNT stops chosen for one profile.
 */
import type { BaseRoute } from "@/types/trip";

export const BASE_ROUTES: BaseRoute[] = [
  /**
   * The experience day: SEE → MEET → MAKE → TASTE.
   *
   * The one curated route that demonstrates what Khotwa is actually for. It deliberately
   * does NOT declare "culture", so it cannot displace the signature Casablanca day for a
   * culture+food traveller — that day is the Less Walking demo and stays exactly as it
   * was. This one belongs to the food / hidden-gems / craft traveller, which is the
   * "Local Food Trail" card on Home.
   *
   * The engine still owns ordering: the narrative pass may put the mosque at either end
   * depending on the light, and that is allowed.
   */
  {
    id: "route-casablanca-experience",
    slug: "casablanca-experience",
    title: {
      en: "Meet the people who make Casablanca",
      fr: "Rencontrez ceux qui font Casablanca",
      ar: "التقِ بمن يصنعون الدار البيضاء",
      es: "Conoce a quienes hacen Casablanca",
      de: "Die Menschen, die Casablanca machen",
      it: "Incontra chi fa Casablanca",
      pt: "Conhece quem faz Casablanca",
    },
    subtitle: {
      en: "One icon, one neighbourhood, one craft in your hands and one meal you cooked.",
      fr: "Une icône, un quartier, un savoir-faire entre vos mains et un repas que vous avez cuisiné.",
      ar: "معلمة واحدة، حي واحد، حرفة بين يديك، ووجبة طبختها بنفسك.",
      es: "Un icono, un barrio, un oficio en tus manos y una comida que has cocinado.",
      de: "Ein Wahrzeichen, ein Viertel, ein Handwerk in deinen Händen und ein Essen, das du gekocht hast.",
      it: "Un'icona, un quartiere, un mestiere nelle tue mani e un pasto cucinato da te.",
      pt: "Um ícone, um bairro, um ofício nas tuas mãos e uma refeição feita por ti.",
    },
    city: "Casablanca",
    interests: ["food", "hidden_gems", "art_creative"],
    poiIds: ["poi-hassan-ii", "exp-habous-artisans", "exp-leather-bag", "exp-cooking-mi-naima"],
    heroImage: "/images/poi/hassan-ii.webp",
  },
  /**
   * The signature Casablanca day, exactly as SIYAHA_APP_MASTER_QA.md §15 defines the
   * controlled demo route. It is curated, not invented: the specification names these
   * four stops and their metrics, and non-negotiable #6 requires the product to produce
   * them. The engine still owns ordering, durations and transport — this only seeds
   * which four places a Casablanca culture/food day is built from.
   */
  {
    id: "route-casablanca-signature",
    slug: "casablanca-signature",
    title: {
      en: "Casablanca, in a day",
      fr: "Casablanca, en une journée",
      ar: "الدار البيضاء في يوم",
      es: "Casablanca en un día",
      de: "Casablanca an einem Tag",
      it: "Casablanca in un giorno",
      pt: "Casablanca num dia",
    },
    subtitle: {
      en: "Artisan arches, the market at noon, a white cathedral and the Atlantic.",
      fr: "Les arcades des artisans, le marché à midi, une cathédrale blanche et l'Atlantique.",
      ar: "أقواس الحرفيين، السوق عند الظهيرة، كاتدرائية بيضاء والمحيط.",
      es: "Arcos de artesanos, el mercado a mediodía, una catedral blanca y el Atlántico.",
      de: "Handwerkerbögen, der Markt am Mittag, eine weiße Kathedrale und der Atlantik.",
      it: "Archi degli artigiani, il mercato a mezzogiorno, una cattedrale bianca e l'Atlantico.",
      pt: "Arcos dos artesãos, o mercado ao meio-dia, uma catedral branca e o Atlântico.",
    },
    city: "Casablanca",
    interests: ["culture", "food", "art_creative"],
    poiIds: ["poi-habous", "poi-marche-central", "poi-sacre-coeur", "poi-hassan-ii"],
    heroImage: "/images/poi/hassan-ii.webp",
  },
  {
    id: "route-culture-heritage",
    slug: "culture-heritage",
    title: {
      en: "Culture & Heritage",
      fr: "Culture et patrimoine",
      ar: "الثقافة والتراث",
      es: "Cultura y patrimonio",
      de: "Kultur & Erbe",
      it: "Cultura e patrimonio",
      pt: "Cultura e património",
    },
    subtitle: {
      en: "The mosque, the old medina and the city the French drew on paper.",
      fr: "La mosquée, l'ancienne médina et la ville que les Français ont dessinée sur plan.",
      ar: "المسجد والمدينة القديمة والمدينة التي رسمها الفرنسيون على الورق.",
      es: "La mezquita, la medina vieja y la ciudad que los franceses dibujaron sobre plano.",
      de: "Die Moschee, die alte Medina und die Stadt, die die Franzosen aufs Papier zeichneten.",
      it: "La moschea, la medina vecchia e la città che i francesi disegnarono a tavolino.",
      pt: "A mesquita, a medina velha e a cidade que os franceses desenharam em papel.",
    },
    city: "Casablanca",
    interests: ["culture", "art_creative", "hidden_gems"],
    poiIds: [
      "poi-ancienne-medina",
      "poi-boulevard-mohammed-v",
      "poi-place-mohammed-v",
      "poi-sacre-coeur",
      "poi-hassan-ii",
    ],
    heroImage: "/images/poi/hassan-ii.jpg",
  },
  {
    id: "route-food-local-life",
    slug: "food-local-life",
    title: {
      en: "Food & Local Life",
      fr: "Cuisine et vie locale",
      ar: "المطبخ والحياة اليومية",
      es: "Comida y vida local",
      de: "Essen & Alltag",
      it: "Cibo e vita locale",
      pt: "Comida e vida local",
    },
    subtitle: {
      en: "Buy the fish, watch it grilled, then walk it off under the arcades.",
      fr: "Achetez le poisson, regardez-le griller, puis marchez sous les arcades.",
      ar: "اشترِ السمك، وشاهده يُشوى، ثم امشِ تحت الأروقة.",
      es: "Compra el pescado, míralo a la parrilla y bájalo paseando por los soportales.",
      de: "Fisch kaufen, beim Grillen zusehen, danach unter den Arkaden ablaufen.",
      it: "Compra il pesce, guardalo alla griglia e smaltiscilo sotto i portici.",
      pt: "Compra o peixe, vê-o na grelha e depois anda-o sob as arcadas.",
    },
    city: "Casablanca",
    interests: ["food", "culture", "hidden_gems"],
    poiIds: [
      "poi-marche-central",
      "poi-ancienne-medina",
      "poi-la-sqala",
      "poi-habous",
    ],
    heroImage: "/images/poi/marche-central.jpg",
  },
  {
    id: "route-coast-sunset",
    slug: "coast-sunset",
    title: {
      en: "Coast & Sunset",
      fr: "Côte et coucher de soleil",
      ar: "الساحل والغروب",
      es: "Costa y atardecer",
      de: "Küste & Sonnenuntergang",
      it: "Costa e tramonto",
      pt: "Costa e pôr do sol",
    },
    subtitle: {
      en: "Seafood at noon, ramparts in the afternoon, the Atlantic at the end.",
      fr: "Poisson à midi, remparts l'après-midi, l'Atlantique pour finir.",
      ar: "سمك عند الظهيرة، وأسوار بعد الزوال، والأطلسي في الختام.",
      es: "Marisco a mediodía, murallas por la tarde y el Atlántico al final.",
      de: "Meeresfrüchte mittags, Wehrmauern nachmittags, am Ende der Atlantik.",
      it: "Pesce a mezzogiorno, mura nel pomeriggio, l'Atlantico alla fine.",
      pt: "Marisco ao meio-dia, muralhas à tarde, o Atlântico no fim.",
    },
    city: "Casablanca",
    interests: ["coast_nature", "food", "activities"],
    /*
     * A curated route hands its POIs a large scoring boost, so this list decides the day
     * far more than the title does. It used to read Marché Central → La Sqala → Hassan II
     * → Corniche: two indoor market/restaurant stops in a route called Coast & Sunset,
     * which is why picking "Activities" produced a day matching one stop in four. La
     * Sqala keeps the food slot — it is a rampart bastion on the water — and the rest of
     * the day now actually follows the coast.
     */
    poiIds: [
      "poi-la-sqala",
      "poi-marina-casablanca",
      "poi-corniche-ain-diab",
      "poi-plage-ain-diab",
    ],
    heroImage: "/images/poi/corniche-ain-diab.jpg",
  },
  {
    id: "route-hidden-gems",
    slug: "hidden-gems",
    title: {
      en: "Hidden Gems",
      fr: "Trésors cachés",
      ar: "كنوز خفية",
      es: "Rincones con encanto",
      de: "Geheimtipps",
      it: "Chicche nascoste",
      pt: "Cantos escondidos",
    },
    subtitle: {
      en: "A collector's villa, a deconsecrated cathedral and a cinema from 1930.",
      fr: "La villa d'un collectionneur, une cathédrale désacralisée et un cinéma de 1930.",
      ar: "فيلا جامع تحف، وكاتدرائية نُزع تكريسها، وسينما من عام 1930.",
      es: "La villa de un coleccionista, una catedral desacralizada y un cine de 1930.",
      de: "Die Villa eines Sammlers, eine entweihte Kathedrale und ein Kino von 1930.",
      it: "La villa di un collezionista, una cattedrale sconsacrata e un cinema del 1930.",
      pt: "A vivenda de um colecionador, uma catedral dessacralizada e um cinema de 1930.",
    },
    city: "Casablanca",
    interests: ["hidden_gems", "art_creative", "culture"],
    poiIds: [
      "poi-fondation-slaoui",
      "poi-sacre-coeur",
      "poi-cinema-rialto",
      "poi-villa-des-arts",
      "poi-musee-judaisme-marocain",
    ],
    heroImage: "/images/poi/sacre-coeur.jpg",
  },
  {
    id: "route-best-of-region",
    slug: "best-of-region",
    title: {
      en: "Best of the Region",
      fr: "Le meilleur de la région",
      ar: "أجمل ما في الجهة",
      es: "Lo mejor de la región",
      de: "Das Beste der Region",
      it: "Il meglio della regione",
      pt: "O melhor da região",
    },
    subtitle: {
      en: "Beyond Casablanca: a Portuguese sea fortress, a painted medina, a tidal lagoon.",
      fr: "Au-delà de Casablanca : une forteresse portugaise, une médina peinte, une lagune à marée.",
      ar: "خارج الدار البيضاء: حصن برتغالي، ومدينة مرسومة، وبحيرة تتنفس مع المدّ.",
      es: "Más allá de Casablanca: una fortaleza marina portuguesa, una medina pintada, una laguna de marea.",
      de: "Jenseits von Casablanca: eine portugiesische Seefestung, eine bemalte Medina, eine Gezeitenlagune.",
      it: "Oltre Casablanca: una fortezza marittima portoghese, una medina dipinta, una laguna di marea.",
      pt: "Para lá de Casablanca: uma fortaleza marítima portuguesa, uma medina pintada, uma lagoa de maré.",
    },
    city: "Casablanca-Settat",
    interests: ["culture", "coast_nature", "hidden_gems"],
    poiIds: [
      "poi-hassan-ii",
      "poi-azemmour-medina",
      "poi-cite-portugaise",
      "poi-oualidia-lagune",
      "poi-oualidia-oysters",
    ],
    heroImage: "/images/poi/cite-portugaise-mazagan.jpg",
  },
];

const BY_ID = new Map(BASE_ROUTES.map((route) => [route.id, route]));

export function getBaseRouteById(id: string): BaseRoute | undefined {
  return BY_ID.get(id);
}
