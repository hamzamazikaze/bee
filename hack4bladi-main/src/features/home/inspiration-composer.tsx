"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Camera,
  CaretDown,
  CaretRight,
  ChatCircleDots,
  FrameCorners,
  MapPin,
  Sparkle,
  TiktokLogo,
  type Icon,
} from "@phosphor-icons/react";
import { APP, UPLOAD } from "@/config/app";
import { Button } from "@/components/ui/button";
import { ChoiceChip } from "@/components/choice-chip";
import { MediaCard } from "@/components/media-card";
import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/use-translation";
import { draftToProfile } from "@/lib/intent";
import { createEmptyProfile } from "@/lib/validation/trip-profile";
import { cn } from "@/lib/utils";
import type { PoiCandidate, TripIntentDraft } from "@/types/intent";
import { BottomSheet } from "@/components/bottom-sheet";
import { GuideConversation } from "@/features/chat/guide-conversation";
import { VoiceCapture } from "./voice-capture";
import { RecognitionReveal } from "./recognition-reveal";
import { MOODS, addSource, type Preset } from "./presets";
import {
  readSocialUrl,
  recogniseImage,
  understand,
  validateImage,
  type Recognition,
  type UploadIssue,
} from "./analyze";

type Phase = "idle" | "analyzing" | "recognised";
type Source = "link" | "place";

const MAX_TEXT = 200;

/** One "starting point" row (target 02): icon in a dark tile, label, chevron. */
function SourceRow({
  icon: Icon,
  label,
  open,
  children,
  ...rest
}: {
  icon: Icon;
  label: string;
  open?: boolean;
  children?: ReactNode;
} & Omit<React.ComponentProps<"button">, "children">) {
  return (
    <button
      type="button"
      aria-expanded={open}
      className={cn(
        "pressable border-border bg-surface hover:border-primary/50 flex h-14 w-full items-center gap-3 rounded-md border px-3 text-start text-sm font-medium",
        open && "border-primary",
      )}
      {...rest}
    >
      <span className="bg-surface-muted text-foreground grid size-9 shrink-0 place-items-center rounded-sm">
        <Icon aria-hidden className="size-4" />
      </span>
      <span className="flex-1">{label}</span>
      {children}
      {/* The chevron turns to face what it opened. Without it the row gave no sign it was
          the thing responsible for the field that had just appeared underneath. */}
      <CaretRight
        aria-hidden
        className={cn(
          "text-muted-foreground size-4 shrink-0 transition-transform rtl:-rotate-180",
          open && "rotate-90 rtl:-rotate-90",
        )}
        weight="bold"
      />
    </button>
  );
}

/**
 * A starting point that opens the file picker.
 *
 * A `<label>` wrapping a visually-hidden input, so the whole 56px row is the target and
 * the keyboard still reaches it — clicking a file input's *button* is the one thing that
 * cannot be scripted or styled. Each instance owns its input, which is what lets two rows
 * offer the same picker without fighting over one ref.
 */
function FileRow({
  icon: Icon,
  label,
  onFile,
}: {
  icon: Icon;
  label: string;
  onFile: (file: File) => void;
}) {
  return (
    <label className="pressable border-border bg-surface hover:border-primary/50 has-[input:focus-visible]:ring-ring flex h-14 w-full cursor-pointer items-center gap-3 rounded-md border px-3 text-sm font-medium has-[input:focus-visible]:ring-2">
      <input
        type="file"
        accept={UPLOAD.acceptedMimeTypes.join(",")}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          // Cleared so picking the same file twice still fires a change.
          event.target.value = "";
        }}
      />
      <span className="bg-surface-muted text-foreground grid size-9 shrink-0 place-items-center rounded-sm">
        <Icon aria-hidden className="size-4" />
      </span>
      <span className="flex-1">{label}</span>
      <CaretRight
        aria-hidden
        className="text-muted-foreground size-4 shrink-0 rtl:rotate-180"
        weight="bold"
      />
    </label>
  );
}

/** Shared look of the two primary import cards: icon, title, one-line subtitle. */
const CARD =
  "pressable border-border bg-surface hover:border-primary/50 flex min-h-[7.25rem] w-full flex-col items-center justify-center gap-1 rounded-[1.125rem] border px-3 py-4 text-center";

