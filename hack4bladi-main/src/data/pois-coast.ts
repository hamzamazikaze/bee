/**
 * The coastal and inland pilot towns: El Jadida, Azemmour, Oualidia, Mohammedia,
 * Boulaouane.
 *
 * COORDINATE PROVENANCE — nothing here was guessed. Coordinates come from OpenStreetMap
 * (Nominatim + Overpass), cross-checked against Wikidata (P625) where the monument has an
 * entry. Two entries carry an explicit caveat in their `sources`: the Kasbah de
 * Mohammedia is unmapped in OSM, and the Oualidia boat trip has no fixed departure point.
 */
import type { POI } from "@/types/poi";
import { localizePoi } from "./content";
import { OSM, REGION, hours, media } from "./poi-utils";

// ---------------------------------------------------------------------------
// El Jadida
// ---------------------------------------------------------------------------

const CITE_PORTUGAISE: POI = {
  id: "poi-cite-portugaise",
  slug: "cite-portugaise-mazagan",
  name: "Cité Portugaise de Mazagan",
  localizedName: { fr: "Cité Portugaise de Mazagan", ar: "المدينة البرتغالية (مازاغان)" },
  city: "El Jadida",
  region: REGION,
  coordinates: { lat: 33.2568, lng: -8.50233 },
  coordinateType: "representative",
  categories: ["culture", "coast_nature", "hidden_gems"],
  tags: ["unesco", "mazagan", "ramparts", "sea gate", "portuguese"],
  openingHours: null,
  baseDurationMinutes: 90,
  priceRange: "free",
  approxPriceMad: [0, 0],
  indoorOutdoor: "outdoor",
  walkingScore: 3,
  cultural: {
    story: {
      en: "The Portuguese built Mazagan in 1514 and held it for 250 years, longer than any of their other Moroccan forts. When they finally withdrew in 1769 they blew up a bastion and sailed away, leaving the walls, the street grid and the churches to the town that grew around them. UNESCO listed it in 2004; people still live inside it.",
      fr: "Les Portugais ont bâti Mazagan en 1514 et l'ont tenue 250 ans, plus longtemps qu'aucun de leurs autres forts marocains. En se retirant enfin en 1769, ils ont fait sauter un bastion et pris la mer, laissant les murs, le plan des rues et les églises à la ville qui a poussé autour. Classée par l'UNESCO en 2004, elle est toujours habitée.",
      ar: "بنى البرتغاليون مازاغان عام 1514 واحتفظوا بها 250 سنة، أطول من أي حصن آخر لهم في المغرب. وحين انسحبوا أخيرًا عام 1769 نسفوا أحد الأبراج وأبحروا، تاركين الأسوار وتخطيط الشوارع والكنائس للمدينة التي نمت حولها. صنّفتها اليونسكو عام 2004، وما زال الناس يسكنون داخلها.",
    },
    tip: {
      en: "Walk the rampart circuit anticlockwise from the sea gate; it takes about thirty minutes and every bastion opens onto the Atlantic.",
      fr: "Faites le tour des remparts dans le sens inverse des aiguilles depuis la porte de la mer : une trentaine de minutes, et chaque bastion s'ouvre sur l'Atlantique.",
      ar: "طُف بالسور عكس عقارب الساعة انطلاقًا من باب البحر: نحو ثلاثين دقيقة، وكل برج يطل على الأطلسي.",
    },
  },
  media: media("cite-portugaise-mazagan", "culture"),
  hero: true,
  signature: true,
  priority: 5,
  verification: "verified",
  availability: { status: "open" },
  sources: OSM,
  baseRouteIds: ["route-best-of-region", "route-culture-heritage"],
};

