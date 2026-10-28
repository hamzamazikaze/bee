/**
 * Casablanca — the curated POIs that are not golden fixtures.
 *
 * COORDINATE PROVENANCE — nothing here was guessed. Every lat/lng was resolved against
 * OpenStreetMap (Nominatim search + Overpass named features). `coordinateType:
 * "representative"` marks an anchor inside an area (a medina, a boulevard, a corniche) —
 * it is deliberately not an entrance. `verification: "needs_verification"` marks a POI a
 * human should confirm before the demo: the coordinate is not corroborated to ~100 m, or
 * the opening hours / access rules are curated guesses.
 *
 * The four golden Casablanca POIs (Hassan II, Habous, Marché Central, Sacré-Cœur) live in
 * src/data/fixtures/golden-pois.ts and are re-exported by src/data/pois.ts, so their ids
 * and coordinates can never drift from the demo fixtures.
 */
import type { POI } from "@/types/poi";
import { localizePoi } from "./content";
import { OSM, REGION, hours, media } from "./poi-utils";


const ANCIENNE_MEDINA: POI = {
  id: "poi-ancienne-medina",
  slug: "ancienne-medina",
  name: "Ancienne Médina",
  localizedName: { fr: "Ancienne Médina", ar: "المدينة القديمة" },
  city: "Casablanca",
  region: REGION,
  coordinates: { lat: 33.60072, lng: -7.62033 },
  coordinateType: "representative",
  categories: ["culture", "hidden_gems", "food"],
  tags: ["old city", "ramparts", "clock tower", "street food", "port"],
  openingHours: null,
  baseDurationMinutes: 70,
  priceRange: "free",
  approxPriceMad: [0, 0],
  indoorOutdoor: "outdoor",
  walkingScore: 3,
  cultural: {
    story: {
      en: "This is the only piece of Casablanca that is older than the twentieth century. Low, whitewashed and entirely unglamorous, it survived the French rebuilding because nobody thought it worth demolishing. Behind the clock-tower gate the lanes narrow into hardware stalls, fish grills and doorways painted the blue of the port.",
      fr: "C'est le seul morceau de Casablanca antérieur au XXe siècle. Basse, blanchie à la chaux, sans aucun apprêt, elle a survécu à la reconstruction française parce que personne ne l'a jugée digne d'être démolie. Derrière la porte de l'horloge, les ruelles se resserrent en quincailleries, grillades de poisson et portes peintes du bleu du port.",
      ar: "هذه هي القطعة الوحيدة من الدار البيضاء الأقدم من القرن العشرين. منخفضة ومبيّضة وبلا زخرف، نجت من إعادة البناء الفرنسية لأن أحدًا لم يرَ فيها ما يستحق الهدم. خلف باب الساعة تضيق الأزقة بين محال الحدائد ومشاوي السمك وأبواب بلون ميناء المدينة.",
    },
    tip: {
      en: "Enter by the clock tower on Place des Nations Unies and keep the rampart on your left, and you come out at the port, never lost.",
      fr: "Entrez par la tour de l'horloge sur la place des Nations Unies et gardez le rempart à votre gauche : vous ressortez au port, sans jamais vous perdre.",
      ar: "ادخل من برج الساعة بساحة الأمم المتحدة وأبقِ السور على يسارك، فتخرج عند الميناء دون أن تضل.",
    },
  },
  media: media("ancienne-medina", "culture"),
  hero: true,
  signature: true,
  priority: 4,
  verification: "verified",
  availability: { status: "open" },
  sources: OSM,
  baseRouteIds: ["route-culture-heritage", "route-food-local-life"],
};

const LA_SQALA: POI = {
  id: "poi-la-sqala",
  slug: "la-sqala",
  name: "La Sqala",
  localizedName: { fr: "La Sqala", ar: "السقالة" },
  city: "Casablanca",
  region: REGION,
  coordinates: { lat: 33.60285, lng: -7.61921 },
  coordinateType: "exact",
  categories: ["food", "culture", "hidden_gems"],
  tags: ["bastion", "garden courtyard", "moroccan breakfast", "cannons", "ramparts"],
  openingHours: hours("08:00", "23:00"),
  baseDurationMinutes: 75,
  priceRange: "60_150",
  approxPriceMad: null,
  indoorOutdoor: "mixed",
  walkingScore: 1,
  cultural: {
    story: {
      en: "An eighteenth-century sea bastion that now serves breakfast. Its cannons still point at the Atlantic from the medina wall, and the courtyard behind them has been planted into a garden of bougainvillea and orange trees. Order the msemen and you are eating inside the city's defences.",
      fr: "Un bastion maritime du XVIIIe siècle qui sert désormais le petit-déjeuner. Ses canons pointent toujours vers l'Atlantique depuis le mur de la médina, et la cour derrière eux est devenue un jardin de bougainvilliers et d'orangers. Commandez le msemen : vous mangez à l'intérieur des défenses de la ville.",
      ar: "حصن بحري من القرن الثامن عشر صار اليوم يقدّم الفطور. ما تزال مدافعه مصوّبة نحو الأطلسي من سور المدينة، وقد تحوّل الفناء خلفها إلى حديقة من الجهنمية وأشجار البرتقال. اطلب المسمّن وأنت تأكل داخل أسوار المدينة.",
    },
    tip: {
      en: "The garden fills from 11:00 on weekends. Come at nine for a quiet breakfast and the cannons to yourself.",
      fr: "Le jardin se remplit dès 11h le week-end. Venez à neuf heures pour un petit-déjeuner calme et les canons rien qu'à vous.",
      ar: "تمتلئ الحديقة من الحادية عشرة في عطلة نهاية الأسبوع. تعال في التاسعة لفطور هادئ وللمدافع وحدك.",
    },
  },
  media: media("la-sqala", "food"),
  hero: false,
  signature: false,
  priority: 3,
  verification: "verified",
  availability: { status: "open" },
  sources: OSM,
  baseRouteIds: ["route-food-local-life", "route-coast-sunset"],
};

