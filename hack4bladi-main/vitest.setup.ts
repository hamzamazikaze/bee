/**
 * jsdom gaps the redesigned screens rely on. Nothing here fakes application
 * behaviour — only browser APIs jsdom does not implement.
 */
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

/* jsdom 30 under Node 26 exposes no usable localStorage (Node's own disabled global
   shadows it). src/lib/storage guards every access, so the app works either way —
   but a real store lets the tests exercise the persistence path. */
if (!window.localStorage) {
  const map = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, String(v)),
      removeItem: (k: string) => void map.delete(k),
      clear: () => map.clear(),
      key: (i: number) => [...map.keys()][i] ?? null,
      get length() {
        return map.size;
      },
    },
  });
}

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// motion/react measures elements; jsdom has no layout engine.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = "";
    thresholds = [];
  } as unknown as typeof IntersectionObserver;
}

// <dialog> is not implemented in jsdom.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
  };
}

/* jsdom implements no scrolling at all, so `scrollIntoView` is simply absent. Any
   component that follows its own content down — the guide's transcript, for one — throws
   on mount without this. A no-op is the honest shim: there is no layout to scroll. */
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

/* MapLibre needs WebGL and a real worker. The map has its own manual QA; these are
   smoke tests for the screens AROUND it. */
vi.mock("@/features/map", () => ({
  TripMap: () => null,
}));

afterEach(cleanup);
