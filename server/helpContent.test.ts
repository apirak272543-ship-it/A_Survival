import { describe, expect, it } from "vitest";
import { FIRST_RUN_HINTS, HELP_ARTICLES, getHelpArticle } from "../client/src/game/help/helpContent";

describe("onboarding help content", () => {
  it("covers identity, expedition, home, companion, offline and integrity guidance", () => {
    expect(HELP_ARTICLES.map(article => article.id)).toEqual(["identity", "expedition", "home", "companion", "offline", "integrity"]);
    for (const article of HELP_ARTICLES) {
      expect(article.body.length).toBeGreaterThan(40);
      expect(article.tips.length).toBeGreaterThanOrEqual(3);
      expect(getHelpArticle(article.id)).toBe(article);
    }
  });

  it("provides first-run hints for identity, map cache and touch controls", () => {
    expect(FIRST_RUN_HINTS.map(hint => hint.id)).toEqual(["identity", "maps", "game"]);
    expect(FIRST_RUN_HINTS.every(hint => hint.title.length > 0 && hint.body.length > 0)).toBe(true);
  });
});