const MUSEE_JUDAISME: POI = {
  id: "poi-musee-judaisme-marocain",
  slug: "musee-du-judaisme-marocain",
  name: "Musée du Judaïsme Marocain",
  localizedName: { fr: "Musée du Judaïsme Marocain", ar: "متحف اليهودية المغربية" },
  city: "Casablanca",
  region: REGION,
  coordinates: { lat: 33.55226, lng: -7.63898 },
  coordinateType: "exact",
  categories: ["culture", "hidden_gems", "art_creative"],
  tags: ["jewish heritage", "oasis district", "synagogue objects", "textiles", "quiet"],
  openingHours: hours("10:00", "17:00", { closed: [0, 6] }),
  baseDurationMinutes: 60,
  priceRange: "30_60",
  approxPriceMad: null,
  indoorOutdoor: "indoor",
  walkingScore: 1,
  cultural: {
    story: {
      en: "The only museum of Jewish life anywhere in the Arab world, in a quiet villa in the Oasis district. Morocco's Jewish community numbered a quarter of a million before the 1950s; what stayed behind is here: Torah cases, wedding kaftans, two reconstructed synagogue interiors. It is small, and it takes its time with you.",
      fr: "Le seul musée consacré à la vie juive dans tout le monde arabe, dans une villa tranquille du quartier Oasis. La communauté juive du Maroc comptait un quart de million de personnes avant les années 1950 ; ce qui est resté se trouve ici : étuis de Torah, caftans de mariage, deux intérieurs de synagogue reconstitués. Il est petit, et il prend son temps avec vous.",
      ar: "المتحف الوحيد المخصص للحياة اليهودية في العالم العربي كله، في فيلا هادئة بحي واحة. كان عدد اليهود المغاربة يقارب ربع مليون قبل الخمسينيات؛ وما بقي منهم موجود هنا: علب التوراة، وقفاطين الأعراس، وداخلان لكنيسين أُعيد بناؤهما. صغير، ويمنحك وقته.",
    },
    tip: {
      en: "It sits well south of the centre. Pair it with nothing else downtown and allow twenty minutes each way by taxi.",
      fr: "Il se trouve loin au sud du centre : ne l'associez à rien d'autre en centre-ville et comptez vingt minutes de taxi dans chaque sens.",
      ar: "يقع جنوب المركز بمسافة، فلا تجمعه مع محطة أخرى في وسط المدينة، واحسب عشرين دقيقة بالتاكسي في كل اتجاه.",
    },
  },
  media: media("musee-du-judaisme-marocain", "culture"),
  hero: false,
  signature: false,
  priority: 3,
  verification: "needs_verification",
  availability: {
    status: "open",
    note: {
      en: "Opening days and admission should be confirmed before you travel across the city.",
      fr: "Les jours d'ouverture et le tarif sont à confirmer avant de traverser la ville.",
      ar: "يُستحسن تأكيد أيام الفتح وثمن الدخول قبل عبور المدينة.",
    },
  },
  sources: OSM,
  baseRouteIds: ["route-hidden-gems"],
};