function CardBody({ icon: Icon, title, subtitle }: { icon: Icon; title: string; subtitle: string }) {
  return (
    <>
      <Icon aria-hidden className="text-foreground mb-1 size-7" weight="fill" />
      <span className="text-foreground text-sm font-semibold">{title}</span>
      <span className="text-muted-foreground text-xs">{subtitle}</span>
    </>
  );
}

/** A primary starting point that opens a field underneath (the link). */
function SourceCard({
  icon,
  title,
  subtitle,
  open,
  ...rest
}: {
  icon: Icon;
  title: string;
  subtitle: string;
  open?: boolean;
} & Omit<React.ComponentProps<"button">, "children">) {
  return (
    <button type="button" aria-expanded={open} className={cn(CARD, open && "border-primary")} {...rest}>
      <CardBody icon={icon} title={title} subtitle={subtitle} />
    </button>
  );
}

/** A primary starting point that opens the file picker. Same label-wraps-input trick as FileRow. */
function FileCard({
  icon,
  title,
  subtitle,
  onFile,
}: {
  icon: Icon;
  title: string;
  subtitle: string;
  onFile: (file: File) => void;
}) {
  return (
    <label className={cn(CARD, "has-[input:focus-visible]:ring-ring cursor-pointer has-[input:focus-visible]:ring-2")}>
      <input
        type="file"
        accept={UPLOAD.acceptedMimeTypes.join(",")}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
      <CardBody icon={icon} title={title} subtitle={subtitle} />
    </label>
  );
}

/**
 * What a row opened, arriving from the row itself.
 *
 * The fields used to appear and disappear as a raw layout jump — the CTA below them moved
 * under the reader's thumb with nothing to connect the two events.
 */
function Disclosure({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden"
    >
      <div className="pt-2.5">{children}</div>
    </motion.div>
  );
}

/**
 * The primary input of the whole product. Free text first (target 02), then the
 * starting points: TikTok / Instagram link, a photo, a place. One CTA launches whatever
 * is there — nothing is mandatory.
 *
 * Every route out of this screen goes through the same understanding layer and comes back
 * as a TripIntentDraft, so a screenshot, a spoken sentence, a pasted link and a typed line
 * are the same object by the time the profile is patched. What differs is only *where*
 * the traveller confirms it: a link and a photo get the full-bleed reveal, because they
 * have an image to show; text and voice get the "here is what we understood" card one
 * step later, which is the confirmation surface this flow already had.
 */
