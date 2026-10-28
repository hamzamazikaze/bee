/**
 * Curated MVP experiences — the half of the dataset that is people rather than places.
 *
 * DATA HONESTY. These are our own curated MVP entries, not commercial agreements. Every
 * one carries `partnerStatus: "demo"` and `verification: "unverified"`, and their
 * coordinates are `representative` — anchored on the real neighbourhood the experience
 * belongs to, never a fabricated street address. A host we have not met is described by
 * their role ("a local leather artisan"), never given an invented name. When a partner
 * actually signs, flip `partnerStatus` to `"confirmed"`, set the real coordinates and
 * raise `verification`. Nothing else needs to change.
 *
 * No record names a host. The cooking experience once did — image/link research (30 Aug
 * 2026) found no reliable evidence of a Casablanca cooking workshop under that name, so it
 * became "a local family" like every other entry. A name goes back in only when a real,
 * contactable person has agreed to it.
 *
 * Durations are the real length of the activity, because the scheduler uses them: a
 * 105-minute cooking class occupies 105 minutes of the day, not a POI-shaped 60.
 *
 * `displayName.en` starts lower-case on purpose: every use is inside a sentence — "With a
 * local family" — and the capitalised form put a stray "A" mid-line on the one card the
 * demo lingers on.
 */
import { REGION, hours, media } from "@/data/poi-utils";
import type { POI } from "@/types/poi";
import { localizePoi } from "./content";

/** The Habous quarter — where the artisan workshops actually are. */
const HABOUS = { lat: 33.5776, lng: -7.6058 };

/*
 * The other towns, anchored the same way: each experience sits on the coordinate the
 * curated place of that town already uses, because that is the neighbourhood it belongs
 * to and we have no street address we could honestly claim.
 */
const AZEMMOUR = { lat: 33.29046, lng: -8.34122 };
const MOHAMMEDIA = { lat: 33.699, lng: -7.38924 };
const BOULAOUANE = { lat: 32.85689, lng: -8.02003 };
const EL_JADIDA = { lat: 33.2568, lng: -8.50233 };
const OUALIDIA = { lat: 32.7419, lng: -9.03985 };