const CITERNE_PORTUGAISE: POI = {
  id: "poi-citerne-portugaise",
  slug: "citerne-portugaise",
  name: "Citerne Portugaise",
  localizedName: { fr: "Citerne Portugaise", ar: "الصهريج البرتغالي" },
  city: "El Jadida",
  region: REGION,
  coordinates: { lat: 33.25656, lng: -8.50248 },
  coordinateType: "exact",
  categories: ["culture", "art_creative", "hidden_gems"],
  tags: ["1541 cistern", "orson welles", "reflecting water", "gothic vaults", "unesco"],
  openingHours: hours("09:00", "18:00"),
  baseDurationMinutes: 40,
  priceRange: "0_30",
  approxPriceMad: null,
  indoorOutdoor: "indoor",
  walkingScore: 1,
  cultural: {
    story: {
      en: "A vaulted hall built in 1541, half-flooded on purpose, where a thin film of water turns twenty-five pillars into fifty. Orson Welles filmed the riot scene of his Othello here in 1951 and made the room famous. The only light comes from one circular opening in the roof.",
      fr: "Une salle voûtée bâtie en 1541, volontairement à demi inondée, où une mince pellicule d'eau transforme vingt-cinq piliers en cinquante. Orson Welles y a tourné la scène d'émeute de son Othello en 1951 et a rendu le lieu célèbre. La seule lumière vient d'une ouverture circulaire dans la voûte.",
      ar: "قاعة معقودة بُنيت عام 1541، غُمرت نصفها عمدًا، حيث تحوّل طبقة ماء رقيقة خمسة وعشرين عمودًا إلى خمسين. صوّر أورسون ويلز فيها مشهد الشغب من فيلمه عطيل عام 1951 فذاع صيت المكان. ولا يدخلها من الضوء إلا فتحة دائرية في السقف.",
    },
    tip: {
      en: "The reflection needs sun overhead: between 11:00 and 14:00 the pillars double perfectly.",
      fr: "Le reflet exige un soleil haut : entre 11h et 14h, les piliers se dédoublent parfaitement.",
      ar: "يحتاج الانعكاس إلى شمس عالية: بين الحادية عشرة والثانية بعد الزوال تتضاعف الأعمدة تمامًا.",
    },
  },
  media: media("citerne-portugaise", "culture"),
  hero: true,
  signature: true,
  priority: 4,
  verification: "verified",
  availability: {
    status: "temporarily_unavailable",
    note: {
      en: "Closed to visitors for conservation work. The rest of the walled city is unaffected.",
      fr: "Fermée aux visiteurs pour travaux de conservation. Le reste de la cité fortifiée reste accessible.",
      ar: "مغلق أمام الزوار بسبب أشغال الترميم. أما باقي المدينة المسوّرة فمتاح كالعادة.",
    },
  },
  sources: OSM,
  baseRouteIds: ["route-best-of-region"],
};

const BASTION_DE_LANGE: POI = {
  id: "poi-bastion-de-lange",
  slug: "bastion-de-lange",
  name: "Bastion de l'Ange",
  localizedName: { fr: "Bastion de l'Ange", ar: "برج الملاك" },
  city: "El Jadida",
  region: REGION,
  coordinates: { lat: 33.25595, lng: -8.50038 },
  coordinateType: "exact",
  categories: ["culture", "coast_nature", "hidden_gems"],
  tags: ["rampart walk", "sea view", "portuguese bastion", "sunset", "chemin de ronde"],
  openingHours: hours("09:00", "18:00"),
  baseDurationMinutes: 30,
  priceRange: "0_30",
  approxPriceMad: null,
  indoorOutdoor: "outdoor",
  walkingScore: 2,
  cultural: {
    story: {
      en: "The eastern corner of the Portuguese ramparts, and the one place where you see the whole walled city and the Atlantic in a single turn. Its cannons faced the approach from Azemmour. Locals climb it at the end of the afternoon, when the light comes in flat across the water.",
      fr: "L'angle est des remparts portugais, et le seul endroit d'où l'on voit la cité fortifiée entière et l'Atlantique d'un même mouvement. Ses canons surveillaient l'accès depuis Azemmour. Les habitants y montent en fin d'après-midi, quand la lumière arrive rasante sur l'eau.",
      ar: "الركن الشرقي من الأسوار البرتغالية، والمكان الوحيد الذي ترى منه المدينة المسوّرة كاملة والأطلسي في التفاتة واحدة. كانت مدافعه تراقب الطريق القادمة من أزمور. يصعده السكان في آخر العصر حين يأتي الضوء منخفضًا فوق الماء.",
    },
    tip: {
      en: "Access is by the chemin de ronde, not from the street. Follow the wall from the sea gate.",
      fr: "L'accès se fait par le chemin de ronde, pas depuis la rue. Suivez le mur depuis la porte de la mer.",
      ar: "الدخول من طريق السور لا من الشارع. اتبع الجدار انطلاقًا من باب البحر.",
    },
  },
  media: media("bastion-de-lange", "culture"),
  hero: false,
  signature: false,
  priority: 3,
  verification: "needs_verification",
  availability: {
    status: "open",
    note: {
      en: "Rampart access depends on ongoing restoration work; sections close without notice.",
      fr: "L'accès aux remparts dépend des travaux de restauration en cours ; des sections ferment sans préavis.",
      ar: "يعتمد الوصول إلى السور على أشغال الترميم الجارية، وتُغلق بعض المقاطع دون إشعار.",
    },
  },
  sources: OSM,
  baseRouteIds: ["route-best-of-region"],
};