const FONDATION_SLAOUI: POI = {
  id: "poi-fondation-slaoui",
  slug: "fondation-abderrahman-slaoui",
  name: "Fondation Abderrahman Slaoui",
  localizedName: { fr: "Fondation Abderrahman Slaoui", ar: "مؤسسة عبد الرحمن السلاوي" },
  city: "Casablanca",
  region: REGION,
  coordinates: { lat: 33.5924, lng: -7.62262 },
  coordinateType: "exact",
  categories: ["art_creative", "culture", "hidden_gems"],
  tags: ["art deco villa", "orientalist posters", "crystal", "berber jewellery", "rooftop"],
  openingHours: hours("10:00", "18:00", { closed: [0, 1] }),
  baseDurationMinutes: 55,
  priceRange: "0_30",
  approxPriceMad: null,
  indoorOutdoor: "indoor",
  walkingScore: 1,
  cultural: {
    story: {
      en: "A collector's house turned museum, three floors of an Art Deco villa off Boulevard Moulay Youssef. Abderrahman Slaoui bought what nobody else was buying in the 1940s: travel posters, Fassi crystal, Berber silver. The rooftop terrace is the reason regulars keep coming back.",
      fr: "La maison d'un collectionneur devenue musée : trois étages d'une villa Art déco près du boulevard Moulay Youssef. Abderrahman Slaoui achetait dans les années 1940 ce que personne ne voulait : affiches de voyage, cristal de Fès, argent berbère. La terrasse sur le toit est ce qui fait revenir les habitués.",
      ar: "بيت جامع تحف صار متحفًا: ثلاثة طوابق في فيلا بطراز آرت ديكو قرب شارع مولاي يوسف. اشترى عبد الرحمن السلاوي في الأربعينيات ما لم يكن أحد يشتريه: ملصقات السفر، وبلور فاس، وفضة الأمازيغ. وسطح المبنى هو سبب عودة الزوار الدائمين.",
    },
    tip: {
      en: "Closed Sunday and Monday. The rooftop café is open to visitors, so go up before you leave.",
      fr: "Fermé dimanche et lundi. Le café du toit est ouvert aux visiteurs : montez avant de partir.",
      ar: "مغلق الأحد والاثنين. مقهى السطح مفتوح للزوار، فاصعد إليه قبل المغادرة.",
    },
  },
  media: media("fondation-abderrahman-slaoui", "art_creative"),
  hero: false,
  signature: false,
  priority: 3,
  verification: "verified",
  availability: { status: "open" },
  sources: OSM,
  baseRouteIds: ["route-hidden-gems", "route-culture-heritage"],
};

const VILLA_DES_ARTS: POI = {
  id: "poi-villa-des-arts",
  slug: "villa-des-arts",
  name: "Villa des Arts",
  localizedName: { fr: "Villa des Arts", ar: "دار الفنون" },
  city: "Casablanca",
  region: REGION,
  coordinates: { lat: 33.58642, lng: -7.62955 },
  coordinateType: "exact",
  categories: ["art_creative", "culture"],
  tags: ["1934 villa", "contemporary art", "free entry", "garden", "gauthier"],
  openingHours: hours("09:30", "19:00", { closed: [1] }),
  baseDurationMinutes: 60,
  priceRange: "free",
  approxPriceMad: [0, 0],
  indoorOutdoor: "indoor",
  walkingScore: 1,
  cultural: {
    story: {
      en: "A 1934 Art Deco villa in Gauthier, restored as a free contemporary art space. Where the family once lived there are now three exhibition floors and a garden that Casablancais use as a reading room. The programme changes every few weeks, so no two visits are the same show.",
      fr: "Une villa Art déco de 1934 à Gauthier, restaurée en espace d'art contemporain gratuit. Là où vivait une famille, il y a désormais trois étages d'exposition et un jardin que les Casablancais utilisent comme salle de lecture. La programmation change toutes les quelques semaines : deux visites ne se ressemblent jamais.",
      ar: "فيلا بطراز آرت ديكو من عام 1934 في حي غوتييه، رُممت لتصير فضاءً مجانيًا للفن المعاصر. حيث كانت تسكن عائلة صارت ثلاثة طوابق للمعارض وحديقة يتخذها البيضاويون قاعة للمطالعة. يتغير البرنامج كل بضعة أسابيع، فلا تتشابه زيارتان.",
    },
    tip: {
      en: "Entry is free but the villa closes on Mondays and between hangings. Check what is showing on the day.",
      fr: "L'entrée est gratuite, mais la villa ferme le lundi et entre deux accrochages : vérifiez l'exposition du jour.",
      ar: "الدخول مجاني، لكن الفيلا تغلق يوم الاثنين وبين معرضين، فتحقق من المعروض في اليوم نفسه.",
    },
  },
  media: media("villa-des-arts", "art_creative"),
  hero: true,
  signature: false,
  priority: 3,
  verification: "needs_verification",
  availability: {
    status: "open",
    note: {
      en: "Closed between exhibitions. Confirm the current programme before building an afternoon around it.",
      fr: "Fermée entre deux expositions. Confirmez la programmation avant d'organiser votre après-midi autour.",
      ar: "تُغلق بين المعارض. تأكد من البرنامج الحالي قبل أن تبني فترة ما بعد الظهر حولها.",
    },
  },
  sources: OSM,
  baseRouteIds: ["route-hidden-gems"],
};

