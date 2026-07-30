import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// test.globals nao esta habilitado no vitest.config.ts, entao o auto-cleanup
// do @testing-library/react (que depende de um afterEach global) nunca se
// registra sozinho - sem isso, o DOM de um teste vaza pro proximo.
afterEach(() => {
  cleanup();
});

// jsdom nao implementa scrollIntoView - MessageList usa isso pra auto-scroll.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