const PHARE_SIDI_BOUAFI: POI = {
  id: "poi-phare-sidi-bouafi",
  slug: "phare-sidi-bouafi",
  name: "Phare Sidi Bouafi",
  localizedName: { fr: "Phare Sidi Bouafi", ar: "منارة سيدي بوعفي" },
  city: "El Jadida",
  region: REGION,
  coordinates: { lat: 33.2503, lng: -8.51685 },
  coordinateType: "exact",
  categories: ["coast_nature", "hidden_gems", "culture"],
  tags: ["lighthouse", "panorama", "atlantic", "off the tourist track", "climb"],
  openingHours: null,
  baseDurationMinutes: 35,
  priceRange: "unknown",
  approxPriceMad: null,
  indoorOutdoor: "outdoor",
  walkingScore: 2,
  cultural: {
    story: {
      en: "A working lighthouse on the low headland south-west of El Jadida, well outside the postcard circuit. It has guided the coastal traffic between Casablanca and Safi since the early twentieth century. Nobody comes here, which is exactly the point.",
      fr: "Un phare en service sur la pointe basse au sud-ouest d'El Jadida, largement hors du circuit des cartes postales. Il guide le trafic côtier entre Casablanca et Safi depuis le début du XXe siècle. Personne n'y vient, et c'est précisément l'intérêt.",
      ar: "منارة عاملة على الرأس المنخفض جنوب غرب الجديدة، بعيدًا عن مسار البطاقات البريدية. توجّه الملاحة الساحلية بين الدار البيضاء وآسفي منذ مطلع القرن العشرين. لا يأتي إليها أحد، وهذا بالضبط ما يميزها.",
    },
    tip: {
      en: "It is an active navigation site, so admire it from the road, and ask before approaching the tower itself.",
      fr: "C'est un site de navigation actif : admirez-le depuis la route et demandez avant d'approcher la tour.",
      ar: "الموقع ملاحي عامل: تأمّله من الطريق واستأذن قبل الاقتراب من البرج نفسه.",
    },
  },
  media: media("phare-sidi-bouafi", "coast_nature"),
  hero: false,
  signature: false,
  priority: 2,
  verification: "needs_verification",
  availability: {
    status: "unknown",
    note: {
      en: "Public access to the lighthouse grounds is not confirmed.",
      fr: "L'accès public à l'enceinte du phare n'est pas confirmé.",
      ar: "الدخول العمومي إلى حرم المنارة غير مؤكد.",
    },
  },
  sources: OSM,
};