const PLACE_MOHAMMED_V: POI = {
  id: "poi-place-mohammed-v",
  slug: "place-mohammed-v",
  name: "Place Mohammed V",
  localizedName: { fr: "Place Mohammed V", ar: "ساحة محمد الخامس" },
  city: "Casablanca",
  region: REGION,
  coordinates: { lat: 33.59164, lng: -7.61984 },
  coordinateType: "representative",
  categories: ["culture", "art_creative"],
  tags: ["mauresque architecture", "fountain", "civic square", "pigeons", "clock tower"],
  openingHours: null,
  baseDurationMinutes: 35,
  priceRange: "free",
  approxPriceMad: [0, 0],
  indoorOutdoor: "outdoor",
  walkingScore: 2,
  cultural: {
    story: {
      en: "The square where the French laid out their new capital of commerce: courthouse, prefecture, post office and bank, all facing one fountain. The style is mauresque: European plans wearing Moroccan arches and green tile. At dusk the fountain lights up and the whole square becomes a family promenade.",
      fr: "La place où les Français ont posé leur nouvelle capitale du commerce : palais de justice, préfecture, poste et banque, tous tournés vers une fontaine. Le style est mauresque : des plans européens habillés d'arcs marocains et de tuiles vertes. À la tombée du jour, la fontaine s'illumine et la place entière devient une promenade familiale.",
      ar: "الساحة التي أقام فيها الفرنسيون عاصمتهم التجارية الجديدة: المحكمة والعمالة والبريد والبنك، جميعها تطلّ على نافورة واحدة. الطراز مغربي-أوروبي: تصاميم أوروبية ترتدي أقواسًا مغربية وقرميدًا أخضر. عند الغسق تضيء النافورة وتتحول الساحة كلها إلى متنزه عائلي.",
    },
    tip: {
      en: "The fountain show runs after dark. Stand on the post office side: the facades light better from there.",
      fr: "Le spectacle de la fontaine a lieu à la nuit tombée. Placez-vous côté poste : les façades s'y éclairent mieux.",
      ar: "يبدأ عرض النافورة بعد حلول الظلام. قف من جهة البريد، فالواجهات تبدو أجمل من هناك.",
    },
  },
  media: media("place-mohammed-v", "culture"),
  hero: false,
  signature: false,
  priority: 3,
  verification: "verified",
  availability: { status: "open" },
  sources: OSM,
  baseRouteIds: ["route-culture-heritage"],
};

const BOULEVARD_MOHAMMED_V: POI = {
  id: "poi-boulevard-mohammed-v",
  slug: "boulevard-mohammed-v",
  name: "Boulevard Mohammed V",
  localizedName: { fr: "Boulevard Mohammed V", ar: "شارع محمد الخامس" },
  city: "Casablanca",
  region: REGION,
  coordinates: { lat: 33.59445, lng: -7.61171 },
  coordinateType: "representative",
  categories: ["culture", "art_creative", "hidden_gems"],
  tags: ["art deco", "1920s facades", "arcades", "walking route", "downtown"],
  openingHours: null,
  baseDurationMinutes: 50,
  priceRange: "free",
  approxPriceMad: [0, 0],
  indoorOutdoor: "outdoor",
  walkingScore: 3,
  cultural: {
    story: {
      en: "Casablanca has more Art Deco than any city outside Miami, and most of it is on this one boulevard. Look up: wrought-iron balconies, stepped cornices, faded hotel signs from the 1920s. Ground floors have been renovated a dozen times; the upper storeys never were, which is exactly why they survive.",
      fr: "Casablanca possède plus d'Art déco que toute autre ville hors de Miami, et l'essentiel se trouve sur ce seul boulevard. Levez les yeux : balcons en fer forgé, corniches à redents, enseignes d'hôtels effacées des années 1920. Les rez-de-chaussée ont été refaits dix fois ; les étages jamais, et c'est exactement pour cela qu'ils tiennent encore.",
      ar: "في الدار البيضاء من عمارة الآرت ديكو أكثر مما في أي مدينة خارج ميامي، ومعظمها في هذا الشارع وحده. ارفع بصرك: شرفات من الحديد المطروق، وأفاريز متدرجة، ولافتات فنادق باهتة من العشرينيات. جُدّدت الطوابق الأرضية عشر مرات، أما العليا فلم تُمسّ، ولهذا بقيت.",
    },
    tip: {
      en: "Walk it from Place des Nations Unies towards the Marché Central and keep your eyes above the shop signs.",
      fr: "Parcourez-le de la place des Nations Unies vers le Marché Central, en regardant au-dessus des enseignes.",
      ar: "امشِ فيه من ساحة الأمم المتحدة نحو السوق المركزي، وأبقِ نظرك فوق لافتات المحلات.",
    },
  },
  media: media("boulevard-mohammed-v", "culture"),
  hero: false,
  signature: false,
  priority: 4,
  verification: "verified",
  availability: { status: "open" },
  sources: OSM,
  baseRouteIds: ["route-culture-heritage", "route-hidden-gems"],
};

