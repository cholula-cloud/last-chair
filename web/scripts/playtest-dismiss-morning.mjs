/** Dismiss the morning note when it sits above the map rail on narrow phones. */
export async function dismissMorningNoteIfPresent(page) {
  const dismiss = page.getByRole("button", { name: "Dismiss morning note" });
  if (await dismiss.isVisible()) await dismiss.tap({ force: true });
}