export function InspirationComposer({
  onDone,
  autoStart = false,
}: {
  /** `advance` is true when the traveller has already confirmed on the reveal. */
  onDone: (options?: { advance?: boolean }) => void;
  /** The home search pill already has the sentence: read it on arrival, do not re-ask. */
  autoStart?: boolean;
}) {
  const { t, locale } = useTranslation();
  const profile = useAppStore((state) => state.profile);
  const patchProfile = useAppStore((state) => state.patchProfile);

  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<Recognition | null>(null);
  const [issue, setIssue] = useState<UploadIssue | null>(null);
  const [dragging, setDragging] = useState(false);
  const [text, setText] = useState(profile.transcript ?? "");
  const [open, setOpen] = useState<Source | null>(null);
  const [more, setMore] = useState(false);
  /* The guide is a conversation, not a field, so it gets a sheet rather than a disclosure
     under the row. Local: it is a way into this screen, not state the screen keeps. */
  const [guideOpen, setGuideOpen] = useState(false);
  const [link, setLink] = useState("");
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [reading, setReading] = useState<"image" | "link" | "text">("image");
  const previewRef = useRef<string | null>(null);
  const autoStarted = useRef(false);

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  const destination = profile.destination ?? APP.defaultDestination;

  /**
   * One place where a draft becomes the profile.
   *
   * `fresh` is the difference between "the traveller is editing their day" and "the
   * traveller just described a new one". A second sentence on this screen is a new trip:
   * without an empty base, `draftToProfile` falls back to the previous *AI* answer for
   * every field the new sentence does not mention, and "bghit nmchi ljdida" comes back as
   * Quartier Habous, Casablanca, full day — the whole of the previous read, restated.
   */
  function applyDraft(
    draft: TripIntentDraft,
    extra?: { detectedPoiId?: string; fresh?: boolean },
  ) {
    const base = extra?.fresh ? createEmptyProfile(locale) : profile;
    const next = draftToProfile(draft, { base, locale });
    patchProfile({
      ...next,
      destination: next.destination ?? (extra?.fresh ? APP.defaultDestination : destination),
      ...(extra?.detectedPoiId ? { detectedPoiId: extra.detectedPoiId } : {}),
    });
  }

  async function handleFile(file: File) {
    const problem = validateImage(file);
    if (problem) {
      setIssue(problem);
      return;
    }
    setIssue(null);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setPreview(url);
    setReading("image");
    setPhase("analyzing");
    /* A floor on the recognition window: the fallback answers instantly, and a result
       that appears before the user has read the frame reads as a bug, not as speed. */
    const [result] = await Promise.all([
      recogniseImage(file, locale),
      new Promise((resolve) => setTimeout(resolve, 1400)),
    ]);
    setRecognition(result);
    setPhase("recognised");
  }

  /* Cmd/Ctrl-V a screenshot straight onto the screen. Cheap, and it is how people actually work. */
  useEffect(() => {
    if (phase !== "idle") return;
    function onPaste(event: ClipboardEvent) {
      const file = Array.from(event.clipboardData?.files ?? [])[0];
      if (file) void handleFile(file);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    /* `handleFile` is re-created every render, so listing it would add and remove this
       listener on every keystroke in the textarea below. The handler only ever runs on a
       paste, and any paste reads the current closure — there is nothing stale to catch. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function confirmImage() {
    if (!recognition) return;
    applyDraft(recognition.draft, { fresh: true });
    patchProfile({
      destination: recognition.destination ?? destination,
      detectedPlace: recognition.detectedPlace,
      detectedPoiId: recognition.detectedPoiId,
      sources: addSource(profile.sources, "image"),
    });
    onDone({ advance: true });
  }

  /** An alternative the local resolver ranked. The traveller, not the model, decides. */
  function pickCandidate(candidate: PoiCandidate) {
    if (!recognition) return;
    applyDraft(recognition.draft, { detectedPoiId: candidate.poiId, fresh: true });
    patchProfile({
      destination: candidate.city,
      detectedPlace: candidate.name,
      detectedPoiId: candidate.poiId,
      sources: addSource(profile.sources, "image"),
    });
    onDone({ advance: true });
  }

  /**
   * A link runs the real provider chain server-side (TikTok oEmbed → YouTube → OpenGraph).
   * When it comes back with a thumbnail we can show the reveal; without one, the
   * "what we understood" card takes over one step later.
   */
  async function submitLink() {
    const social = readSocialUrl(link);
    if (!social) {
      setLinkInvalid(true);
      return;
    }
    setReading("link");
    setPhase("analyzing");
    setPreview(social.thumbnailUrl ?? null);

    /* No `known`: the profile still holds the *previous* AI read, and the model is told
       to treat `known` as fixed — it would restate the old answer instead of reading
       this link. A new link is a new trip. */
    const draft = await understand({ source: "url", url: social.url, locale });

    applyDraft(draft, { fresh: true });
    patchProfile({
      social: {
        ...social,
        title: draft.evidence.urlTitle,
        caption: draft.evidence.urlDescription,
        author: draft.evidence.urlAuthor,
        thumbnailUrl: draft.evidence.urlThumbnailUrl,
      },
      sources: addSource(profile.sources, "social_url"),
    });

    const thumbnail = draft.evidence.urlThumbnailUrl;
    if (thumbnail || draft.destination.detectedPlace) {
      setPreview(thumbnail);
      setRecognition(recognitionOf(draft));
      setPhase("recognised");
      return;
    }
    setPhase("idle");
    onDone();
  }

  /** Voice: transcribed upstream, understood here, confirmed on the next card. */
  async function applyTranscript(transcript: string) {
    setReading("text");
    setPhase("analyzing");
    const draft = await understand({ source: "audio", transcript, locale });
    applyDraft(draft, { fresh: true });
    patchProfile({
      transcript,
      destination: draft.destination.city ?? destination,
      sources: addSource(profile.sources, "voice"),
    });
    setPhase("idle");
    onDone();
  }

  function choosePlace(preset: Preset) {
    patchProfile({ interests: preset.interests, destination, sources: addSource(profile.sources, "preset") });
    onDone({ advance: true });
  }

  /** Typed or spoken-then-typed: one understanding call, one confirmation surface. */
  async function readText(typed: string) {
    /* The composer shows what is being read, so the seeded sentence has to land in the
       field too — and doing it here keeps the auto-start effect free of direct setState. */
    setText(typed);
    setReading("text");
    setPhase("analyzing");
    const draft = await understand({ source: "text", text: typed, locale });
    applyDraft(draft, { fresh: true });
    patchProfile({
      transcript: typed,
      destination: draft.destination.city ?? destination,
      sources: addSource(profile.sources, "text"),
    });
    setPhase("idle");
    onDone();
  }

  /**
   * The home search pill hands the sentence over in the profile and asks for it to be
   * read straight away. Guarded by a ref rather than by state so React's development
   * double-invoke cannot fire two understanding calls for one sentence.
   */
  useEffect(() => {
    if (!autoStart || autoStarted.current) return;
    const seed = (profile.transcript ?? "").trim();
    if (!seed) return;
    autoStarted.current = true;
    /* Kicking off a network read on arrival is exactly what an effect is for; the state it
       writes belongs to that request, not to a render cascade. Fires once, when the
       hydrated transcript first appears. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void readText(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, profile.transcript]);

  /** The CTA: text if typed, a link if pasted, otherwise just explore. Never a dead end. */
  async function launch() {
    const typed = text.trim();
    if (typed) {
      await readText(typed);
      return;
    }
    if (link.trim()) {
      await submitLink();
      return;
    }
    patchProfile({ destination, sources: addSource(profile.sources, "manual") });
    onDone({ advance: true });
  }

  if (phase === "recognised" && recognition) {
    return (
      <RecognitionReveal
        preview={preview}
        recognition={recognition}
        onConfirm={recognition.draft.source === "url" ? () => onDone({ advance: true }) : confirmImage}
        onPickCandidate={pickCandidate}
        onRetry={() => {
          setPhase("idle");
          setRecognition(null);
        }}
      />
    );
  }

  /**
   * Analysing.
   *
   * What the traveller gave us stays on screen, in the same box, in the same place: the
   * card they typed into becomes the card that is thinking. It used to unmount the whole
   * composer and leave one small strip on an empty screen, which reads as "the app lost
   * my text" — the opposite of what this moment is for.
   *
   * The bar is indeterminate on purpose. The old one tweened `width` from 12% to 88% over
   * a fixed 2.4s while the request finished in about one second: a fake percentage, on a
   * layout-animating property, that visibly stalled. We do not know how long understanding
   * takes, so we do not pretend to.
   */
  if (phase === "analyzing") {
    return (
      <div className="space-y-5">
        <motion.div
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="border-primary/40 bg-surface rounded-lg border p-4"
          aria-busy="true"
        >
          {reading === "text" ? (
            <p className="text-foreground text-sm leading-relaxed">{text.trim()}</p>
          ) : (
            <div className="flex items-start gap-4">
              <MediaCard src={preview} alt="" ratio="square" className="w-20 shrink-0" />
              {reading === "link" && link.trim() ? (
                <p className="text-muted-foreground min-w-0 flex-1 text-sm break-all">
                  {link.trim()}
                </p>
              ) : null}
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <p role="status" className="text-primary-ink flex-1 text-sm font-semibold">
              {t(
                reading === "image"
                  ? "home.analyzing"
                  : reading === "link"
                    ? "home.readingLink"
                    : "home.understanding",
              )}
            </p>
          </div>
          <span aria-hidden className="analysing-track mt-2.5 block">
            <span className="analysing-bar" />
          </span>
        </motion.div>
      </div>
    );
  }

  const hasInput = Boolean(text.trim() || link.trim());

  /* Inspiration chips write plain words into the description — the same text path the
     understanding layer already reads. Tap again to take the word back out. */
  const CHIPS = ["culture", "food", "sea", "surprise"] as const;
  const chipLabel = (chip: (typeof CHIPS)[number]) => t(`home.chip.${chip}`);
  const split = (value: string) => value.split(/,\s*/).map((part) => part.trim()).filter(Boolean);
  const chipOn = (chip: (typeof CHIPS)[number]) =>
    split(text).some((part) => part.toLowerCase() === chipLabel(chip).toLowerCase());
  function toggleChip(chip: (typeof CHIPS)[number]) {
    const label = chipLabel(chip);
    setText((current) => {
      const parts = split(current);
      const on = parts.some((part) => part.toLowerCase() === label.toLowerCase());
      const next = on ? parts.filter((part) => part.toLowerCase() !== label.toLowerCase()) : [...parts, label];
      return next.join(", ").slice(0, MAX_TEXT);
    });
  }

  const linkField = (
    <div className="flex gap-2">
      <input
        type="url"
        inputMode="url"
        value={link}
        autoFocus
        onChange={(event) => {
          setLink(event.target.value);
          setLinkInvalid(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") void submitLink();
        }}
        placeholder={t("home.linkPlaceholder")}
        aria-label={t("home.pasteLink")}
        aria-invalid={linkInvalid}
        className="border-border-strong bg-surface text-foreground placeholder:text-muted-foreground h-12 min-w-0 flex-1 rounded-md border px-4 text-sm"
      />
      <Button size="md" onClick={() => void submitLink()}>
        {t("home.linkSubmit")}
      </Button>
    </div>
  );

  return (
    <div
      className="space-y-6"
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) void handleFile(file);
      }}
    >
      {/* The one primary object on the screen: a generous, quiet surface that glows on focus. */}
      <div
        className={cn(
          "border-border bg-surface rounded-[1.25rem] border transition-[border-color,box-shadow,background-color] duration-200",
          "focus-within:border-primary/60 focus-within:shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_20%,transparent),0_0_36px_-10px_color-mix(in_srgb,var(--primary)_45%,transparent)]",
          dragging && "border-primary bg-primary-soft",
        )}
      >
        <textarea
          value={text}
          maxLength={MAX_TEXT}
          rows={4}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("home.describePlaceholder")}
          aria-label={t("onboarding.inspirationTitle")}
          className="text-foreground placeholder:text-muted-foreground/80 w-full resize-none bg-transparent px-5 pt-5 pb-2 text-[0.9375rem] leading-relaxed outline-none"
        />
        <div className="flex items-center justify-between gap-3 px-4 pb-4">
          <span
            className={cn(
              "text-muted-foreground/70 text-[0.6875rem] tabular-nums transition-opacity",
              text.length === 0 && "opacity-0",
            )}
            aria-hidden={text.length === 0}
          >
            {text.length}/{MAX_TEXT}
          </span>
          <VoiceCapture onTranscript={(value) => void applyTranscript(value)} />
        </div>
      </div>

      <ul className="-mt-3 flex flex-wrap gap-2" aria-label={t("home.suggestionsTitle")}>
        {CHIPS.map((chip) => (
          <li key={chip}>
            <ChoiceChip
              selected={chipOn(chip)}
              onSelect={() => toggleChip(chip)}
              className="min-h-10 flex-none px-3.5 text-xs"
            >
              {chipLabel(chip)}
            </ChoiceChip>
          </li>
        ))}
      </ul>

      {issue ? (
        <p role="alert" className="text-danger text-xs font-semibold">
          {t(issue === "imageTooLarge" ? "errors.imageTooLarge" : "errors.unsupportedFile")}
        </p>
      ) : null}

      <div className="text-muted-foreground flex items-center gap-3 text-xs" aria-hidden>
        <span className="bg-border h-px flex-1" />
        {t("common.or")}
        <span className="bg-border h-px flex-1" />
      </div>

      <section>
        <h2 className="font-display mb-3 text-base font-semibold">{t("home.startFrom")}</h2>
        {/* Two feature cards. "From TikTok" and "From Instagram" were always one control:
            one field, one `submitLink`, and `readSocialUrl` does not branch on platform. */}
        <div className="grid grid-cols-2 gap-3 max-[340px]:grid-cols-1">
          <SourceCard
            icon={TiktokLogo}
            title="TikTok / Instagram"
            subtitle={t("home.socialSub")}
            open={open === "link"}
            onClick={() => setOpen(open === "link" ? null : "link")}
          />
          <FileCard
            icon={Camera}
            title={t("home.fromPhoto")}
            subtitle={t("home.photoSub")}
            onFile={handleFile}
          />
        </div>
        <AnimatePresence initial={false}>
          {open === "link" ? <Disclosure key="link">{linkField}</Disclosure> : null}
        </AnimatePresence>
        {linkInvalid ? (
          <p role="alert" className="text-danger mt-2 text-xs font-semibold">
            {t("home.linkInvalid")}
          </p>
        ) : null}

        {/* Progressive disclosure: the screenshot and the place stay, one tap further. */}
        <button
          type="button"
          aria-expanded={more}
          onClick={() => setMore(!more)}
          className="pressable text-primary-ink mx-auto mt-2 flex min-h-11 items-center gap-1.5 px-3 text-sm font-medium"
        >
          {t("home.moreOptions")}
          <CaretDown
            aria-hidden
            className={cn("size-4 transition-transform duration-200", more && "rotate-180")}
            weight="bold"
          />
        </button>
        <AnimatePresence initial={false}>
          {more ? (
            <Disclosure key="more">
              <div className="space-y-2.5">
                {/* Same picker, same `handleFile`, same understanding as the photo card — but
                    nobody thinks to try a screenshot unless the product names it. */}
                <FileRow icon={FrameCorners} label={t("home.fromScreenshot")} onFile={handleFile} />
                <SourceRow
                  icon={MapPin}
                  label={t("home.fromPlace")}
                  open={open === "place"}
                  onClick={() => setOpen(open === "place" ? null : "place")}
                />
                {/* The way in for the traveller who does not yet know what to describe.
                    Every other row here takes something they already have — a photo, a
                    link, a place they picked. This one asks them a question back. */}
                <SourceRow
                  icon={ChatCircleDots}
                  label={t("chat.homeCta")}
                  onClick={() => setGuideOpen(true)}
                />
                <AnimatePresence initial={false}>
                  {open === "place" ? (
                    <Disclosure key="place">
                      <ul className="flex flex-wrap gap-2">
                        {MOODS.map((mood) => (
                          <li key={mood.id}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full"
                              onClick={() => choosePlace(mood)}
                            >
                              {t(mood.titleKey)}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </Disclosure>
                  ) : null}
                </AnimatePresence>
              </div>
            </Disclosure>
          ) : null}
        </AnimatePresence>
      </section>

      {/* The label has to match what the tap will do: "Launch AI analysis" with something to
          read, "Continue" with an empty composer. The first tap in the product must not lie. */}
      <Button
        size="lg"
        block
        onClick={() => void launch()}
        className="shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--primary)_55%,transparent)]"
      >
        {hasInput ? t("home.launch") : t("common.continue")}
        {hasInput ? (
          <Sparkle aria-hidden className="size-4" />
        ) : (
          <ArrowRight aria-hidden className="size-4 rtl:rotate-180" weight="bold" />
        )}
      </Button>

      {/*
        The same conversation `/chat` runs, in a sheet.
        `GuideConversation` owns the turns, the profile it learns, and the hand-off to the
        engine; this screen only decides where the two halves sit. Building a day from in
        here navigates to /trip exactly as it does from the full screen — `onBuilt` is only
        so the sheet is closed rather than left open behind the new route.
      */}
      <BottomSheet
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        title={t("chat.title")}
        /* A conversation needs room to be one; at the sheet's natural height it opened as
           a letterbox and every reply pushed the composer off-screen. */
        className="h-[85vh]"
      >
        <GuideConversation onBuilt={() => setGuideOpen(false)}>
          {({ composer, thread }) => (
            <>
              {thread}
              {/* Sticky inside the sheet's own scroller rather than a second scroll
                  container: the sheet already scrolls its children, and nesting two is how
                  a thread ends up scrolling inside a box that also scrolls. The negative
                  margin bleeds the bar to the sheet's edges. */}
              <div className="bg-background border-border sticky bottom-0 -mx-5 mt-3 border-t px-5 py-3">
                {composer}
              </div>
            </>
          )}
        </GuideConversation>
      </BottomSheet>
    </div>
  );
}

/** A draft dressed as a Recognition, so one reveal serves every modality. */
function recognitionOf(draft: TripIntentDraft): Recognition {
  return {
    destination: draft.destination.city,
    detectedPlace: draft.destination.detectedPlace,
    detectedPoiId: draft.destination.detectedPoiId,
    labels: draft.evidence.visualClues.slice(0, 3),
    /* A score is only printed when a provider produced one — never for a keyword pass. */
    confidence:
      draft.degraded || draft.destination.confidence === 0 ? null : draft.destination.confidence,
    usedFallback: draft.degraded,
    draft,
  };
}
