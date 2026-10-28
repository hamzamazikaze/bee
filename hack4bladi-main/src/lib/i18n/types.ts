/** Widens string leaves: `en` is `as const`, translations must not have to match literals. */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends string
    ? string
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

type Join<K, P> = K extends string
  ? P extends string
    ? `${K}${P extends "" ? "" : "."}${P}`
    : never
  : never;

/** Dotted key paths of a message catalog, e.g. "onboarding.interest.food". */
export type MessagePath<T> = T extends object
  ? {
      [K in keyof T]-?: K extends string
        ? T[K] extends string
          ? K
          : Join<K, MessagePath<T[K]>>
        : never;
    }[keyof T]
  : never;
