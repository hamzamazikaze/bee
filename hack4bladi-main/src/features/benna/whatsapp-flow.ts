/**
 * BENNA on WhatsApp — the pure, deterministic ordering conversation.
 *
 * No model here: every dish, price, slot and reference comes from `deps` (the database),
 * so the bot cannot invent any of them. An order is saved as `pending` and told so; it is
 * only "confirmed" once the kitchen accepts it in the admin.
 *
 * Workplace comes before the menu (not after the quantity) because the menu itself is per
 * workplace: a kitchen only delivers its own city.
 */
import { normalize, type MenuRow } from "./m3ak";

export type Lang = "dr" | "ar" | "fr" | "en";
type Step = "idle" | "workplace" | "dish" | "qty" | "slot" | "confirm" | "human";
export type Session = {
  step: Step;
  lang: Lang;
  workplaceId?: string;
  dishId?: string;
  qty?: number;
  groupId?: string;
};

export type Inbound = { from: string; messageId: string; name?: string; text: string; replyId?: string };
export type Reply =
  | { kind: "text"; body: string }
  | { kind: "buttons"; body: string; buttons: { id: string; title: string }[] }
  | { kind: "list"; body: string; button: string; rows: { id: string; title: string; description?: string }[] };

export type WorkplaceOption = { id: string; name: string; code: string; pickup: string };
export type Slot = { id: string; name: string; delivery: string; cutoffAt: string };
export type OrderStatus = "pending" | "confirmed" | "preparing" | "delivering" | "delivered" | "cancelled";
export type PlaceResult = { ok: true; reference: string; total: number } | { ok: false; reason: "unavailable" | "closed" };
export type RecentOrder = { reference: string; dish: string; qty: number; total: number; status: OrderStatus };

export type FlowDeps = {
  workplaces(): Promise<WorkplaceOption[]>;
  menu(workplaceId: string): Promise<MenuRow[]>;
  slots(workplaceId: string): Promise<Slot[]>;
  placeOrder(order: { phone: string; name?: string; workplaceId: string; dishId: string; qty: number; groupId: string; key: string }): Promise<PlaceResult>;
  recentOrders(phone: string): Promise<RecentOrder[]>;
  supportPhone?: string;
};

/* ---------- Language ---------- */

export function detectLang(text: string): Lang | null {
  if (/[؀-ۿ]/.test(text)) return "ar";
  const t = normalize(text);
  if (/\b(bonjour|bonsoir|salut|coucou|merci|je|commander|svp)\b/.test(t)) return "fr";
  if (/\b(hi|hello|hey|please|want|order|good)\b/.test(t)) return "en";
  if (/\b(salam|slm|salamo|marhba|bghit|wach|labas|ahlan)\b/.test(t)) return "dr";
  return null;
}

const GREETING = /^(salam|slm|salamo|assalam|marhba|ahlan|hi|hello|hey|bonjour|bonsoir|salut|coucou|menu|start|السلام|سلام|مرحبا|اهلا|منيو)/;
const HELP = /\b(help|aide|agent|humain|human|insan|m3awna|support|conseiller)\b|مساعدة|انسان|إنسان/;

/* ---------- Copy ---------- */

const STATUS: Record<Lang, Record<OrderStatus, string>> = {
  dr: { pending: "f l'intidar dyal l'cuisine ⏳", confirmed: "l'cuisine qblatha ✅", preparing: "kat tteyyeb 👩‍🍳", delivering: "f triq 🛵", delivered: "wslat 🎉", cancelled: "t'annulat ❌" },
  ar: { pending: "كتسنى موافقة الكوزينة ⏳", confirmed: "الكوزينة قبلاتها ✅", preparing: "كتطيب 👩‍🍳", delivering: "فالطريق 🛵", delivered: "وصلات 🎉", cancelled: "تلغات ❌" },
  fr: { pending: "en attente de la cuisine ⏳", confirmed: "acceptée par la cuisine ✅", preparing: "en préparation 👩‍🍳", delivering: "en livraison 🛵", delivered: "livrée 🎉", cancelled: "annulée ❌" },
  en: { pending: "waiting for the kitchen ⏳", confirmed: "accepted by the kitchen ✅", preparing: "being prepared 👩‍🍳", delivering: "on its way 🛵", delivered: "delivered 🎉", cancelled: "cancelled ❌" },
};