const CORNICHE_AIN_DIAB: POI = {
  id: "poi-corniche-ain-diab",
  slug: "corniche-ain-diab",
  name: "Corniche Aïn Diab",
  localizedName: { fr: "Corniche d'Aïn Diab", ar: "كورنيش عين الذئاب" },
  city: "Casablanca",
  region: REGION,
  coordinates: { lat: 33.59609, lng: -7.66683 },
  coordinateType: "representative",
  categories: ["coast_nature", "food", "activities"],
  tags: ["atlantic promenade", "sunset", "beach clubs", "seafood", "joggers"],
  openingHours: null,
  baseDurationMinutes: 75,
  priceRange: "free",
  approxPriceMad: [0, 0],
  indoorOutdoor: "outdoor",
  walkingScore: 3,
  cultural: {
    story: {
      en: "Four kilometres of Atlantic between the El Hank lighthouse and Aïn Diab, and the closest thing Casablanca has to a public living room. Families walk it at sunset, runners take the seaward side, and the swell comes in hard enough that swimming is for the beach clubs, not the rocks. This is where the city goes to stop working.",
      fr: "Quatre kilomètres d'Atlantique entre le phare d'El Hank et Aïn Diab, et ce que Casablanca a de plus proche d'un salon public. Les familles s'y promènent au coucher du soleil, les coureurs prennent le côté mer, et la houle est assez forte pour que la baignade reste l'affaire des clubs de plage, pas des rochers. C'est ici que la ville cesse de travailler.",
      ar: "أربعة كيلومترات من الأطلسي بين منارة الحنك وعين الذئاب، وأقرب ما تملكه الدار البيضاء من صالون عمومي. تتنزه العائلات عند الغروب، ويأخذ العدّاؤون الجهة البحرية، والموج قوي بما يكفي ليبقى السباحة في نوادي الشاطئ لا فوق الصخور. هنا تتوقف المدينة عن العمل.",
    },
    tip: {
      en: "Start at the El Hank lighthouse end and walk west, so you finish facing the sunset instead of into it.",
      fr: "Commencez côté phare d'El Hank et marchez vers l'ouest : vous finissez face au coucher de soleil, sans l'avoir dans les yeux.",
      ar: "ابدأ من جهة منارة الحنك وامشِ غربًا، لتنهي المسير في مواجهة الغروب لا وأنت تسير نحوه.",
    },
  },
  media: media("corniche-ain-diab", "coast_nature"),
  hero: true,
  signature: true,
  priority: 4,
  verification: "verified",
  availability: { status: "open" },
  sources: OSM,
  baseRouteIds: ["route-coast-sunset", "route-best-of-region"],
};

const CINEMA_RIALTO: POI = {
  id: "poi-cinema-rialto",
  slug: "cinema-rialto",
  name: "Cinéma Rialto",
  localizedName: { fr: "Cinéma Rialto", ar: "سينما ريالتو" },
  city: "Casablanca",
  region: REGION,
  coordinates: { lat: 33.59439, lng: -7.61454 },
  coordinateType: "exact",
  categories: ["art_creative", "culture", "hidden_gems"],
  tags: ["1930 art deco", "still screening", "neon", "downtown", "single screen"],
  openingHours: hours("15:00", "23:00"),
  baseDurationMinutes: 45,
  priceRange: "0_30",
  approxPriceMad: null,
  indoorOutdoor: "indoor",
  walkingScore: 1,
  cultural: {
    story: {
      en: "Opened in 1930 and never converted into anything else: no shopping arcade, no car park. Josephine Baker sang here; so did Édith Piaf. It is one of the last single-screen cinemas in Morocco still selling tickets, and the ceiling is worth the price on its own.",
      fr: "Ouvert en 1930 et jamais transformé en autre chose : ni galerie marchande, ni parking. Joséphine Baker y a chanté, Édith Piaf aussi. C'est l'une des dernières salles uniques du Maroc à vendre encore des billets, et le plafond vaut à lui seul le prix de l'entrée.",
      ar: "افتُتحت عام 1930 ولم تُحوَّل قط إلى شيء آخر: لا رواق تجاري ولا موقف سيارات. غنّت فيها جوزفين بيكر، وكذلك إديت بياف. إنها من آخر قاعات السينما ذات الشاشة الواحدة في المغرب التي ما زالت تبيع التذاكر، والسقف وحده يستحق ثمن التذكرة.",
    },
    tip: {
      en: "Programming is irregular. Look at the hand-painted board by the door rather than any website.",
      fr: "La programmation est irrégulière. Fiez-vous au panneau peint à la main près de la porte plutôt qu'à un site web.",
      ar: "البرمجة غير منتظمة. اعتمد على اللوحة المرسومة يدويًا قرب الباب لا على أي موقع إلكتروني.",
    },
  },
  media: media("cinema-rialto", "art_creative"),
  hero: false,
  signature: false,
  priority: 3,
  verification: "needs_verification",
  availability: {
    status: "open",
    note: {
      en: "Screening times vary week to week and the hall occasionally closes for events.",
      fr: "Les horaires de séance varient d'une semaine à l'autre et la salle ferme parfois pour des événements.",
      ar: "تتغير مواعيد العروض من أسبوع لآخر، وتُغلق القاعة أحيانًا لإقامة فعاليات.",
    },
  },
  sources: OSM,
  baseRouteIds: ["route-hidden-gems"],
};