const EXPERIENCES_SOURCE: POI[] = [
  {
    id: "exp-cooking-mi-naima",
    slug: "cooking-mi-naima",
    name: "Cook Moroccan with a Local Family",
    localizedName: {
      fr: "Cuisine marocaine avec une famille locale",
      ar: "الطبخ المغربي مع عائلة محلية",
    },
    city: "Casablanca",
    region: REGION,
    coordinates: { lat: 33.5822, lng: -7.6094 },
    coordinateType: "representative",
    categories: ["food", "culture", "hidden_gems"],
    kind: "food_experience",
    experience: {
      // Not yet a named partner: the role, not an invented person.
      host: {
        name: "Local family",
        displayName: { en: "a local family", fr: "Une famille locale", ar: "عائلة محلية" },
      },
      capacity: 8,
      bookingRequired: true,
      price: { amount: 250, currency: "MAD" },
      includes: [
        {
          en: "Market shopping for the day's ingredients",
          fr: "Courses au marché pour les ingrédients du jour",
          ar: "التسوق من السوق لمكونات اليوم",
        },
        {
          en: "Cook a tajine and Moroccan salads together",
          fr: "Cuisinez un tajine et des salades marocaines ensemble",
          ar: "طبخ طاجين وسلطات مغربية معًا",
        },
        {
          en: "Eat what you made, with mint tea",
          fr: "Dégustez ce que vous avez préparé, avec un thé à la menthe",
          ar: "تناول ما طبخته مع الشاي بالنعناع",
        },
      ],
      skills: [
        { en: "Spice blending", fr: "Mélange d'épices", ar: "خلط التوابل" },
        { en: "Tajine technique", fr: "Technique du tajine", ar: "تقنية الطاجين" },
        { en: "Mint tea ritual", fr: "Rituel du thé à la menthe", ar: "طقوس الشاي بالنعناع" },
      ],
      discount: { percent: 10, minimumCoins: 300 },
      partnerStatus: "demo",
      partnerType: "local_host",
      supportsLocalBusiness: true,
    },
    tags: ["tajine", "home cooking", "mint tea", "local host", "spices"],
    openingHours: hours("10:00", "19:00"),
    baseDurationMinutes: 105,
    priceRange: "150_300",
    approxPriceMad: [250, 250],
    indoorOutdoor: "indoor",
    walkingScore: 1,
    cultural: {
      story: {
        en: "A Moroccan kitchen is not a room, it is a conversation. You arrive, you are handed a knife, and somewhere between the onions and the first glass of tea you stop being a visitor. The dish matters less than the two hours around it.",
        fr: "Une cuisine marocaine n'est pas une pièce, c'est une conversation. On vous tend un couteau, et quelque part entre les oignons et le premier verre de thé, vous cessez d'être un visiteur. Le plat compte moins que les deux heures autour.",
        ar: "المطبخ المغربي ليس غرفة، بل حديث. تصل، يُناولونك سكينًا، وبين البصل وأول كأس شاي تتوقف عن كونك زائرًا. الطبق أقل أهمية من الساعتين حوله.",
      },
      tip: {
        en: "Come hungry and say yes to the second glass of tea: refusing the first pour is the only real mistake.",
        fr: "Venez le ventre vide et acceptez le deuxième verre de thé : refuser le premier service est la seule vraie erreur.",
        ar: "تعال جائعًا وقل نعم للكأس الثاني من الشاي، فرفض الصبّة الأولى هو الخطأ الوحيد.",
      },
    },
    media: media("cooking-mi-naima", "food"),
    hero: true,
    signature: false,
    priority: 5,
    verification: "unverified",
    availability: {
      status: "open",
      note: {
        en: "Curated Khotwa experience. Booking is arranged directly with the host.",
        fr: "Expérience Khotwa curatée. La réservation se fait directement avec l'hôte.",
        ar: "تجربة خطوة منسقة. الحجز يتم مباشرة مع المضيف.",
      },
    },
  },

  {
    id: "exp-leather-bag",
    slug: "leather-bag-workshop",
    name: "Make Your Own Leather Bag",
    localizedName: {
      fr: "Créez votre sac en cuir marocain",
      ar: "اصنع حقيبتك الجلدية المغربية",
    },
    city: "Casablanca",
    region: REGION,
    coordinates: { lat: HABOUS.lat - 0.0011, lng: HABOUS.lng - 0.0013 },
    coordinateType: "representative",
    categories: ["art_creative", "culture", "hidden_gems"],
    kind: "workshop",
    experience: {
      // Not yet a named partner: the role, not an invented person.
      host: {
        name: "Local leather artisan",
        displayName: {
          en: "a local leather artisan",
          fr: "Un artisan maroquinier local",
          ar: "حرفي جلد محلي",
        },
      },
      capacity: 6,
      bookingRequired: true,
      price: { amount: 180, currency: "MAD" },
      includes: [
        {
          en: "Choose your leather and colours",
          fr: "Choisissez votre cuir et vos couleurs",
          ar: "اختر الجلد والألوان",
        },
        { en: "Cutting and stitching", fr: "Découpe et couture", ar: "القص والخياطة" },
        {
          en: "Personalise it with your initials",
          fr: "Personnalisez-le avec vos initiales",
          ar: "خصّصها بأحرفك الأولى",
        },
        { en: "Take the bag home", fr: "Repartez avec votre sac", ar: "خذ الحقيبة معك" },
      ],
      skills: [
        { en: "Cutting", fr: "Découpe", ar: "القص" },
        { en: "Saddle stitching", fr: "Couture sellier", ar: "خياطة السراج" },
        { en: "Finishing", fr: "Finition", ar: "التشطيب" },
      ],
      discount: { percent: 10, minimumCoins: 200 },
      partnerStatus: "demo",
      partnerType: "artisan",
      supportsLocalBusiness: true,
    },
    tags: ["leather", "craft", "handmade", "artisan", "take home"],
    openingHours: hours("09:30", "18:30", { closed: [5] }),
    baseDurationMinutes: 75,
    priceRange: "150_300",
    approxPriceMad: [180, 180],
    indoorOutdoor: "indoor",
    walkingScore: 1,
    cultural: {
      story: {
        en: "Moroccan leather is older than the country's borders. The tanneries still work the way they did in the twelfth century, and the workshops around the Habous still cut by eye. You will not be good at it in an hour, and that is rather the point of watching someone who has done it for thirty years.",
        fr: "Le cuir marocain est plus ancien que les frontières du pays. Les tanneries travaillent comme au XIIe siècle, et les ateliers autour des Habous coupent encore à l'œil. Vous ne serez pas bon en une heure, et c'est justement l'intérêt de regarder quelqu'un qui le fait depuis trente ans.",
        ar: "الجلد المغربي أقدم من حدود البلاد. لا تزال المدابغ تعمل كما في القرن الثاني عشر، وورشات الأحباس تقطع بالعين. لن تتقنه في ساعة، وهذا بالضبط معنى مشاهدة من يمارسه منذ ثلاثين سنة.",
      },
      tip: {
        en: "Wear something you do not mind marking. Leather dye is honest about where you have been.",
        fr: "Portez des vêtements que vous pouvez tacher. La teinture du cuir est franche sur vos allées et venues.",
        ar: "البس ما لا تخشى تلطيخه. صبغة الجلد صادقة بشأن أين كنت.",
      },
    },
    media: media("leather-bag-workshop", "art_creative"),
    hero: true,
    signature: false,
    priority: 5,
    verification: "unverified",
    availability: {
      status: "open",
      note: {
        en: "Curated Khotwa experience. Booking is arranged directly with the artisan.",
        fr: "Expérience Khotwa curatée. La réservation se fait directement avec l'artisan.",
        ar: "تجربة خطوة منسقة. الحجز يتم مباشرة مع الحرفي.",
      },
    },
  },

  {
    id: "exp-habous-artisans",
    slug: "habous-artisan-walk",
    name: "Meet the Habous Artisans",
    localizedName: {
      fr: "À la rencontre des artisans des Habous",
      ar: "لقاء حرفيي الأحباس",
    },
    city: "Casablanca",
    region: REGION,
    coordinates: { lat: HABOUS.lat + 0.0008, lng: HABOUS.lng + 0.0006 },
    coordinateType: "representative",
    categories: ["hidden_gems", "culture", "art_creative"],
    kind: "local_activity",
    experience: {
      host: {
        name: "Local guide",
        displayName: { en: "a neighbourhood guide", fr: "Un guide du quartier", ar: "مرشد من الحي" },
      },
      capacity: 10,
      bookingRequired: false,
      price: { amount: 80, currency: "MAD" },
      includes: [
        {
          en: "Three workshops most visitors walk past",
          fr: "Trois ateliers devant lesquels les visiteurs passent sans s'arrêter",
          ar: "ثلاث ورشات يمر بها الزوار دون توقف",
        },
        { en: "Mint tea with a maker", fr: "Thé à la menthe avec un artisan", ar: "شاي بالنعناع مع صانع" },
      ],
      partnerStatus: "demo",
      partnerType: "guide",
      supportsLocalBusiness: true,
    },
    tags: ["artisan", "habous", "workshops", "local life", "tea"],
    openingHours: hours("09:00", "19:00"),
    baseDurationMinutes: 60,
    priceRange: "60_150",
    approxPriceMad: [80, 80],
    indoorOutdoor: "mixed",
    walkingScore: 2,
    cultural: {
      story: {
        en: "The Habous was drawn on paper in the 1930s, but the trades inside it were not. Behind the arcades the same families still cut, stitch, carve and bind; most visitors photograph the arches and miss the workshops entirely.",
        fr: "Les Habous ont été dessinés sur plan dans les années 1930, mais pas les métiers qui les habitent. Derrière les arcades, les mêmes familles coupent, cousent, sculptent et relient ; la plupart des visiteurs photographient les arcs sans voir les ateliers.",
        ar: "رُسم حي الأحباس على الورق في الثلاثينيات، لكن الحرف داخله لا. خلف الأروقة ما زالت العائلات نفسها تقطع وتخيط وتنقش وتجلّد، ومعظم الزوار يصورون الأقواس ويفوتون الورشات.",
      },
      tip: {
        en: "Go before 11:00. The makers are working, not selling, and that is when you actually see something.",
        fr: "Allez-y avant 11h. Les artisans travaillent au lieu de vendre : c'est là qu'on voit vraiment quelque chose.",
        ar: "اذهب قبل الحادية عشرة. الصنّاع يعملون لا يبيعون، وحينها ترى شيئًا حقيقيًا.",
      },
    },
    media: media("habous-artisan-walk", "hidden_gems"),
    hero: false,
    signature: false,
    priority: 4,
    verification: "unverified",
    availability: { status: "open" },
  },

  {
    id: "exp-tea-ritual",
    slug: "moroccan-tea-ritual",
    name: "The Moroccan Tea Ritual",
    localizedName: { fr: "Le rituel du thé marocain", ar: "طقوس الشاي المغربي" },
    city: "Casablanca",
    region: REGION,
    coordinates: { lat: 33.5934, lng: -7.6183 },
    coordinateType: "representative",
    categories: ["food", "culture"],
    kind: "food_experience",
    experience: {
      host: {
        name: "Local host",
        displayName: { en: "a local host", fr: "Un hôte local", ar: "مضيف محلي" },
      },
      capacity: 12,
      bookingRequired: false,
      price: { amount: 60, currency: "MAD" },
      includes: [
        { en: "Pour it yourself, from height", fr: "Versez vous-même, de haut", ar: "اسكب بنفسك من علوّ" },
        {
          en: "Three glasses, three strengths",
          fr: "Trois verres, trois forces",
          ar: "ثلاثة كؤوس، ثلاث درجات",
        },
        { en: "Seasonal pastries", fr: "Pâtisseries de saison", ar: "حلويات موسمية" },
      ],
      discount: { amountMAD: 20, minimumCoins: 120 },
      partnerStatus: "demo",
      partnerType: "food",
      supportsLocalBusiness: true,
    },
    tags: ["mint tea", "pastries", "ritual", "hospitality"],
    openingHours: hours("10:00", "22:00"),
    baseDurationMinutes: 45,
    priceRange: "30_60",
    approxPriceMad: [60, 60],
    indoorOutdoor: "indoor",
    walkingScore: 1,
    cultural: {
      story: {
        en: "The first glass is bitter as life, the second sweet as love, the third gentle as death; so the saying goes, and every Moroccan will tell you a slightly different version. What does not vary is that you pour from height, and that refusing is not really an option.",
        fr: "Le premier verre est amer comme la vie, le deuxième doux comme l'amour, le troisième léger comme la mort, dit le proverbe, et chaque Marocain vous en donnera une version différente. Ce qui ne change pas : on verse de haut, et refuser n'est pas vraiment une option.",
        ar: "الكأس الأول مرّ كالحياة، والثاني حلو كالحب، والثالث لطيف كالموت، هكذا يقال، وكل مغربي يرويها بصيغة مختلفة قليلًا. ما لا يتغير أنك تسكب من علوّ، وأن الرفض ليس خيارًا حقًا.",
      },
      tip: {
        en: "The height of the pour is not showmanship: it aerates the tea. Try it and you will taste the difference.",
        fr: "La hauteur du versement n'est pas du spectacle : elle aère le thé. Essayez, vous sentirez la différence.",
        ar: "علوّ الصبّ ليس استعراضًا، بل تهوية للشاي. جرّب وستتذوق الفرق.",
      },
    },
    media: media("moroccan-tea-ritual", "food"),
    hero: false,
    signature: false,
    priority: 3,
    verification: "unverified",
    availability: { status: "open" },
  },

  {
    id: "exp-pottery-eljadida",
    slug: "pottery-el-jadida",
    name: "Throw a Pot by the Ocean",
    localizedName: {
      fr: "Tournez votre poterie face à l'océan",
      ar: "اصنع فخارك أمام المحيط",
    },
    city: "El Jadida",
    region: REGION,
    coordinates: { lat: 33.2565, lng: -8.5045 },
    coordinateType: "representative",
    categories: ["art_creative", "hidden_gems", "activities"],
    kind: "workshop",
    experience: {
      host: {
        name: "Local ceramicist",
        displayName: { en: "a local ceramicist", fr: "Un céramiste local", ar: "خزّاف محلي" },
      },
      capacity: 6,
      bookingRequired: true,
      price: { min: 140, max: 200, currency: "MAD" },
      includes: [
        { en: "Wheel time with a maker", fr: "Tour de potier accompagné", ar: "وقت على الدولاب مع صانع" },
        { en: "Glaze your piece", fr: "Émaillez votre pièce", ar: "تزجيج قطعتك" },
        {
          en: "Collected or shipped once fired",
          fr: "À récupérer ou expédié après cuisson",
          ar: "تُستلم أو تُشحن بعد الحرق",
        },
      ],
      partnerStatus: "demo",
      partnerType: "artisan",
      supportsLocalBusiness: true,
    },
    tags: ["pottery", "ceramics", "wheel", "atlantic", "craft"],
    openingHours: hours("10:00", "18:00", { closed: [1] }),
    baseDurationMinutes: 90,
    priceRange: "150_300",
    approxPriceMad: [140, 200],
    indoorOutdoor: "mixed",
    walkingScore: 1,
    cultural: {
      story: {
        en: "Clay on this coast carries iron from the Doukkala plain, which is why local pieces fire warmer than the grey of the north. A wheel is unforgiving for about twenty minutes and then, quite suddenly, it is not.",
        fr: "L'argile de cette côte contient le fer de la plaine des Doukkala : les pièces locales cuisent plus chaudes que le gris du nord. Un tour est impitoyable une vingtaine de minutes, puis, d'un coup, il ne l'est plus.",
        ar: "طين هذا الساحل يحمل حديد سهل دكالة، ولذلك تُحرق القطع المحلية أدفأ من رمادي الشمال. الدولاب قاسٍ نحو عشرين دقيقة، ثم فجأة لم يعد كذلك.",
      },
      tip: {
        en: "Keep your hands wetter than feels sensible. Everyone's first pot collapses; that is the tuition.",
        fr: "Gardez les mains plus mouillées qu'il ne semble raisonnable. Le premier pot s'effondre toujours : c'est le prix de la leçon.",
        ar: "أبقِ يديك أكثر بللًا مما يبدو معقولًا. أول قطعة تنهار للجميع، وتلك هي الأجرة.",
      },
    },
    media: media("pottery-el-jadida", "art_creative"),
    hero: false,
    signature: false,
    priority: 4,
    verification: "unverified",
    availability: { status: "open" },
  },

  {
    id: "exp-oualidia-oysters",
    slug: "oualidia-oyster-tasting",
    name: "Oysters at the Lagoon",
    localizedName: {
      fr: "Dégustation d'huîtres à la lagune",
      ar: "تذوق المحار في البحيرة",
    },
    city: "Oualidia",
    region: REGION,
    coordinates: { lat: 32.7345, lng: -9.0345 },
    coordinateType: "representative",
    categories: ["food", "coast_nature", "hidden_gems"],
    kind: "food_experience",
    experience: {
      host: {
        name: "Oyster farming cooperative",
        displayName: {
          en: "an oyster-farming cooperative",
          fr: "Une coopérative ostréicole",
          ar: "تعاونية لتربية المحار",
        },
      },
      capacity: 15,
      bookingRequired: false,
      price: { amount: 120, currency: "MAD" },
      includes: [
        { en: "Walk the oyster beds", fr: "Parcours des parcs à huîtres", ar: "جولة في مزارع المحار" },
        {
          en: "A dozen, opened in front of you",
          fr: "Une douzaine, ouvertes devant vous",
          ar: "دزينة تُفتح أمامك",
        },
      ],
      partnerStatus: "demo",
      partnerType: "cooperative",
      supportsLocalBusiness: true,
    },
    tags: ["oysters", "lagoon", "atlantic", "cooperative", "tasting"],
    openingHours: hours("11:00", "18:00"),
    baseDurationMinutes: 60,
    priceRange: "60_150",
    approxPriceMad: [120, 120],
    indoorOutdoor: "outdoor",
    walkingScore: 2,
    cultural: {
      story: {
        en: "The Oualidia lagoon is a rare thing: a sheltered saltwater basin flushed twice a day by the Atlantic. Oysters have been farmed here since the 1950s, and the beds are worked by families rather than companies.",
        fr: "La lagune de Oualidia est une rareté : un bassin d'eau salée abrité, rincé deux fois par jour par l'Atlantique. On y élève des huîtres depuis les années 1950, et les parcs sont travaillés par des familles, pas des sociétés.",
        ar: "بحيرة الوليدية شيء نادر: حوض مالح محمي يغسله المحيط مرتين يوميًا. تُربّى فيه المحار منذ الخمسينيات، وتعمل في المزارع عائلات لا شركات.",
      },
      tip: {
        en: "Go at low tide: you can walk out to the beds, and the light on the lagoon is at its best.",
        fr: "Allez-y à marée basse : on peut marcher jusqu'aux parcs, et la lumière sur la lagune est à son meilleur.",
        ar: "اذهب عند الجزر، حيث يمكنك المشي إلى المزارع، وضوء البحيرة في أجمل حالاته.",
      },
    },
    media: media("oualidia-oyster-tasting", "food"),
    hero: false,
    signature: false,
    priority: 4,
    verification: "unverified",
    availability: { status: "seasonal" },
  },
  {
    id: "exp-azemmour-embroidery",
    slug: "azemmour-embroidery",
    name: "Learn the Azemmour Stitch",
    localizedName: {
      fr: "Apprendre la broderie d'Azemmour",
      ar: "تعلّم غرزة أزمور",
    },
    city: "Azemmour",
    region: REGION,
    coordinates: AZEMMOUR,
    coordinateType: "representative",
    categories: ["art_creative", "culture", "hidden_gems"],
    kind: "workshop",
    experience: {
      host: {
        name: "Local embroiderer",
        displayName: { en: "a local embroiderer", fr: "Une brodeuse locale", ar: "مطرّزة محلية" },
      },
      capacity: 5,
      bookingRequired: true,
      price: { amount: 120, currency: "MAD" },
      includes: [
        { en: "Count the grid on your own cloth", fr: "Compter la trame sur votre tissu", ar: "عدّ الخيوط على قماشك" },
        { en: "The two-sided stitch, worked slowly", fr: "Le point réversible, travaillé lentement", ar: "الغرزة ذات الوجهين، ببطء" },
        { en: "Keep the square you finish", fr: "Repartez avec votre carré", ar: "تحتفظ بالمربّع الذي أنهيته" },
      ],
      skills: [
        { en: "Reading a counted-thread pattern", fr: "Lire un motif compté", ar: "قراءة نقشة معدودة" },
      ],
      partnerStatus: "demo",
      partnerType: "artisan",
      supportsLocalBusiness: true,
    },
    tags: ["embroidery", "textile", "medina", "craft", "doukkala"],
    openingHours: hours("10:00", "17:00", { closed: [5] }),
    baseDurationMinutes: 90,
    priceRange: "60_150",
    approxPriceMad: [120, 120],
    indoorOutdoor: "indoor",
    walkingScore: 1,
    cultural: {
      story: {
        en: "Azemmour embroidery is worked from the count of the threads, not from a drawn line, and it reads the same on both faces of the cloth. The motifs — facing birds, a tree between them — arrived with the Renaissance and stayed here after they had gone out of fashion everywhere else.",
        fr: "La broderie d'Azemmour se travaille au compte des fils, jamais sur un tracé, et se lit à l'identique sur les deux faces. Les motifs — oiseaux affrontés, un arbre entre eux — sont venus avec la Renaissance et sont restés ici longtemps après avoir passé de mode ailleurs.",
        ar: "تُشتغل تطريزة أزمور بعدّ الخيوط لا على خطّ مرسوم، وتُقرأ نفسها على وجهَي القماش. أما الزخارف — طائران متقابلان وشجرة بينهما — فقد وصلت مع عصر النهضة وبقيت هنا بعدما خرجت من الموضة في كل مكان آخر.",
      },
      tip: {
        en: "Bring reading glasses if you use them. The count is fine work and the light in the medina is indirect.",
        fr: "Prenez vos lunettes si vous en portez. Le compte est un travail fin et la lumière de la médina est indirecte.",
        ar: "أحضر نظارتك إن كنت تستعملها. العدّ عمل دقيق وضوء المدينة غير مباشر.",
      },
    },
    media: media("azemmour-embroidery", "art_creative"),
    hero: false,
    signature: false,
    priority: 4,
    verification: "unverified",
    availability: { status: "open" },
  },
  {
    id: "exp-mohammedia-fish-grill",
    slug: "mohammedia-fish-grill",
    name: "Pick Your Fish at the Port",
    localizedName: {
      fr: "Choisir son poisson au port",
      ar: "اختر سمكك في الميناء",
    },
    city: "Mohammedia",
    region: REGION,
    coordinates: MOHAMMEDIA,
    coordinateType: "representative",
    categories: ["food", "coast_nature", "hidden_gems"],
    kind: "food_experience",
    experience: {
      host: {
        name: "Local fish grill",
        displayName: { en: "a portside grill", fr: "Un grill du port", ar: "شوّاي في الميناء" },
      },
      capacity: 8,
      bookingRequired: false,
      price: { min: 70, max: 130, currency: "MAD" },
      includes: [
        { en: "Choose from the morning landing", fr: "Choisir dans la pêche du matin", ar: "الاختيار من صيد الصباح" },
        { en: "Weighed, grilled, and eaten there", fr: "Pesé, grillé, mangé sur place", ar: "يُوزن ويُشوى ويُؤكل هناك" },
        { en: "Bread, salad and cumin", fr: "Pain, salade et cumin", ar: "خبز وسلطة وكمّون" },
      ],
      partnerStatus: "demo",
      partnerType: "food",
      supportsLocalBusiness: true,
    },
    tags: ["fish", "port", "grill", "atlantic", "sardines"],
    openingHours: hours("11:30", "20:00"),
    baseDurationMinutes: 75,
    priceRange: "60_150",
    approxPriceMad: [70, 130],
    indoorOutdoor: "outdoor",
    walkingScore: 2,
    cultural: {
      story: {
        en: "Mohammedia has been a fishing port far longer than it has been an oil town, and the grills beside the quay still work the way they always did: you buy the fish at one counter and carry it ten metres to the fire. Nothing on the menu is a menu.",
        fr: "Mohammedia fut un port de pêche bien avant d'être une ville pétrolière, et les grills du quai fonctionnent comme ils l'ont toujours fait : on achète le poisson à un comptoir et on le porte dix mètres plus loin, sur le feu. Rien ici ne s'appelle une carte.",
        ar: "كانت المحمدية ميناء صيد قبل أن تكون مدينة بترول بزمن طويل، وما تزال مشاوي الرصيف تشتغل كما كانت: تشتري السمك من طاولة وتحمله عشرة أمتار إلى النار. لا شيء هنا اسمه قائمة طعام.",
      },
      tip: {
        en: "Agree the price per kilo before the scale, and ask for it grilled rather than fried — the fire is the point.",
        fr: "Fixez le prix au kilo avant la balance, et demandez-le grillé plutôt que frit : c'est le feu qui compte.",
        ar: "اتفق على ثمن الكيلو قبل الميزان، واطلبه مشويًا لا مقليًا — النار هي المقصودة.",
      },
    },
    media: media("mohammedia-fish-grill", "food"),
    hero: false,
    signature: false,
    priority: 4,
    verification: "unverified",
    availability: { status: "open" },
  },
  {
    id: "exp-boulaouane-bread",
    slug: "boulaouane-bread",
    name: "Bread from the Village Oven",
    localizedName: {
      fr: "Le pain du four du village",
      ar: "خبز فرن القرية",
    },
    city: "Boulaouane",
    region: REGION,
    coordinates: BOULAOUANE,
    coordinateType: "representative",
    categories: ["food", "culture", "hidden_gems"],
    kind: "local_activity",
    experience: {
      host: {
        name: "Village household",
        displayName: { en: "a village household", fr: "Une maison du village", ar: "بيت من القرية" },
      },
      capacity: 6,
      bookingRequired: true,
      price: { amount: 80, currency: "MAD" },
      includes: [
        { en: "Shape the dough by hand", fr: "Façonner la pâte à la main", ar: "تشكيل العجين باليد" },
        { en: "Carry it to the communal oven", fr: "La porter au four communal", ar: "حملها إلى الفرن المشترك" },
        { en: "Eat it hot, with tea and oil", fr: "Le manger chaud, thé et huile", ar: "أكله ساخنًا مع الشاي والزيت" },
      ],
      partnerStatus: "demo",
      partnerType: "local_host",
      supportsLocalBusiness: true,
    },
    tags: ["bread", "ferran", "oum er-rbia", "rural", "tea"],
    openingHours: hours("09:00", "16:00"),
    baseDurationMinutes: 70,
    priceRange: "60_150",
    approxPriceMad: [80, 80],
    indoorOutdoor: "mixed",
    walkingScore: 2,
    cultural: {
      story: {
        en: "In villages along the Oum Er-Rbia the oven is shared, not owned. Households bring their own shaped loaves, each marked so it comes home to the right kitchen, and the man who keeps the fire knows every mark. It is the oldest piece of infrastructure most of these places have.",
        fr: "Dans les villages de l'Oum Er-Rbia, le four est partagé, non possédé. Chaque maison apporte ses pains façonnés, marqués pour rentrer dans la bonne cuisine, et celui qui tient le feu connaît toutes les marques. C'est la plus vieille infrastructure de ces villages.",
        ar: "في قرى أم الربيع، الفرن مشترك لا مملوك. كل بيت يجيء بخبزه المشكَّل، وعليه علامة ليعود إلى مطبخه، وحارس النار يعرف كل علامة. إنها أقدم بنية تحتية في هذه القرى.",
      },
      tip: {
        en: "The dough needs an hour to rest before it goes in, so this is a slow morning, not an errand.",
        fr: "La pâte repose une heure avant d'entrer au four : c'est une matinée lente, pas une course.",
        ar: "يحتاج العجين ساعة راحة قبل الفرن، فهذه صبيحة بطيئة لا مشوار عابر.",
      },
    },
    media: media("boulaouane-bread", "food"),
    hero: false,
    signature: false,
    priority: 3,
    verification: "unverified",
    availability: { status: "open" },
  },
  {
    id: "exp-eljadida-sardines",
    slug: "eljadida-sardines",
    name: "Sardines off the El Jadida Boats",
    localizedName: {
      fr: "Sardines à la sortie des barques",
      ar: "سردين من قوارب الجديدة",
    },
    city: "El Jadida",
    region: REGION,
    coordinates: EL_JADIDA,
    coordinateType: "representative",
    categories: ["food", "coast_nature", "hidden_gems"],
    kind: "food_experience",
    experience: {
      host: {
        name: "Portside cook",
        displayName: { en: "a portside cook", fr: "Un cuisinier du port", ar: "طبّاخ في الميناء" },
      },
      capacity: 8,
      bookingRequired: false,
      price: { min: 50, max: 90, currency: "MAD" },
      includes: [
        { en: "Sardines straight off the ice", fr: "Sardines sorties de la glace", ar: "سردين من الثلج مباشرة" },
        { en: "Grilled over charcoal, salt only", fr: "Grillées au charbon, sel seul", ar: "مشوي على الفحم، بالملح فقط" },
        { en: "Eaten standing, by the wall", fr: "Mangées debout, près du rempart", ar: "تُؤكل واقفًا قرب السور" },
      ],
      partnerStatus: "demo",
      partnerType: "food",
      supportsLocalBusiness: true,
    },
    tags: ["sardines", "port", "charcoal", "mazagan", "cheap eats"],
    openingHours: hours("12:00", "19:00"),
    baseDurationMinutes: 55,
    priceRange: "30_60",
    approxPriceMad: [50, 90],
    indoorOutdoor: "outdoor",
    walkingScore: 2,
    cultural: {
      story: {
        en: "Morocco lands more sardines than any country in the world, and almost none of that fish travels further than the nearest grill. A kilo here costs less than a coffee in the new town, and is eaten with bread, salt and nothing else at all.",
        fr: "Le Maroc débarque plus de sardines que n'importe quel pays au monde, et presque aucune ne voyage plus loin que le grill voisin. Le kilo coûte ici moins qu'un café en ville neuve, et se mange avec du pain, du sel, et rien d'autre.",
        ar: "يفرغ المغرب من السردين أكثر من أي بلد في العالم، ولا يكاد شيء منه يسافر أبعد من أقرب مشواة. الكيلو هنا أرخص من قهوة في المدينة الجديدة، ويُؤكل بالخبز والملح ولا شيء غيرهما.",
      },
      tip: {
        en: "Come when the boats are back, early afternoon. Later in the day the ice has been open too long.",
        fr: "Venez au retour des barques, en début d'après-midi. Plus tard, la glace est ouverte depuis trop longtemps.",
        ar: "تعال عند عودة القوارب، مطلع الزوال. بعد ذلك يكون الثلج قد فُتح منذ وقت طويل.",
      },
    },
    media: media("eljadida-sardines", "food"),
    hero: false,
    signature: false,
    priority: 4,
    verification: "unverified",
    availability: { status: "open" },
  },
  {
    id: "exp-oualidia-lagoon-morning",
    slug: "oualidia-lagoon-morning",
    name: "A Morning on the Lagoon",
    localizedName: {
      fr: "Une matinée sur la lagune",
      ar: "صباح على البحيرة",
    },
    city: "Oualidia",
    region: REGION,
    coordinates: OUALIDIA,
    coordinateType: "representative",
    categories: ["coast_nature", "activities", "hidden_gems"],
    kind: "local_activity",
    experience: {
      host: {
        name: "Lagoon fisherman",
        displayName: { en: "a lagoon fisherman", fr: "Un pêcheur de la lagune", ar: "صياد البحيرة" },
      },
      capacity: 4,
      bookingRequired: true,
      price: { amount: 150, currency: "MAD" },
      includes: [
        { en: "Out at low tide, in a flat boat", fr: "Sortie à marée basse, en barque plate", ar: "خروج في الجزر بقارب مسطّح" },
        { en: "How the nets and the tide agree", fr: "Comment la marée commande les filets", ar: "كيف تتفق الشباك مع المدّ" },
        { en: "Birds on the far bank, named", fr: "Les oiseaux de l'autre rive, nommés", ar: "طيور الضفة الأخرى بأسمائها" },
      ],
      partnerStatus: "demo",
      partnerType: "cooperative",
      supportsLocalBusiness: true,
    },
    tags: ["lagoon", "fishing", "birds", "tide", "boat"],
    openingHours: hours("07:30", "12:00"),
    baseDurationMinutes: 90,
    priceRange: "60_150",
    approxPriceMad: [150, 150],
    indoorOutdoor: "outdoor",
    walkingScore: 2,
    cultural: {
      story: {
        en: "The lagoon fills and empties twice a day through one narrow mouth, and everything here is arranged around that: when the nets go out, when the oyster beds are walkable, when the flamingos move to the far bank. A fisherman reads the water the way other people read a timetable.",
        fr: "La lagune se remplit et se vide deux fois par jour par une seule passe étroite, et tout ici s'organise autour de cela : l'heure des filets, l'heure où les parcs à huîtres se marchent, l'heure où les flamants passent sur l'autre rive. Un pêcheur lit l'eau comme d'autres lisent un horaire.",
        ar: "تمتلئ البحيرة وتفرغ مرتين في اليوم عبر فم ضيق واحد، وكل شيء هنا منظَّم على ذلك: متى تخرج الشباك، ومتى يمكن المشي في مزارع المحار، ومتى ينتقل النحام إلى الضفة البعيدة. الصياد يقرأ الماء كما يقرأ غيره جدول مواعيد.",
      },
      tip: {
        en: "It leaves early because the tide does, not because of us. Take a layer: the water is colder than the beach.",
        fr: "Le départ est tôt à cause de la marée, pas de nous. Prenez une couche : l'eau est plus froide que la plage.",
        ar: "الانطلاق باكر بسبب المدّ لا بسببنا. خذ معك ما تلبسه: الماء أبرد من الشاطئ.",
      },
    },
    media: media("oualidia-lagoon-morning", "coast_nature"),
    hero: false,
    signature: false,
    priority: 3,
    verification: "unverified",
    availability: { status: "seasonal" },
  },
];

/**
 * Exported through the content layer, so the narrative carries every language we
 * have a translation for. Nothing else about these objects changes.
 */
export const EXPERIENCES: POI[] = EXPERIENCES_SOURCE.map(localizePoi);
