# Siyaha — Brief produit pour la direction UI/UX

Ce document décrit **ce qu'est le produit et ce que fait chaque écran**, tel qu'il existe
aujourd'hui dans le code. Il ne prescrit aucune méthode : c'est la matière première pour
concevoir la palette, le système visuel et les écrans.

---

## 1. Le produit en une page

**Siyaha** — *See it. Plan it. Experience Morocco.*

Application mobile (PWA) de tourisme intelligent pour la région **Casablanca-Settat**,
Maroc. Elle transforme une inspiration brute — une capture d'écran TikTok/Instagram, un
lien social, une phrase dite à voix haute — en **une journée structurée de 4 étapes**,
posée sur une carte, chronométrée, racontée, et **adaptable en direct**.

### Le problème

Les voyageurs découvrent le Maroc sur TikTok, Reels, Instagram, par captures d'écran.
Ensuite ils doivent tout reconstruire à la main : identifier le lieu, trouver ce qu'il y
a autour, juger les distances, ordonner une journée sensée, estimer le coût, comprendre
le contexte culturel. Siyaha ferme l'écart entre l'inspiration et le plan.

### La promesse, dans l'ordre

Inspiration sociale → compréhension → voyage personnalisé → carte intelligente →
expérience réelle → adaptation en direct.

### Ce que ce n'est PAS

- **Pas un chatbot.** L'IA ne parle jamais. L'utilisateur donne quelque chose ; c'est
  *l'expérience* qui répond — avec des sélections, des tags extraits, des cartes, une
  carte géographique, une timeline, des changements de trajet, des chiffres, des récits
  et de l'audio. Aucun assistant conversationnel nulle part.
- Pas un portail touristique, pas un annuaire, pas un dashboard.
- Pas de compte, pas de login, pas de réservation, pas de paiement, pas de navigation
  pas-à-pas.

### Persona

Visiteur international **en première visite**, génération Z, découverte « social-first ».
Il arrive avec un téléphone, une capture d'écran et zéro plan.

### Périmètre géographique

Région Casablanca-Settat. Jeu de données : Casablanca, El Jadida, Azemmour, Oualidia,
Mohammedia, Boulaouane (25 lieux curés). La démo contrôlée se passe entièrement à
Casablanca. Le produit ne se présente jamais comme « Casablanca only ».

---

## 2. Personnalité et identité

**Premium travel × Gen-Z social × luxe marocain × explorateur × futur IA.**

Moderne, éditorial, chaleureux, mobile-first. Le jury (c'est un hackathon) forme son
opinion dans les 8 premières secondes de l'écran d'accueil, avant qu'aucune fonctionnalité
n'ait tourné.

### Direction actuelle (point de départ, pas une contrainte)

| Rôle | Valeur actuelle |
|---|---|
| Fond | Ivoire `#fbf7f0` |
| Surface | Blanc `#ffffff` / ivoire foncé `#f2ebdf` |
| Primaire | Bleu Atlantique `#17506e` |
| Accent | Terracotta `#bf5b3e` |
| Texte | Charbon `#221f1b` |
| Vert profond (rare) | `#2f5d4e` — accents et états « visité » uniquement |
| Bordure | `#e4dacb` |
| Succès / alerte / danger | `#3c7a5a` / `#c98a2e` / `#b3402f` |
| Typo titres | Bricolage Grotesque (slot remplaçable) |
| Typo UI | Plus Jakarta Sans, avec fallback arabe système |
| Rayon | 14 px de base |

Thème **clair uniquement**. Pas de dark mode.

### Langage graphique marocain

Il existe déjà une petite grammaire vectorielle, dessinée en `currentColor` (donc
teintable) :

- **L'étoile à huit branches** (*khatim* : deux carrés, l'un tourné à 45°) — motif
  ponctuel.