export const statusLabel = (lang: Lang, status: OrderStatus) => STATUS[lang][status];

type Summary = { qty: number; dish: string; unit: number; total: number; workplace: string; pickup: string; delivery: string; cutoff: string };

const T = {
  dr: {
    welcome: "Marhba bik f BENNA ❤️ Chno bghiti takol lyoum?\n\n1. Chouf menu dyal lyoum\n2. Commandi daba\n3. Chouf commande dyali\n\nKteb *help* ila bghiti tehder m3a chi wa7ed.",
    choices: ["Menu dyal lyoum", "Commandi daba", "Commande dyali"],
    askWorkplace: "Fin khddam? Khtar blastek ola kteb l'code dyalha (b7al CASA2B).",
    pickWorkplace: "Khtar blasa",
    menu: (wp: string) => `Menu dyal lyoum — ${wp} 🍲\nKhtar plat:`,
    seeMenu: "Chouf l'menu",
    changePlace: "📍 Bdel l'blasa",
    noMenu: (wp: string) => `Ma kayn 7ta plat lyoum l ${wp}. Jreb ghedda 🙏`,
    askQty: (dish: string, price: number) => `${dish} — ${price} DH l'wa7ed.\nCh7al bghiti? Khtar ola kteb ra9m (1–10).`,
    askSlot: (lines: string) => `Imta bghiti livraison?\n${lines}`,
    slotLine: (s: Slot, cutoff: string) => `• ${s.delivery} — ${s.name} (commandi 9bel ${cutoff})`,
    noSlot: "Ma b9at 7ta livraison lyoum — l'cutoff fat. Jreb ghedda 🙏",
    summary: (s: Summary) => `🧾 L'commande dyalk\n${s.qty} × ${s.dish}\n${s.unit} DH × ${s.qty} = *${s.total} DH*\n📍 ${s.workplace} — ${s.pickup}\n🕐 Livraison ${s.delivery} (cutoff ${s.cutoff})\n💵 Khlas cash f l'livraison (TEST)\n\nNconfirmiw?`,
    confirm: "✅ Confirmi",
    cancel: "❌ Annuli",
    placed: (ref: string, total: number) => `Commande dyalk tsjlat: *${ref}* (${total} DH).\nStatut: f l'intidar dyal l'cuisine ⏳\nGhadi nsiftlek message mlli tqbelha.`,
    unavailable: "Smeh lina, had l'plat ma b9ach mtwfer lyoum. Kteb *menu* bach tchouf chno b9a.",
    closed: "Smeh lina, l'cutoff dyal had l'livraison fat. Kteb *menu* bach tchouf chno b9a.",
    cancelled: "Safi, l'commande t'annulat. Kteb *menu* ila bghiti tbda mn jdid.",
    noOrders: "Ma 3ndek 7ta commande f BENNA mazal. Kteb *menu* bach tcommandi.",
    orders: "Commandes dyalk:",
    human: (link: string) => `Ghadi nwasslek b chi wa7ed mn l'équipe BENNA 👇\n${link}\nKteb *menu* bach terje3 l BENNA.`,
    noHuman: "L'équipe ma mtwfrach db, smeh lina 🙏 Kteb *menu* bach tkemmel m3a BENNA.",
    huh: "Ma fhemtch 🙏",
    error: "Kayn mochkil sghir 3ndna, 3awed mn ba3d chwiya 🙏",
  },
  ar: {
    welcome: "مرحبا بيك ف BENNA ❤️ شنو بغيتي تاكل اليوم؟\n\n1. شوف المنيو ديال اليوم\n2. كوموندي دابا\n3. شوف الكوموند ديالي\n\nكتب *مساعدة* إلا بغيتي تهضر مع شي واحد.",
    choices: ["منيو ديال اليوم", "كوموندي دابا", "الكوموند ديالي"],
    askWorkplace: "فين خدام؟ ختار البلاصة ولا كتب الكود ديالها (بحال CASA2B).",
    pickWorkplace: "ختار البلاصة",
    menu: (wp: string) => `المنيو ديال اليوم — ${wp} 🍲\nختار طبسيل:`,
    seeMenu: "شوف المنيو",
    changePlace: "📍 بدل البلاصة",
    noMenu: (wp: string) => `ما كاين حتى طبسيل اليوم ل ${wp}. جرب غدا 🙏`,
    askQty: (dish: string, price: number) => `${dish} — ${price} درهم للواحد.\nشحال بغيتي؟ ختار ولا كتب رقم (1–10).`,
    askSlot: (lines: string) => `إمتى بغيتي التوصيل؟\n${lines}`,
    slotLine: (s: Slot, cutoff: string) => `• ${s.delivery} — ${s.name} (كوموندي قبل ${cutoff})`,
    noSlot: "ما بقا حتى توصيل اليوم — الوقت فات. جرب غدا 🙏",
    summary: (s: Summary) => `🧾 الكوموند ديالك\n${s.qty} × ${s.dish}\n${s.unit} درهم × ${s.qty} = *${s.total} درهم*\n📍 ${s.workplace} — ${s.pickup}\n🕐 التوصيل ${s.delivery} (آخر وقت ${s.cutoff})\n💵 الخلاص كاش عند التوصيل (تجربة)\n\nنأكدو؟`,
    confirm: "✅ أكد",
    cancel: "❌ لغي",
    placed: (ref: string, total: number) => `الكوموند ديالك تسجلات: *${ref}* (${total} درهم).\nالحالة: كتسنى موافقة الكوزينة ⏳\nغادي نصيفط ليك ميساج ملي تقبلها.`,
    unavailable: "سمح لينا، هاد الطبسيل ما بقاش متوفر اليوم. كتب *منيو* باش تشوف شنو بقا.",
    closed: "سمح لينا، الوقت ديال هاد التوصيل فات. كتب *منيو* باش تشوف شنو بقا.",
    cancelled: "صافي، الكوموند تلغات. كتب *منيو* إلا بغيتي تبدا من جديد.",
    noOrders: "ما عندك حتى كوموند ف BENNA مازال. كتب *منيو* باش تكوموندي.",
    orders: "الكوموندات ديالك:",
    human: (link: string) => `غادي نوصلك بشي واحد من الفريق ديال BENNA 👇\n${link}\nكتب *منيو* باش ترجع ل BENNA.`,
    noHuman: "الفريق ما متوفرش دابا، سمح لينا 🙏 كتب *منيو* باش تكمل مع BENNA.",
    huh: "ما فهمتش 🙏",
    error: "كاين مشكل صغير عندنا، عاود من بعد شوية 🙏",
  },
  fr: {
    welcome: "Bienvenue chez BENNA ❤️ Qu'est-ce qui vous ferait plaisir aujourd'hui ?\n\n1. Voir le menu du jour\n2. Commander\n3. Suivre ma commande\n\nÉcrivez *aide* pour parler à quelqu'un.",
    choices: ["Menu du jour", "Commander", "Ma commande"],
    askWorkplace: "Où travaillez-vous ? Choisissez votre lieu ou tapez son code (ex. CASA2B).",
    pickWorkplace: "Choisir le lieu",
    menu: (wp: string) => `Menu du jour — ${wp} 🍲\nChoisissez un plat :`,
    seeMenu: "Voir le menu",
    changePlace: "📍 Changer de lieu",
    noMenu: (wp: string) => `Aucun plat aujourd'hui pour ${wp}. Réessayez demain 🙏`,
    askQty: (dish: string, price: number) => `${dish} — ${price} DH l'unité.\nCombien en voulez-vous ? Choisissez ou tapez un nombre (1–10).`,
    askSlot: (lines: string) => `Quelle livraison ?\n${lines}`,
    slotLine: (s: Slot, cutoff: string) => `• ${s.delivery} — ${s.name} (commande avant ${cutoff})`,
    noSlot: "Plus aucune livraison aujourd'hui : l'heure limite est passée. Réessayez demain 🙏",
    summary: (s: Summary) => `🧾 Votre commande\n${s.qty} × ${s.dish}\n${s.unit} DH × ${s.qty} = *${s.total} DH*\n📍 ${s.workplace} — ${s.pickup}\n🕐 Livraison ${s.delivery} (limite ${s.cutoff})\n💵 Paiement en espèces au retrait (TEST)\n\nOn confirme ?`,
    confirm: "✅ Confirmer",
    cancel: "❌ Annuler",
    placed: (ref: string, total: number) => `Commande enregistrée : *${ref}* (${total} DH).\nStatut : en attente de la cuisine ⏳\nVous recevrez un message dès qu'elle l'accepte.`,
    unavailable: "Désolé, ce plat n'est plus disponible aujourd'hui. Tapez *menu* pour voir ce qui reste.",
    closed: "Désolé, l'heure limite de cette livraison est passée. Tapez *menu* pour voir ce qui reste.",
    cancelled: "C'est annulé. Tapez *menu* pour recommencer.",
    noOrders: "Vous n'avez pas encore de commande BENNA. Tapez *menu* pour commander.",
    orders: "Vos commandes :",
    human: (link: string) => `Je vous mets en contact avec l'équipe BENNA 👇\n${link}\nTapez *menu* pour revenir à BENNA.`,
    noHuman: "L'équipe n'est pas disponible pour le moment, désolé 🙏 Tapez *menu* pour continuer avec BENNA.",
    huh: "Je n'ai pas compris 🙏",
    error: "Petit souci de notre côté, réessayez dans un instant 🙏",
  },
  en: {
    welcome: "Welcome to BENNA ❤️ What would you like to eat today?\n\n1. See today's menu\n2. Order now\n3. Track my order\n\nType *help* to talk to a person.",
    choices: ["Today's menu", "Order now", "My order"],
    askWorkplace: "Where do you work? Pick your workplace or type its code (e.g. CASA2B).",
    pickWorkplace: "Pick workplace",
    menu: (wp: string) => `Today's menu — ${wp} 🍲\nPick a dish:`,
    seeMenu: "See the menu",
    changePlace: "📍 Change workplace",
    noMenu: (wp: string) => `No dishes today for ${wp}. Try again tomorrow 🙏`,
    askQty: (dish: string, price: number) => `${dish} — ${price} DH each.\nHow many? Pick or type a number (1–10).`,
    askSlot: (lines: string) => `Which delivery?\n${lines}`,
    slotLine: (s: Slot, cutoff: string) => `• ${s.delivery} — ${s.name} (order before ${cutoff})`,
    noSlot: "No delivery left today — the cutoff has passed. Try again tomorrow 🙏",
    summary: (s: Summary) => `🧾 Your order\n${s.qty} × ${s.dish}\n${s.unit} DH × ${s.qty} = *${s.total} DH*\n📍 ${s.workplace} — ${s.pickup}\n🕐 Delivery ${s.delivery} (cutoff ${s.cutoff})\n💵 Cash on pickup (TEST)\n\nConfirm?`,
    confirm: "✅ Confirm",
    cancel: "❌ Cancel",
    placed: (ref: string, total: number) => `Order saved: *${ref}* (${total} DH).\nStatus: waiting for the kitchen ⏳\nYou'll get a message as soon as it's accepted.`,
    unavailable: "Sorry, that dish is no longer available today. Type *menu* to see what's left.",
    closed: "Sorry, the cutoff for that delivery has passed. Type *menu* to see what's left.",
    cancelled: "Cancelled. Type *menu* to start again.",
    noOrders: "You have no BENNA orders yet. Type *menu* to order.",
    orders: "Your orders:",
    human: (link: string) => `Connecting you with the BENNA team 👇\n${link}\nType *menu* to come back to BENNA.`,
    noHuman: "The team isn't available right now, sorry 🙏 Type *menu* to carry on with BENNA.",
    huh: "Sorry, I didn't get that 🙏",
    error: "Something went wrong on our side, please try again in a moment 🙏",
  },
} satisfies Record<Lang, unknown>;