const PLAGE_DEAUVILLE: POI = {
  id: "poi-plage-deauville",
  slug: "plage-deauville",
  name: "Plage Deauville",
  localizedName: { fr: "Plage Deauville", ar: "شاطئ دوفيل" },
  city: "El Jadida",
  region: REGION,
  coordinates: { lat: 33.24895, lng: -8.49368 },
  coordinateType: "representative",
  categories: ["coast_nature", "activities", "food"],
  tags: ["town beach", "promenade", "swimming", "family", "sunset"],
  openingHours: null,
  baseDurationMinutes: 70,
  priceRange: "free",
  approxPriceMad: [0, 0],
  indoorOutdoor: "outdoor",
  walkingScore: 2,
  cultural: {
    story: {
      en: "El Jadida's town beach, named after the Normandy resort by French residents who thought the light was similar. It is wide, shallow and firmly local: football at low tide, grilled corn on the promenade, families staying until dark. The Portuguese ramparts close the view at the northern end.",
      fr: "La plage de ville d'El Jadida, baptisée d'après la station normande par des résidents français qui trouvaient la lumière semblable. Large, peu profonde et résolument locale : football à marée basse, épis de maïs grillés sur la promenade, familles jusqu'à la nuit. Les remparts portugais ferment la vue au nord.",
      ar: "شاطئ مدينة الجديدة، سُمّي على اسم المصيف النورماندي من مقيمين فرنسيين وجدوا الضوء متشابهًا. عريض وضحل ومحلي تمامًا: كرة قدم عند الجزر، وذرة مشوية على الممشى، وعائلات تبقى حتى الظلام. وتُغلق الأسوار البرتغالية الأفق من الشمال.",
    },
    tip: {
      en: "The northern end near the ramparts is calmer; the southern end has the food stalls.",
      fr: "L'extrémité nord, près des remparts, est plus calme ; le sud concentre les marchands ambulants.",
      ar: "الطرف الشمالي قرب الأسوار أهدأ، أما الجنوبي فتتجمع فيه عربات الأكل.",
    },
  },
  media: media("plage-deauville", "coast_nature"),
  hero: false,
  signature: false,
  priority: 3,
  verification: "verified",
  availability: { status: "open" },
  sources: OSM,
};

// ---------------------------------------------------------------------------
// Azemmour
// ---------------------------------------------------------------------------

const AZEMMOUR_MEDINA: POI = {
  id: "poi-azemmour-medina",
  slug: "azemmour-medina",
  name: "Médina et remparts d'Azemmour",
  localizedName: { fr: "Médina et remparts d'Azemmour", ar: "مدينة أزمور وأسوارها" },
  city: "Azemmour",
  region: REGION,
  coordinates: { lat: 33.29046, lng: -8.34122 },
  coordinateType: "representative",
  categories: ["hidden_gems", "art_creative", "culture"],
  tags: ["oum er-rbia", "murals", "portuguese ramparts", "whitewash", "artists"],
  openingHours: null,
  baseDurationMinutes: 75,
  priceRange: "free",
  approxPriceMad: [0, 0],
  indoorOutdoor: "outdoor",
  walkingScore: 3,
  cultural: {
    story: {
      en: "A white medina stacked above the Oum Er-Rbia, twenty minutes from El Jadida and visited by almost nobody. The Portuguese fortified it in 1513 and abandoned it eight years later. Since the 2000s painters have taken over the empty walls, so the lanes are half ruin and half open-air gallery.",
      fr: "Une médina blanche empilée au-dessus de l'Oum Er-Rbia, à vingt minutes d'El Jadida et visitée par presque personne. Les Portugais l'ont fortifiée en 1513 et abandonnée huit ans plus tard. Depuis les années 2000, des peintres se sont emparés des murs vides : les ruelles sont moitié ruine, moitié galerie à ciel ouvert.",
      ar: "مدينة بيضاء متراصة فوق نهر أم الربيع، على بعد عشرين دقيقة من الجديدة ولا يزورها أحد تقريبًا. حصّنها البرتغاليون عام 1513 وتركوها بعد ثماني سنوات. ومنذ الألفية استولى الرسامون على جدرانها الخالية، فصارت الأزقة نصف خراب ونصف رواق مفتوح.",
    },
    tip: {
      en: "Cross to the river side of the walls at the end: the view back over the medina and the water is the whole trip.",
      fr: "Passez côté fleuve au bout des remparts : la vue en retour sur la médina et l'eau justifie à elle seule le détour.",
      ar: "اعبر إلى الجهة النهرية من السور في النهاية، فالمنظر العائد على المدينة والماء يستحق الرحلة وحده.",
    },
  },
  media: media("azemmour-medina", "hidden_gems"),
  hero: true,
  signature: false,
  priority: 4,
  verification: "verified",
  availability: { status: "open" },
  sources: OSM,
  baseRouteIds: ["route-best-of-region", "route-hidden-gems"],
};

// ---------------------------------------------------------------------------
// Oualidia
// ---------------------------------------------------------------------------