- **La bande rythmique** — une frise horizontale fine de losanges, séparateur de sections.
- **Le champ zellige** — un pattern grand format très bas contraste, en arrière-plan.
- **L'arc brisé** — un clip-path d'arche pointue qui encadre les photos (moods, tuiles
  d'intérêts, aperçu de capture).

Intensité voulue par écran : **subtil sur Home**, **accents dans l'onboarding**, **fort
dans les récits culturels et le Passeport**, **quasi absent sur la carte et la timeline**.

### À éviter

Dashboards SaaS génériques, esthétique IA cyberpunk, dégradés néon, glassmorphism lourd,
cliché rouge/vert Maroc, drapeaux, encombrement folklorique, dégradés violets, Inter par
défaut, logos officiels d'État.

### Mouvement

Calme par défaut. Les vraies animations sont réservées à : la reconnaissance du lieu, la
progression de génération, la révélation du voyage, « Adapt My Day », l'ouverture d'un
récit culturel, le tampon du passeport. La performance prime sur la décoration.

---

## 3. Contraintes de cadre

- **Mobile-first, 390–430 px.** Sur un ordinateur ou un projecteur, l'app reste une
  colonne téléphone de 430 px max, centrée, encadrée comme un appareil posé sur un fond
  bleuté.
- **Tactile ET souris.** La démo peut tourner sur un projecteur. Aucune interaction
  « swipe-only » ; les bottom sheets se ferment au clic.
- **Trois langues : EN, FR, AR.** L'arabe retourne tout le layout en **RTL**. Chaque
  écran doit tenir dans les deux sens de lecture.
- **Zones tactiles ≥ 44 px**, focus visible, contrôles sémantiques.
- Réduction de mouvement respectée (`prefers-reduced-motion`).
- Tout fonctionne **hors ligne / sans aucune API** : le contenu de secours est local.
  Il n'y a jamais de spinner infini ni d'écran blanc.

---

## 4. Le modèle de contenu

### Le profil (ce que l'utilisateur donne — rien n'est obligatoire)

- Une source d'inspiration : image, lien social, voix, texte, choix manuel, preset.
- **Six intérêts** (2–3 max sélectionnés) : Culture & Heritage · Food · Coast & Nature ·
  Local & Hidden Gems · Art & Creative · Activities & Adventure.
- Temps : quelques heures / demi-journée / journée entière.
- Budget : bas / moyen / premium.
- Rythme : détendu / équilibré / explorateur.

### Le lieu (POI)

Chaque lieu porte : nom, ville, coordonnées, catégories (= les six intérêts), tags,
horaires, durée de visite de base, fourchette de prix (gratuit → 300+ MAD), score de
marche 1–5, **couche culturelle** (récit de 3–4 lignes, un conseil pratique, audio
pré-enregistré EN/FR/AR), photo héro + image de secours locale, vidéo optionnelle,
drapeaux « héro régional » et « incontournable ».

### Le voyage

**Toujours exactement 4 étapes.** Sélection : 2 fortement alignées + 1 complémentaire +
1 incontournable signature. Ordonnées comme un **récit de journée** (culture le matin →
nourriture à midi → découverte l'après-midi → icône au coucher du soleil), pas par
distance. Entre les étapes : des segments avec mode (marche / voiture), distance, durée.
Métriques globales : km à pied, km en voiture, minutes de déplacement, coût estimé
(fourchette MAD).

### Le scénario de référence (démo)

| # | Étape | Arrivée | Durée |
|---|---|---|---|
| 1 | Quartier Habous | 09:30 | 75 min |
| 2 | Marché Central | 11:30 | 75 min |
| 3 | Espace Sacré-Cœur | 14:00 | 60 min |
| 4 | Mosquée Hassan II | 15:40 | 90 min (visite guidée 16:00, se termine au coucher du soleil) |

6,4 km à pied · 82 min de déplacement · ~190 MAD. Après « Less Walking » : 1,5 km à
pied · 42 min · **« 77 % de marche en moins · ~40 min gagnées »**. Ces quatre lieux sont
les seuls à avoir des visuels premium aujourd'hui.

---

## 5. Les écrans

Parcours principal : **Home → Onboarding (3 étapes) → Processing → Trip (révélation) →
Experience → Passport.** Sept surfaces, plus deux feuilles (sheets) et une carte.

### 5.1 Home — `/`

**Rôle :** raconter la promesse et obtenir l'inspiration en un geste. Focalisé, pas un
portail.

**Structure, de haut en bas :**

1. **En-tête** — eyebrow « Casablanca-Settat », nom « Siyaha », sélecteur de langue
   EN / FR / AR (pilules), bouton rond « Passeport » (icône tampon).
2. **Héro cinématique** — visuel plein cadre (≈ 46 % de la hauteur) avec voile sombre et
   titre en surimpression : *« Turn what you saw into where you go »*. Sous-titre :
   *« One screenshot becomes a day: mapped, timed and told. »*
3. **Inspiration Composer** — titre « What inspired you? ». C'est **l'entrée principale
   du produit** (voir 5.1.a).
4. **Bande zellige** — séparateur décoratif.
5. **« Start from a feeling »** — trois cartes portrait en arche, 3 colonnes :
   *Arches and zellige* (Culture / Art), *Sunset on the Atlantic* (Coast / Culture),
   *Where locals eat lunch* (Food / Hidden gems). Un tap pré-remplit les intérêts et
   ouvre l'onboarding.
6. **« Popular in the region »** — liste de trois lignes (vignette carrée + titre en
   display + méta + chevron) : *Culture in Casablanca* (4 stops / full day), *Atlantic
   Escape* (4 stops / coast and light), *Local Food Trail* (4 stops / market to table).
   Même comportement : pré-remplit, ne construit jamais un voyage directement.

#### 5.1.a L'Inspiration Composer (composant clé)

Trois états.

**Idle (repos)**
- Une grande zone de dépôt : icône « ajouter une image » dans une arche sur fond zellige,
  libellé « Add a screenshot », aide « Drop a screenshot, choose a file, or paste one. ».
  Accepte le clic, le glisser-déposer (la zone passe en terracotta doux), et le Cmd/Ctrl+V.
- En dessous, deux actions secondaires côte à côte : **« Paste a link »** (déplie un champ
  URL « TikTok, Instagram or any link » + bouton « Use this link ») et **« Speak »**
  (capture vocale : états *Speak → Listening → Done*, « Voice noted »).
- Tout en bas, une sortie discrète : **« Just explore »**.
- Messages d'erreur possibles : image trop lourde, type de fichier non supporté, lien
  invalide, micro indisponible (« No microphone here. Pick a vibe instead. »), écoute
  échouée.

**Analyzing**
- Aperçu de la capture en arche carrée, à côté : « Reading your image » et une fine barre
  de progression qui avance (≈ 2,4 s). Fenêtre minimale de 1,4 s pour que ça se lise.

**Recognised**
- « We recognised » + **nom du lieu** en gros + « in Casablanca ». Puis les **tags
  extraits** qui apparaissent en cascade (chips). Deux boutons : **« That is it,
  continue »** (primaire) et « Change ».
- Si rien n'est reconnu : « We could not place it. Pick a vibe and we take it from there. »
  — jamais un échec bloquant.

### 5.2 Onboarding — `/onboarding`

**Rôle :** compléter le profil en trois écrans narratifs. Choix visuels, **pas de
formulaire, pas de dropdown**. Rien n'est obligatoire. **Profilage progressif** : si l'IA
sait déjà quelque chose, c'est pré-rempli et on ne redemande pas (si une inspiration
existe déjà, l'app saute directement à l'étape 2).

**Chrome commun :** en-tête avec bouton retour rond, eyebrow « Step X of 3 », titre de
l'étape ; sous l'en-tête, trois barres fines de progression (bleu = fait / bordure =
à venir). Une phrase d'accroche sous le titre. Un pied de page avec l'action principale.

**Étape 1 — « Your inspiration »** — *« Give us whatever you have. We understand the
rest. »*
- Si rien n'est connu : le même Inspiration Composer que sur Home ; pied de page « Skip ».
- Si quelque chose est connu : un bloc « Here is what we understood » avec le résumé
  (lieu détecté, ou domaine du lien, ou début de la transcription vocale) + « in
  Casablanca » + petit bouton « Change ». Pied de page « Continue ».

**Étape 2 — « Your vibe »** — *« Two or three is plenty. »* Compteur « X of 3 chosen ».
- Grille de **six tuiles portrait en arche**, photo + voile, icône en haut, libellé en
  bas : Culture & Heritage, Food, Coast & Nature, Local & Hidden Gems, Art & Creative,
  Activities & Adventure. Pas de description.
- Sélectionnée : voile terracotta + coche animée. Au-delà de 3, le plus ancien choix
  saute (aucun contrôle n'est jamais mort).

**Étape 3 — « Your day »** — *« Nothing here is required. »*
- Trois groupes de chips exclusives et désélectionnables : **Time** (A few hours / Half
  day / Full day), **Budget** (Low / Medium / Premium), **Pace** (Relaxed / Balanced /
  Explorer). Compact et visuel.
- Pied de page : grand bouton **« Build my trip »** + « You can change all of it
  afterwards. »

### 5.3 Processing (écran de génération, même route)

**Rôle :** une fenêtre perçue de 7–10 s pendant laquelle le voyage se construit.

- Eyebrow avec la destination (« Casablanca »).
- **Trois étapes** qui s'enchaînent : *Analyzing your inspiration* → *Matching
  experiences* → *Optimizing your route*. Chaque étape a trois statuts : en attente,
  active, terminée.
- **Aucune parole d'IA, aucun message conversationnel, jamais de spinner infini.** Un
  plancher de durée (pour ne pas flasher) et un plafond (au-delà, on montre le voyage
  construit localement).

### 5.4 Trip — la révélation — `/trip`

**Rôle :** le moment « wow » : la journée apparaît. Carte en haut, journée en dessous,
« Adapt My Day » sous le pouce.

**Structure :**

1. **En-tête** — eyebrow destination en terracotta, titre « Your day », « 4 stops ». À
   droite, une pilule météo (« 24° · Sunny ») quand disponible.
2. **Carte** (≈ 42 % de la hauteur) — fond MapLibre, **4 pins numérotés**, tracé de la
   route (segments marche / voiture). Un pin sélectionné ouvre une **mini-carte flottante
   du lieu** : vignette, catégorie en eyebrow, nom, « 09:30 · 1 h 15 », segment d'arrivée
   (icône marche/voiture + distance + durée), deux actions « View stop » et
   « Navigate » (ouvre l'app de cartes du téléphone).
3. **Métriques** — quatre chiffres en ligne : *Walking* · *By car* · *Moving* ·
   *Estimated day* (fourchette MAD). Ils **s'animent en comptant** lors d'une adaptation.
   Après adaptation : bandeau « Day updated » + headline (« 77% less walking · ~40 min
   saved ») + lien « Undo ».
4. **Timeline verticale** — la journée lisible à trois mètres : pour chaque étape, un
   nœud numéroté sur un rail vertical (états : à venir / courant en terracotta / visité en
   bleu / sauté), une carte avec vignette 56 px, heure d'arrivée, nom, durée. Entre deux
   étapes, le **segment** : pastille icône (pieds = bleu doux, voiture = terracotta doux)
   + « Walk · 2.4 km · 30 min ». La sélection est synchronisée dans les deux sens avec la
   carte.
5. **Barre d'action fixe en bas** (flou d'arrière-plan) — deux boutons : **« Adapt my
   day »** (bleu primaire) et **« Start trip »** (terracotta, icône play).

Si la carte ne charge pas : « Map unavailable — your day is right below. »

#### 5.4.a Adapt My Day (bottom sheet)

- Titre « Adapt my day », sous-titre « Same stops, better day. »
- Grille 2×2 de quatre options avec icône : **Less walking** (pieds), **Less time**
  (chrono), **Spend less** (portefeuille), **Rainy day** (nuage).
- Seul **Less walking** est pleinement fonctionnel et animé. Les trois autres répondent
  honnêtement : « Nothing to improve here » + raison, sans faire semblant.
- Bouton « Close ». Fermeture au clic sur l'overlay, à Escape, ou par glissement.

**Chorégraphie Less Walking :** route actuelle visible → tap → l'ancienne route
s'estompe → la nouvelle se dessine → les icônes des segments 1 et 3 passent de marche à
voiture → la timeline se met à jour → les métriques comptent jusqu'aux nouveaux chiffres.
Rapide. Les heures d'arrivée ne bougent pas ; le rendez-vous de 16:00 à Hassan II est un
ancrage.

### 5.5 Experience — `/experience`

**Rôle :** le mode « je suis dehors, je vis la journée ». La transition depuis « Start
trip » doit se sentir comme un **changement de vitesse** : moins de planification, plus
de terrain.

**Structure :**

1. **En-tête** — retour vers `/trip`, eyebrow « Experience mode », titre destination,
   lien « Morocco Passport » à droite.
2. **Rail de progression** — quatre pastilles rondes 44 px reliées par des traits :
   visitée = vert profond avec coche, courante = terracotta, à venir = surface neutre.
   Tap pour changer d'étape.
3. **Carte** (plus basse que sur Trip), centrée sur l'étape courante.
4. **Métriques** — seulement si une adaptation est en cours (pour garder l'écran propre).
5. **Carte de l'étape courante** — photo héro paysage avec voile, gros numéro, « You are
   here » (ou « Done »), nom du lieu en display. Sous la photo : « Arrive 09:30 · Stay
   1 h 15 ». Deux actions : **« Read the story »** (ouvre la feuille culturelle) et
   **« Navigate »** (Google Maps). Puis un grand bouton **« Visited »** (devient « Done »
   désactivé).
6. **« Next stop »** — une ligne : vignette carrée, nom, « Arrive 11:30 · 2.4 km Walk ·
   30 min », icône pin. Tap pour y aller.
7. **« The day ahead »** — la même timeline que sur Trip.
8. **Pied de page fixe** — **« Adapt my day »** est ici l'action principale.

**État terminé :** quand les quatre étapes sont visitées, un bloc « Day complete » —
*« Four stops, one day. Your stamps are waiting in the passport. »* + bouton « Open
passport ».

**État vide** (arrivée directe sans voyage) : « No day yet » — *« Build a day and it
runs here, stop by stop. »* + bouton « Plan my day ».

#### 5.5.a La feuille culturelle (bottom sheet)

**C'est le traitement marocain le plus fort du produit — volontairement plus « loud »
que la carte.** Par étape :

- Titre = nom du lieu.
- Vidéo héro si elle existe (avec poster), sinon la photo paysage.
- Eyebrow « Cultural layer », titre « The story », **récit de 3–4 lignes**.
- Encart **« Good to know »** avec l'étoile zellige : le conseil pratique.
- Actions : **« Listen »** (audio pré-enregistré dans la langue courante, bouton
  casque ↔ pause ; caché si aucun audio) et **« Visited »**.

### 5.6 Passport — `/passport`

**Rôle :** la récompense. Un tampon par étape terminée. Léger, pas de système de succès.
Motifs marocains **forts** bienvenus.

- En-tête minimal (retour).
- **Bandeau héro** sur champ zellige : « Morocco Passport », *« One stamp for every stop
  you finish. »*, « X of 4 collected ».
- Bande zellige.
- **Grille de tampons** — chaque tampon : étoile zellige, nom du lieu, ville, « Visited
  28 Aug ». Posés **à la main** : légèrement inclinés (−4° à +5°), et à l'apparition ils
  « claquent » (échelle 1,5 → 1 avec ressort, en cascade).
- **État vide :** « Your first stamp is waiting » — *« Finish a stop in experience mode
  and it lands here. »* + bouton « Plan a day ».

Les tampons persistent d'une session à l'autre (stockage local).

---

## 6. Composants transverses

| Composant | Ce qu'il fait |
|---|---|
| **AppHeader** | En-tête sticky : bouton retour rond 44 px, eyebrow en capitales espacées, titre display, sélecteur de langue (pilules EN/FR/AR, active = bleu plein), action à droite. |
| **PageShell** | La colonne de page avec header / contenu / footer fixe et zones de sécurité. |
| **MediaCard** | Image avec ratios (héro, paysage, carré, portrait), option voile sombre (scrim), option **arche**, overlay libre, et image de secours locale si la distante échoue. Aucune image cassée n'est jamais visible. |
| **ChoiceChip** | Pilule de choix, sélectionnable / désélectionnable. |
| **SectionTitle** | Titre de section. |
| **ProcessingState** | Les trois étapes de génération avec statuts. |
| **BottomSheet / Drawer** | Feuille montante avec poignée, overlay, titre, fermeture clic / Escape / glissement. |
| **Button** | Variantes : primaire (bleu), outline, quiet (discret) ; tailles sm / défaut / lg ; option pleine largeur. |
| **Ornaments** | ZelligeStar, ZelligeBand, ZelligeField, clip d'arche — voir §2. |
| **PoiImage** | Vignette de lieu avec fallback. |

Icônes : Lucide (trait fin). Icônes métier utilisées : pieds (marche), voiture, vélo
(adapter), chrono, portefeuille, pluie, casque, pause, play, pin, navigation, coche,
tampon, image+, lien, micro, chevron, retour.

---

## 7. Les moments qui comptent (le « run sheet » de 90 s)

| Temps | À l'écran |
|---|---|
| 0–10 s | Home. Composer. Dépôt d'une capture de Casablanca. |
| 10–20 s | Reconnaissance : lieu détecté, tags extraits. Sans parole d'IA. |
| 20–30 s | Onboarding : 2–3 intérêts, puis temps / budget / rythme. |
| 30–40 s | Processing : analyzing → matching → optimizing. |
| 40–55 s | Révélation : carte + timeline, 4 pins numérotés, route tracée. |
| 55–70 s | Start trip → Experience → récit culturel Hassan II → Listen. |
| 70–90 s | Adapt my day → **Less walking** → la route se redessine, les métriques montent à 77 % / 40 min. |

Après la démo, le jury clique librement : chaque écran doit tenir, même moins poli.

---

## 8. Assets existants

- `public/images/hero-arch.svg` — héro Home (vectoriel provisoire).
- `public/images/poi/` — 4 photos héro (Habous, Marché Central, Sacré-Cœur, Hassan II).
- `public/images/vibes/` — 6 visuels d'intérêts (culture, food, coast, hidden-gems, art,
  adventure).
- `public/images/popular/` — 3 visuels régionaux (culture-casablanca, atlantic-escape,
  local-food-trail).
- `public/images/placeholder.svg` — image de secours universelle.
- `public/audio/` — vide pour l'instant (audio EN/FR/AR prévu pour les 4 lieux).

Les 21 autres lieux du jeu de données n'ont pas encore de visuel premium.
