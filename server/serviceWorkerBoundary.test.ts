import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const serviceWorkerSource = readFileSync(resolve(process.cwd(), "client/public/sw.js"), "utf8");

type RegisteredListener = (event: { request: RequestLike; respondWith: (value: Promise<unknown>) => void }) => void;
type RequestLike = { method: string; url: string; mode: string };

function loadFetchListener() {
  const listeners = new Map<string, RegisteredListener>();
  const cache = {
    match: async () => undefined,
    put: async () => undefined,
  };
  const context = {
    self: {
      location: { origin: "http://localhost" },
      addEventListener: (type: string, listener: RegisteredListener) => listeners.set(type, listener),
      clients: { claim: async () => undefined, matchAll: async () => [] },
      skipWaiting: async () => undefined,
    },
    caches: { open: async () => cache, keys: async () => [], match: async () => undefined },
    fetch: async () => ({ ok: true, clone: () => ({ ok: true }) }),
    URL,
  };
  runInNewContext(serviceWorkerSource, context);
  const listener = listeners.get("fetch");
  if (!listener) throw new Error("service worker fetch listener was not registered");
  return listener;
}

async function dispatchFetch(listener: RegisteredListener, pathname: string) {
  let responsePromise: Promise<unknown> | null = null;
  listener({
    request: { method: "GET", url: `http://localhost${pathname}`, mode: "cors" },
    respondWith: value => { responsePromise = value; },
  });
  return responsePromise;
}

describe("service worker runtime map boundary", () => {
  it("routes only the active Obsidian map module to cache-first handling", async () => {
    const listener = loadFetchListener();
    const activeResponse = await dispatchFetch(listener, "/offline-map-modules/obsidian-frontier.json");
    const futureResponse = await dispatchFetch(listener, "/offline-map-modules/map-002-ashen-obsidian-plains.json");

    expect(activeResponse).not.toBeNull();
    expect(futureResponse).toBeNull();
  });

  it("does not treat malformed or nested map module paths as runtime-approved", async () => {
    const listener = loadFetchListener();
    const malformedResponse = await dispatchFetch(listener, "/offline-map-modules/%E0%A4%A.json");
    const nestedResponse = await dispatchFetch(listener, "/offline-map-modules/obsidian-frontier/extra.json");

    expect(malformedResponse).toBeNull();
    expect(nestedResponse).toBeNull();
  });
});