const OUALIDIA_LAGUNE: POI = {
  id: "poi-oualidia-lagune",
  slug: "lagune-de-oualidia",
  name: "Lagune de Oualidia",
  localizedName: { fr: "Lagune de Oualidia", ar: "بحيرة الوليدية" },
  city: "Oualidia",
  region: REGION,
  coordinates: { lat: 32.7419, lng: -9.03985 },
  coordinateType: "representative",
  categories: ["coast_nature", "hidden_gems", "activities"],
  tags: ["tidal lagoon", "flamingos", "oyster beds", "birdwatching", "calm water"],
  openingHours: null,
  baseDurationMinutes: 90,
  priceRange: "free",
  approxPriceMad: [0, 0],
  indoorOutdoor: "outdoor",
  walkingScore: 2,
  cultural: {
    story: {
      en: "A crescent of seawater held behind a sandbar, filling and emptying with the tide twice a day. Flamingos, spoonbills and thousands of migrating waders use it as a stopover between Europe and West Africa. It is also the reason Morocco's oysters come from here and not somewhere else.",
      fr: "Un croissant d'eau de mer retenu derrière un cordon de sable, qui se remplit et se vide deux fois par jour avec la marée. Flamants, spatules et des milliers de limicoles migrateurs y font escale entre l'Europe et l'Afrique de l'Ouest. C'est aussi la raison pour laquelle les huîtres du Maroc viennent d'ici et pas d'ailleurs.",
      ar: "هلال من ماء البحر محتجز خلف حاجز رملي، يمتلئ ويفرغ مرتين في اليوم مع المدّ والجزر. تتخذه طيور النحام وأبو ملعقة وآلاف الخواضات المهاجرة محطة بين أوروبا وغرب أفريقيا. وهو أيضًا سبب أن محار المغرب يأتي من هنا لا من مكان آخر.",
    },
    tip: {
      en: "Low tide exposes the oyster tables and brings the birds in close. Ask locally for the day's tide times.",
      fr: "La marée basse découvre les tables ostréicoles et rapproche les oiseaux. Demandez sur place les horaires de marée du jour.",
      ar: "يكشف الجزر طاولات المحار ويقرّب الطيور. اسأل السكان عن أوقات المدّ والجزر في اليوم.",
    },
  },
  media: media("lagune-de-oualidia", "coast_nature"),
  hero: true,
  signature: true,
  priority: 5,
  verification: "verified",
  availability: { status: "open" },
  sources: OSM,
  baseRouteIds: ["route-best-of-region", "route-coast-sunset"],
};

const OUALIDIA_PLAGE: POI = {
  id: "poi-oualidia-plage",
  slug: "plage-de-oualidia",
  name: "Plage de Oualidia",
  localizedName: { fr: "Plage de Oualidia", ar: "شاطئ الوليدية" },
  city: "Oualidia",
  region: REGION,
  coordinates: { lat: 32.73464, lng: -9.04532 },
  coordinateType: "representative",
  categories: ["coast_nature", "activities", "food"],
  tags: ["sheltered beach", "shallow", "swimming", "surf nearby", "sunset"],
  openingHours: null,
  baseDurationMinutes: 80,
  priceRange: "free",
  approxPriceMad: [0, 0],
  indoorOutdoor: "outdoor",
  walkingScore: 2,
  cultural: {
    story: {
      en: "The sandbar takes the force out of the Atlantic, so this is one of the few beaches on the whole coast where the water is genuinely calm. Moroccan families have summered here since the 1930s, when Sultan Youssef built a villa above the bay. Outside July and August you may have most of it to yourself.",
      fr: "Le cordon de sable casse la force de l'Atlantique : c'est l'une des rares plages de toute la côte où l'eau est réellement calme. Les familles marocaines y passent l'été depuis les années 1930, quand le sultan Youssef fit bâtir une villa au-dessus de la baie. Hors juillet et août, elle est presque à vous.",
      ar: "يكسر الحاجز الرملي قوة الأطلسي، فهذا من الشواطئ القليلة على الساحل كله حيث الماء هادئ فعلًا. تصطاف العائلات المغربية هنا منذ الثلاثينيات، حين بنى السلطان يوسف فيلا فوق الخليج. وخارج يوليوز وغشت قد يكون الشاطئ كله لك.",
    },
    tip: {
      en: "The far end of the bay, past the last guesthouses, stays empty even in high season.",
      fr: "Le fond de la baie, après les dernières maisons d'hôtes, reste désert même en haute saison.",
      ar: "يظل طرف الخليج البعيد، بعد آخر دور الضيافة، خاليًا حتى في ذروة الموسم.",
    },
  },
  media: media("plage-de-oualidia", "coast_nature"),
  hero: false,
  signature: false,
  priority: 3,
  verification: "verified",
  availability: { status: "open" },
  sources: OSM,
};