/* ---------- Helpers ---------- */

/** WhatsApp caps: list row title 24, description 72, button title 20. */
const cut = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1)}…`);

const casablancaTime = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Casablanca", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/** Lunch runs only: today's group deliveries are lunch, same rule as M3AK. */
const orderable = (menu: MenuRow[]) => menu.filter((row) => row.slot !== "breakfast").slice(0, 9);

function numberIn(input: Inbound): number | null {
  const match = /(\d+)/.exec(normalize(input.replyId?.split(":")[1] ?? input.text));
  return match ? Number(match[1]) : null;
}

/* ---------- The conversation ---------- */

export async function respond(previous: Session | null, input: Inbound, deps: FlowDeps): Promise<{ session: Session; replies: Reply[] }> {
  const raw = input.text.trim();
  const said = normalize(raw).trim();
  const lang = (GREETING.test(said) || !previous ? detectLang(raw) : null) ?? previous?.lang ?? "dr";
  const t = T[lang];
  let session: Session = { ...(previous ?? { step: "idle" }), lang };

  const welcome = (prefix?: string): Reply => ({
    kind: "buttons",
    body: prefix ? `${prefix}\n\n${t.welcome}` : t.welcome,
    buttons: t.choices.map((title, index) => ({ id: ["menu", "order", "status"][index], title: cut(title, 20) })),
  });
  const done = (replies: Reply[]) => ({ session, replies });

  const askWorkplace = async (prefix?: string) => {
    const places = await deps.workplaces();
    session = { step: "workplace", lang, workplaceId: undefined };
    return done([{
      kind: "list",
      body: prefix ? `${prefix} ${t.askWorkplace}` : t.askWorkplace,
      button: cut(t.pickWorkplace, 20),
      rows: places.slice(0, 10).map((place) => ({ id: `wp:${place.id}`, title: cut(place.name, 24), description: cut(`${place.code} · ${place.pickup}`, 72) })),
    }]);
  };

  const showMenu = async (workplaceId: string, prefix?: string) => {
    const [menu, places] = await Promise.all([deps.menu(workplaceId), deps.workplaces()]);
    const place = places.find((entry) => entry.id === workplaceId);
    if (!place) return askWorkplace();
    const dishes = orderable(menu);
    session = { step: "dish", lang, workplaceId };
    if (!dishes.length) {
      session = { step: "idle", lang, workplaceId };
      return done([{ kind: "text", body: t.noMenu(place.name) }]);
    }
    return done([{
      kind: "list",
      body: prefix ? `${prefix} ${t.menu(place.name)}` : t.menu(place.name),
      button: cut(t.seeMenu, 20),
      rows: [
        ...dishes.map((dish) => ({
          id: `dish:${dish.id}`,
          title: cut(dish.name, 24),
          description: cut(`${dish.group_price_mad} DH · ${dish.kitchen_name}`, 72),
        })),
        { id: "change-place", title: cut(t.changePlace, 24) },
      ],
    }]);
  };

  const askSlot = async (prefix?: string) => {
    const slots = await deps.slots(session.workplaceId!);
    if (!slots.length) {
      session = { step: "idle", lang, workplaceId: session.workplaceId };
      return done([{ kind: "text", body: t.noSlot }]);
    }
    session = { ...session, step: "slot" };
    const options = slots.slice(0, 3);
    const body = t.askSlot(options.map((slot) => t.slotLine(slot, casablancaTime(slot.cutoffAt))).join("\n"));
    return done([{
      kind: "buttons",
      body: prefix ? `${prefix}\n${body}` : body,
      buttons: options.map((slot) => ({ id: `slot:${slot.id}`, title: cut(`🕐 ${slot.delivery}`, 20) })),
    }]);
  };

  const showStatus = async () => {
    const orders = await deps.recentOrders(input.from);
    session = { step: "idle", lang, workplaceId: session.workplaceId };
    if (!orders.length) return done([{ kind: "text", body: t.noOrders }]);
    const lines = orders.map((order) => `• *${order.reference}* — ${order.qty} × ${order.dish} — ${order.total} DH — ${statusLabel(lang, order.status)}`);
    return done([{ kind: "text", body: `${t.orders}\n${lines.join("\n")}` }]);
  };

  // Global commands win over whatever step the customer was in.
  if (HELP.test(said) || HELP.test(raw)) {
    session = { step: "human", lang, workplaceId: session.workplaceId };
    const text = encodeURIComponent(`BENNA — ${input.from}`);
    return done([{ kind: "text", body: deps.supportPhone ? t.human(`https://wa.me/${deps.supportPhone}?text=${text}`) : t.noHuman }]);
  }
  if (GREETING.test(said)) {
    session = { step: "idle", lang, workplaceId: session.workplaceId };
    return done([welcome()]);
  }
  // Handed to a human: stay quiet until they come back with a greeting or "menu".
  if (session.step === "human") return done([]);

  const choice = input.replyId ?? said;

  switch (session.step) {
    case "idle": {
      if (["menu", "order", "1", "2"].includes(choice)) {
        return session.workplaceId ? showMenu(session.workplaceId) : askWorkplace();
      }
      if (["status", "3"].includes(choice)) return showStatus();
      return done([welcome(t.huh)]);
    }

    case "workplace": {
      const places = await deps.workplaces();
      const place = choice.startsWith("wp:")
        ? places.find((entry) => entry.id === choice.slice(3))
        : places.find((entry) => entry.code.toLowerCase() === said.replace(/\s+/g, ""));
      return place ? showMenu(place.id) : askWorkplace(t.huh);
    }

    case "dish": {
      if (choice === "change-place") return askWorkplace();
      const dishes = orderable(await deps.menu(session.workplaceId!));
      const index = /^\d+$/.test(choice) ? Number(choice) - 1 : -1;
      const dish = choice.startsWith("dish:") ? dishes.find((entry) => entry.id === choice.slice(5)) : dishes[index];
      if (!dish) return showMenu(session.workplaceId!, t.huh);
      session = { ...session, step: "qty", dishId: dish.id };
      return done([{
        kind: "buttons",
        body: t.askQty(dish.name, dish.group_price_mad),
        buttons: [1, 2, 3].map((n) => ({ id: `qty:${n}`, title: String(n) })),
      }]);
    }

    case "qty": {
      const qty = numberIn(input);
      if (!qty || qty < 1 || qty > 10) {
        return done([{ kind: "buttons", body: `${t.huh} 1–10`, buttons: [1, 2, 3].map((n) => ({ id: `qty:${n}`, title: String(n) })) }]);
      }
      session = { ...session, qty };
      return askSlot();
    }

    case "slot": {
      const slots = await deps.slots(session.workplaceId!);
      const slot = slots.find((entry) => `slot:${entry.id}` === choice) ?? (slots.length === 1 && choice === "1" ? slots[0] : undefined);
      if (!slot) return askSlot(t.huh);
      const [menu, places] = await Promise.all([deps.menu(session.workplaceId!), deps.workplaces()]);
      const dish = menu.find((entry) => entry.id === session.dishId);
      const place = places.find((entry) => entry.id === session.workplaceId);
      if (!dish || !place) {
        session = { step: "idle", lang, workplaceId: session.workplaceId };
        return done([{ kind: "text", body: t.unavailable }]);
      }
      session = { ...session, step: "confirm", groupId: slot.id };
      const qty = session.qty!;
      const summary = t.summary({
        qty, dish: dish.name, unit: dish.group_price_mad, total: dish.group_price_mad * qty,
        workplace: place.name, pickup: place.pickup, delivery: slot.delivery, cutoff: casablancaTime(slot.cutoffAt),
      });
      return done([{ kind: "buttons", body: summary, buttons: [{ id: "confirm", title: t.confirm }, { id: "cancel", title: t.cancel }] }]);
    }

    case "confirm": {
      if (choice === "cancel") {
        session = { step: "idle", lang, workplaceId: session.workplaceId };
        return done([{ kind: "text", body: t.cancelled }]);
      }
      if (choice !== "confirm") {
        return done([{ kind: "buttons", body: t.huh, buttons: [{ id: "confirm", title: t.confirm }, { id: "cancel", title: t.cancel }] }]);
      }
      const result = await deps.placeOrder({
        phone: input.from, name: input.name, workplaceId: session.workplaceId!, dishId: session.dishId!,
        qty: session.qty!, groupId: session.groupId!, key: input.messageId,
      });
      session = { step: "idle", lang, workplaceId: session.workplaceId };
      if (!result.ok) return done([{ kind: "text", body: result.reason === "closed" ? t.closed : t.unavailable }]);
      return done([{ kind: "text", body: t.placed(result.reference, result.total) }]);
    }
  }
}

export const errorReply = (lang: Lang = "dr"): Reply => ({ kind: "text", body: T[lang].error });