/** Casablanca, excluding the four golden fixtures. */
/* ---------------------------------------------------------------------------
 * Coast, green space and things to do.
 *
 * Added because the dataset could not answer two of the six interests: a traveller who
 * picked "Activities" got a day matching 1 stop in 4, and "Coast & nature" 2 in 4 — in a
 * city on the Atlantic. These five are well-known Casablanca places, but unlike the
 * entries above their coordinates were NOT resolved against OSM in-session: they are
 * `representative` anchors carrying `needs_verification`, exactly as this file's header
 * requires, and a human should confirm each one (and the Sindibad admission) before the
 * demo. No `sources: OSM` on them, because that claim would not be true.
 * ------------------------------------------------------------------------- */

const PLAGE_AIN_DIAB: POI = {
  id: "poi-plage-ain-diab",
  slug: "plage-ain-diab",
  name: "Plage Aïn Diab",
  localizedName: { fr: "Plage d'Aïn Diab", ar: "شاطئ عين الذئاب" },
  city: "Casablanca",
  region: REGION,
  coordinates: { lat: 33.59281, lng: -7.68124 },
  coordinateType: "representative",
  categories: ["coast_nature", "activities", "food"],
  tags: ["atlantic", "swimming", "surf break", "beach football", "sunset"],
  openingHours: null,
  baseDurationMinutes: 90,
  priceRange: "free",
  approxPriceMad: [0, 0],
  indoorOutdoor: "outdoor",
  walkingScore: 2,
  cultural: {
    story: {
      en: "The city's own beach, and the one place where Casablanca stops being a business capital for a few hours. On a summer evening the sand fills with football games that use flip-flops for goalposts, families carrying tea in thermoses, and beginner surfers queuing for the soft break at the western end.",
      fr: "La plage de la ville, le seul endroit où Casablanca cesse d'être une capitale d'affaires pendant quelques heures. Un soir d'été, le sable se remplit de matchs de football aux buts marqués par des sandales, de familles portant le thé en thermos, et de surfeurs débutants attendant la vague douce du bout ouest.",
      ar: "شاطئ المدينة، والمكان الوحيد الذي تتوقف فيه الدار البيضاء عن كونها عاصمة للأعمال بضع ساعات. في أمسية صيفية يمتلئ الرمل بمباريات كرة قدم مرماها نعال، وعائلات تحمل الشاي في الترامس، ومبتدئين ينتظرون الموجة الهادئة في الطرف الغربي.",
    },
    tip: {
      en: "The water is cleanest and the crowd thinnest before 11:00; the surf schools at the western end rent boards by the hour.",
      fr: "L'eau est la plus propre et la foule la plus rare avant 11h ; les écoles de surf du bout ouest louent des planches à l'heure.",
      ar: "الماء أنظف والزحام أقل قبل الحادية عشرة، ومدارس ركوب الأمواج في الطرف الغربي تكري الألواح بالساعة.",
    },
  },
  media: media("plage-ain-diab", "coast_nature"),
  hero: true,
  signature: false,
  priority: 4,
  verification: "needs_verification",
  availability: { status: "open" },
  baseRouteIds: ["route-coast-sunset"],
};