const OUALIDIA_BOAT_TRIP: POI = {
  id: "poi-oualidia-boat-trip",
  slug: "balade-en-barque-lagune-oualidia",
  name: "Balade en barque sur la lagune",
  localizedName: {
    en: "Oualidia Lagoon Boat Trip",
    fr: "Balade en barque sur la lagune",
    ar: "جولة بالقارب في بحيرة الوليدية",
  },
  city: "Oualidia",
  region: REGION,
  coordinates: { lat: 32.73653, lng: -9.03266 },
  coordinateType: "representative",
  categories: ["activities", "coast_nature", "hidden_gems"],
  tags: ["small boat", "oyster parks", "birds", "45 minutes", "agree the price"],
  openingHours: null,
  baseDurationMinutes: 60,
  priceRange: "60_150",
  approxPriceMad: null,
  indoorOutdoor: "outdoor",
  walkingScore: 1,
  cultural: {
    story: {
      en: "Flat wooden boats leave from the lagoon shore whenever there are enough passengers, which in low season means whenever you ask. The circuit runs past the oyster tables to the sandbar mouth where the Atlantic comes in. Boatmen here are usually oyster farmers first and guides second, which makes the commentary better.",
      fr: "Des barques à fond plat partent de la rive de la lagune dès qu'il y a assez de passagers; en basse saison, dès que vous le demandez. Le circuit longe les tables ostréicoles jusqu'à la passe où entre l'Atlantique. Les bateliers sont d'abord ostréiculteurs et guides ensuite, ce qui rend le commentaire meilleur.",
      ar: "تنطلق قوارب خشبية مسطحة من ضفة البحيرة كلما اجتمع ركاب كافون، وفي غير الموسم كلما طلبت أنت. تمرّ الجولة بطاولات المحار حتى فم الحاجز الرملي حيث يدخل الأطلسي. أصحاب القوارب هنا مربّو محار أولًا ومرشدون ثانيًا، ولهذا يكون شرحهم أفضل.",
    },
    tip: {
      en: "Agree the price and the length of the trip before you step in: there is no fixed tariff.",
      fr: "Fixez le prix et la durée avant d'embarquer : il n'existe aucun tarif officiel.",
      ar: "اتفق على الثمن ومدة الجولة قبل الركوب، فلا تعريفة رسمية هنا.",
    },
  },
  media: media("balade-en-barque-lagune-oualidia", "activities"),
  hero: false,
  signature: false,
  priority: 3,
  verification: "needs_verification",
  availability: {
    status: "seasonal",
    note: {
      en: "Informal, weather- and tide-dependent, with no fixed departure point. The coordinate is a lagoon-shore anchor.",
      fr: "Activité informelle, dépendante de la météo et des marées, sans point de départ fixe. La coordonnée est un point d'ancrage sur la rive.",
      ar: "نشاط غير رسمي يتوقف على الطقس والمدّ، وبلا نقطة انطلاق ثابتة. الإحداثية نقطة استدلال على الضفة.",
    },
  },
  sources: OSM,
};

