import { createElement, type FunctionComponent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RadioCard } from "./RadioCard";

const render = (from?: string) =>
  renderToStaticMarkup(createElement(RadioCard as FunctionComponent<Record<string, unknown>>, { title: "School bus offer", announce: false, from }, "Body text."));

describe("RadioCard speaker", () => {
  it("defaults to Maris with the plain screen-reader title", () => {
    const html = render();
    expect(html).toContain("Maris on Route 100 Radio");
    expect(html).toContain("School bus offer. </span>");
  });

  it("names a different speaker visibly and for screen readers, and keeps the aria-label", () => {
    const html = render("Vivian Cho, Summit Pass Corp");
    expect(html).toContain("Vivian Cho, Summit Pass Corp");
    expect(html).toContain("School bus offer. Vivian Cho, Summit Pass Corp says: </span>");
    expect(html).toContain('aria-label="Route 100 Radio: School bus offer"');
    expect(html).not.toContain("Maris on Route 100 Radio");
  });
});