const PHARE_EL_HANK: POI = {
  id: "poi-phare-el-hank",
  slug: "phare-el-hank",
  name: "Phare d'El Hank",
  localizedName: { fr: "Phare d'El Hank", ar: "منارة الحنك" },
  city: "Casablanca",
  region: REGION,
  coordinates: { lat: 33.60893, lng: -7.64704 },
  coordinateType: "representative",
  categories: ["coast_nature", "hidden_gems", "culture"],
  tags: ["lighthouse", "rocky point", "atlantic", "1916", "viewpoint"],
  openingHours: null,
  baseDurationMinutes: 40,
  priceRange: "free",
  approxPriceMad: [0, 0],
  indoorOutdoor: "outdoor",
  walkingScore: 2,
  cultural: {
    story: {
      en: "A working lighthouse from 1916, standing on the rocky shoulder that separates the port from the beaches. Almost nobody comes here, which is the point: the rocks below it are where Casablancais fish, and on a clear evening you can see the whole arc of the coast from the mosque's minaret to Aïn Diab.",
      fr: "Un phare en activité depuis 1916, dressé sur l'épaule rocheuse qui sépare le port des plages. Presque personne n'y vient, et c'est tout l'intérêt : les rochers en contrebas sont ceux où pêchent les Casablancais, et par temps clair on voit tout l'arc de la côte, du minaret de la mosquée à Aïn Diab.",
      ar: "منارة عاملة منذ 1916، قائمة على الكتف الصخري الذي يفصل الميناء عن الشواطئ. لا يكاد يقصدها أحد، وهنا فتنتها: الصخور تحتها مقصد صيادي الدار البيضاء، وفي أمسية صافية ترى قوس الساحل كله من مئذنة المسجد إلى عين الذئاب.",
    },
    tip: {
      en: "The tower itself is not open to visitors. Come for the rocks and the view, and stay for the light going down over the water.",
      fr: "La tour ne se visite pas : venez pour les rochers et la vue, et restez pour la lumière qui descend sur l'eau.",
      ar: "البرج نفسه غير مفتوح للزيارة، فتعال للصخور وللمنظر، وابقَ للضوء وهو ينزل على الماء.",
    },
  },
  media: media("phare-el-hank", "coast_nature"),
  hero: false,
  signature: false,
  priority: 3,
  verification: "needs_verification",
  availability: { status: "open" },
  baseRouteIds: ["route-coast-sunset"],
};

const PARC_LIGUE_ARABE: POI = {
  id: "poi-parc-ligue-arabe",
  slug: "parc-ligue-arabe",
  name: "Parc de la Ligue Arabe",
  localizedName: { fr: "Parc de la Ligue Arabe", ar: "حديقة الجامعة العربية" },
  city: "Casablanca",
  region: REGION,
  coordinates: { lat: 33.58796, lng: -7.62486 },
  coordinateType: "representative",
  categories: ["coast_nature", "culture", "hidden_gems"],
  tags: ["palm alleys", "city park", "shade", "art deco edge", "benches"],
  openingHours: null,
  baseDurationMinutes: 45,
  priceRange: "free",
  approxPriceMad: [0, 0],
  indoorOutdoor: "outdoor",
  walkingScore: 2,
  cultural: {
    story: {
      en: "The green room at the centre of the city: long alleys of palms laid out when Casablanca was being drawn from scratch, with the white shell of the old Sacré-Cœur church closing one end. It is where the city comes to sit down: students between classes, grandfathers with newspapers, nobody in a hurry.",
      fr: "Le salon vert au centre de la ville : de longues allées de palmiers tracées quand Casablanca se dessinait de zéro, avec la coque blanche de l'ancienne église du Sacré-Cœur pour fermer une extrémité. C'est ici que la ville vient s'asseoir : étudiants entre deux cours, grands-pères et journaux, personne qui se presse.",
      ar: "الغرفة الخضراء في قلب المدينة: ممرات طويلة من النخيل رُسمت حين كانت الدار البيضاء تُخطَّط من الصفر، وتغلق أحد طرفيها الصدفة البيضاء لكنيسة القلب المقدس القديمة. هنا تأتي المدينة لتجلس: طلبة بين حصتين، وجدود بجرائدهم، ولا أحد في عجلة.",
    },
    tip: {
      en: "Cross it on the way between Sacré-Cœur and the boulevard. It is the shaded route, and it costs you nothing in time.",
      fr: "Traversez-le entre le Sacré-Cœur et le boulevard : c'est l'itinéraire ombragé, et il ne coûte aucun temps.",
      ar: "اعبرها في الطريق بين القلب المقدس والشارع الكبير، فهي المسار المظلل ولا تكلفك وقتًا.",
    },
  },
  media: media("parc-ligue-arabe", "coast_nature"),
  hero: false,
  signature: false,
  priority: 3,
  verification: "needs_verification",
  availability: { status: "open" },
  baseRouteIds: ["route-hidden-gems"],
};