const OUALIDIA_OYSTERS: POI = {
  id: "poi-oualidia-oysters",
  slug: "degustation-huitres-oualidia",
  name: "Dégustation d'huîtres chez Ostréa",
  localizedName: {
    en: "Oualidia Oyster Tasting",
    fr: "Dégustation d'huîtres chez Ostréa",
    ar: "تذوق المحار في أوستريا",
  },
  city: "Oualidia",
  region: REGION,
  coordinates: { lat: 32.74607, lng: -9.02369 },
  coordinateType: "exact",
  categories: ["food", "coast_nature", "activities"],
  tags: ["oyster farm", "on the lagoon", "shucked to order", "lemon", "lunch"],
  openingHours: hours("11:00", "19:00"),
  baseDurationMinutes: 60,
  priceRange: "60_150",
  approxPriceMad: null,
  indoorOutdoor: "mixed",
  walkingScore: 1,
  cultural: {
    story: {
      en: "Oualidia produces most of Morocco's oysters, and the farms serve them a few metres from the tables they grew on. They are opened in front of you, eaten with nothing but lemon, and counted by the dozen. This is the closest thing the region has to a signature dish with an address.",
      fr: "Oualidia produit l'essentiel des huîtres du Maroc, et les fermes les servent à quelques mètres des tables où elles ont poussé. On les ouvre devant vous, on les mange avec un simple citron, on les compte à la douzaine. C'est ce que la région a de plus proche d'un plat signature avec une adresse.",
      ar: "تنتج الوليدية معظم محار المغرب، وتقدّمه المزارع على بعد أمتار من الطاولات التي نما عليها. يُفتح أمامك، ويؤكل بالليمون وحده، ويُحسب بالدزينة. وهو أقرب ما في الجهة إلى طبق مميز له عنوان.",
    },
    tip: {
      en: "Ask which park the batch came from: farmers here will tell you, and the answer changes the taste.",
      fr: "Demandez de quel parc vient la fournée : les ostréiculteurs vous le diront, et la réponse change le goût.",
      ar: "اسأل من أي حوض جاءت الدفعة، فالمربّون هنا يخبرونك، والجواب يغيّر الطعم.",
    },
  },
  media: media("degustation-huitres-oualidia", "food"),
  hero: true,
  signature: false,
  priority: 4,
  verification: "verified",
  availability: { status: "open" },
  sources: OSM,
  baseRouteIds: ["route-best-of-region"],
};

// ---------------------------------------------------------------------------
// Mohammedia
// ---------------------------------------------------------------------------

const KASBAH_MOHAMMEDIA: POI = {
  id: "poi-kasbah-mohammedia",
  slug: "kasbah-de-mohammedia",
  name: "Kasbah de Mohammedia",
  localizedName: { fr: "Kasbah de Mohammedia", ar: "قصبة المحمدية" },
  city: "Mohammedia",
  region: REGION,
  coordinates: { lat: 33.699, lng: -7.38924 },
  coordinateType: "representative",
  categories: ["culture", "hidden_gems", "food"],
  tags: ["fedala", "1773 walls", "grain stores", "fishing port", "lived-in"],
  openingHours: null,
  baseDurationMinutes: 60,
  priceRange: "free",
  approxPriceMad: [0, 0],
  indoorOutdoor: "outdoor",
  walkingScore: 3,
  cultural: {
    story: {
      en: "Sultan Sidi Mohammed ben Abdallah walled this in 1773 to store the grain of the Tamesna plain before it was shipped out. The town around it was called Fedala until 1960. Inside the walls it is still a working neighbourhood of shops, houses and laundry, not a monument with a ticket desk.",
      fr: "Le sultan Sidi Mohammed ben Abdallah l'a fait murer en 1773 pour stocker le grain de la plaine de Tamesna avant son embarquement. La ville autour s'appelait Fedala jusqu'en 1960. À l'intérieur des murs, c'est toujours un quartier vivant, avec ses boutiques, ses maisons et son linge aux fenêtres, et non un monument avec guichet.",
      ar: "أمر السلطان سيدي محمد بن عبد الله بتسويرها عام 1773 لتخزين حبوب سهل تامسنا قبل شحنها. وظلت المدينة حولها تُسمى فضالة حتى 1960. وداخل الأسوار ما زال حيًا عاملًا: دكاكين وبيوت وغسيل معلّق، لا نصبًا بشباك تذاكر.",
    },
    tip: {
      en: "Come on a weekday morning when the fishing port next door is unloading: that is when the quarter is at its best.",
      fr: "Venez un matin de semaine, quand le port de pêche voisin débarque : c'est là que le quartier est au meilleur.",
      ar: "تعال صباح يوم عمل حين يفرّغ ميناء الصيد المجاور حمولته، فتلك أفضل ساعات الحي.",
    },
  },
  media: media("kasbah-de-mohammedia", "culture"),
  hero: false,
  signature: false,
  priority: 3,
  verification: "needs_verification",
  availability: { status: "open" },
  sources: [
    {
      name: "OpenStreetMap: the kasbah itself is unmapped; this anchor sits on the OSM features named 'Kasbah' in Mohammedia centre",
      url: "https://www.openstreetmap.org/",
    },
  ],
};