const MARINA_CASABLANCA: POI = {
  id: "poi-marina-casablanca",
  slug: "marina-casablanca",
  name: "Marina de Casablanca",
  localizedName: { fr: "Marina de Casablanca", ar: "مارينا الدار البيضاء" },
  city: "Casablanca",
  region: REGION,
  coordinates: { lat: 33.60548, lng: -7.61703 },
  coordinateType: "representative",
  categories: ["activities", "food", "coast_nature"],
  tags: ["waterfront", "boats", "promenade", "cafés", "harbour walk"],
  openingHours: null,
  baseDurationMinutes: 60,
  priceRange: "free",
  approxPriceMad: [0, 0],
  indoorOutdoor: "outdoor",
  walkingScore: 2,
  cultural: {
    story: {
      en: "The newest piece of Casablanca, built on reclaimed water between the port and the great mosque. Whatever you make of the towers, the walk is the reward: a flat kilometre of quay with moored boats on one side and, at the far end, the minaret rising straight out of the Atlantic.",
      fr: "Le morceau le plus récent de Casablanca, bâti sur l'eau gagnée entre le port et la grande mosquée. Quoi qu'on pense des tours, la promenade est la récompense : un kilomètre plat de quai, les bateaux amarrés d'un côté et, tout au bout, le minaret qui sort droit de l'Atlantique.",
      ar: "أحدث قطعة في الدار البيضاء، شُيدت على ماء مستصلح بين الميناء والمسجد الكبير. مهما رأيت في الأبراج، فالمشي هو المكافأة: كيلومتر مستوٍ من الرصيف، القوارب راسية في جانب، وفي آخره المئذنة تنهض من الأطلسي مباشرة.",
    },
    tip: {
      en: "Walk it towards the mosque, not away from it: the minaret grows the whole way and lands you at the esplanade.",
      fr: "Parcourez-la vers la mosquée, pas dans l'autre sens : le minaret grandit tout du long et vous dépose sur l'esplanade.",
      ar: "امشِ في اتجاه المسجد لا عكسه، فالمئذنة تكبر طوال الطريق وتُنزلك عند الساحة.",
    },
  },
  media: media("marina-casablanca", "activities"),
  hero: false,
  signature: false,
  priority: 3,
  verification: "needs_verification",
  availability: { status: "open" },
  baseRouteIds: ["route-coast-sunset"],
};

const SINDIBAD_PARK: POI = {
  id: "poi-sindibad-park",
  slug: "sindibad-park",
  name: "Sindibad Park",
  localizedName: { fr: "Parc Sindibad", ar: "حديقة السندباد" },
  city: "Casablanca",
  region: REGION,
  coordinates: { lat: 33.55704, lng: -7.69052 },
  coordinateType: "representative",
  categories: ["activities", "hidden_gems"],
  tags: ["theme park", "rides", "families", "atlantic side", "half day"],
  openingHours: hours("10:00", "19:00"),
  baseDurationMinutes: 120,
  /* Admission is a band, not a figure: no `approxPriceMad` until someone confirms the
     current ticket. The metrics module prices it from the band instead of guessing. */
  priceRange: "60_150",
  indoorOutdoor: "outdoor",
  walkingScore: 3,
  cultural: {
    story: {
      en: "Casablanca's amusement park, on the Atlantic side of the city where the built-up streets finally give out. It began life as the municipal zoo and was rebuilt as a theme park; it is the one stop in this dataset that exists purely so a day can include something for children.",
      fr: "Le parc d'attractions de Casablanca, du côté atlantique de la ville, là où les rues bâties s'arrêtent enfin. Il a commencé comme zoo municipal avant d'être reconstruit en parc à thèmes ; c'est la seule étape de ce jeu de données qui existe uniquement pour qu'une journée puisse contenir quelque chose pour les enfants.",
      ar: "مدينة الملاهي في الدار البيضاء، في الجهة الأطلسية حيث تنتهي الشوارع المبنية أخيرًا. بدأت حديقةَ حيوان بلدية ثم أُعيد بناؤها منتزهًا ترفيهيًا، وهي المحطة الوحيدة هنا الموجودة أساسًا كي يتضمن اليوم شيئًا للأطفال.",
    },
    tip: {
      en: "Half a day at least, and it sits well outside the centre. Pair it with the corniche rather than with the medina.",
      fr: "Une demi-journée au minimum, et c'est loin du centre : associez-le à la corniche plutôt qu'à la médina.",
      ar: "نصف يوم على الأقل، وهي بعيدة عن المركز، فاجمعها مع الكورنيش لا مع المدينة القديمة.",
    },
  },
  media: media("sindibad-park", "activities"),
  hero: false,
  signature: false,
  priority: 3,
  verification: "needs_verification",
  availability: { status: "open" },
  baseRouteIds: [],
};


const CASABLANCA_SOURCE: POI[] = [
  ANCIENNE_MEDINA,
  LA_SQALA,
  MUSEE_JUDAISME,
  FONDATION_SLAOUI,
  VILLA_DES_ARTS,
  PLACE_MOHAMMED_V,
  BOULEVARD_MOHAMMED_V,
  CORNICHE_AIN_DIAB,
  CINEMA_RIALTO,
  PLAGE_AIN_DIAB,
  PHARE_EL_HANK,
  PARC_LIGUE_ARABE,
  MARINA_CASABLANCA,
  SINDIBAD_PARK,
];

/**
 * Exported through the content layer, so the narrative carries every language we
 * have a translation for. Nothing else about these objects changes.
 */
export const CASABLANCA_POIS: POI[] = CASABLANCA_SOURCE.map(localizePoi);