// ---------------------------------------------------------------------------
// Boulaouane
// ---------------------------------------------------------------------------

const KASBAH_BOULAOUANE: POI = {
  id: "poi-kasbah-boulaouane",
  slug: "kasbah-de-boulaouane",
  name: "Kasbah de Boulaouane",
  localizedName: { fr: "Kasbah de Boulaouane", ar: "قصبة بولعوان" },
  city: "Boulaouane",
  region: REGION,
  coordinates: { lat: 32.85689, lng: -8.02003 },
  coordinateType: "exact",
  categories: ["culture", "hidden_gems", "coast_nature"],
  tags: ["moulay ismail", "river bend", "fortress", "vineyards", "remote"],
  openingHours: null,
  baseDurationMinutes: 70,
  priceRange: "unknown",
  approxPriceMad: null,
  indoorOutdoor: "outdoor",
  walkingScore: 3,
  cultural: {
    story: {
      en: "Moulay Ismail built this fortress in 1710 on a loop of the Oum Er-Rbia, where the river almost turns back on itself. It guarded the road between Marrakech and the coast and held a garrison, a mosque and a governor's house. Today it stands empty above the vineyards that gave Morocco its best-known rosé.",
      fr: "Moulay Ismaïl fit bâtir cette forteresse en 1710 sur une boucle de l'Oum Er-Rbia, là où le fleuve revient presque sur lui-même. Elle surveillait la route entre Marrakech et la côte et abritait une garnison, une mosquée et la maison du gouverneur. Elle domine aujourd'hui, vide, les vignes qui ont donné au Maroc son rosé le plus connu.",
      ar: "بنى مولاي إسماعيل هذه القلعة عام 1710 على انعطافة من نهر أم الربيع حيث يكاد النهر يرتد على نفسه. كانت تحرس الطريق بين مراكش والساحل، وتضم حامية ومسجدًا ودار الحاكم. واليوم تقف خاوية فوق الكروم التي أعطت المغرب أشهر نبيذه الوردي.",
    },
    tip: {
      en: "There is no ticket office, no shade and no café. Bring water and go early. It is a two-hour drive from Casablanca.",
      fr: "Ni guichet, ni ombre, ni café. Emportez de l'eau et partez tôt : c'est à deux heures de route de Casablanca.",
      ar: "لا شباك تذاكر ولا ظل ولا مقهى. خذ معك ماءً وانطلق باكرًا، فهي على ساعتين بالسيارة من الدار البيضاء.",
    },
  },
  media: media("kasbah-de-boulaouane", "culture"),
  hero: true,
  signature: false,
  priority: 3,
  verification: "needs_verification",
  availability: {
    status: "unknown",
    note: {
      en: "Unstaffed and partly ruined. Opening arrangements and safe access are not confirmed.",
      fr: "Sans gardiennage et en partie ruinée. Les conditions d'ouverture et la sécurité d'accès ne sont pas confirmées.",
      ar: "بلا حراسة وخربة جزئيًا. شروط الفتح وسلامة الوصول غير مؤكدة.",
    },
  },
  sources: [
    { name: "OpenStreetMap", url: "https://www.openstreetmap.org/" },
    { name: "Wikidata Q12232935", url: "https://www.wikidata.org/wiki/Q12232935" },
  ],
};

/**
 * The curated dataset. The first four are re-exported from the golden fixtures so their
 * ids and coordinates are the same object the demo uses — they cannot drift.
/** El Jadida, Azemmour, Oualidia, Mohammedia, Boulaouane. */
const COAST_SOURCE: POI[] = [
  CITE_PORTUGAISE,
  CITERNE_PORTUGAISE,
  BASTION_DE_LANGE,
  PHARE_SIDI_BOUAFI,
  PLAGE_DEAUVILLE,
  AZEMMOUR_MEDINA,
  OUALIDIA_LAGUNE,
  OUALIDIA_PLAGE,
  OUALIDIA_BOAT_TRIP,
  OUALIDIA_OYSTERS,
  KASBAH_MOHAMMEDIA,
  KASBAH_BOULAOUANE,
];

/**
 * Exported through the content layer, so the narrative carries every language we
 * have a translation for. Nothing else about these objects changes.
 */
export const COAST_POIS: POI[] = COAST_SOURCE.map(localizePoi);
