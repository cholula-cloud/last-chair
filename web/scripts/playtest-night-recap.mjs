/** Phone night recap (PR #125): fare/snow controls sit under Plan tomorrow. */
export async function openPlanTomorrow(page) {
  const tab = page.getByRole("tab", { name: "Plan tomorrow" });
  if ((await tab.count()) > 0 && (await tab.isVisible())) {
    await tab.tap({ force: true });
  }
}

export async function openTodaysResults(page) {
  const tab = page.getByRole("tab", { name: "Today's results" });
  if ((await tab.count()) === 0 || !(await tab.isVisible())) return;
  if (await tab.getAttribute("aria-selected") === "true") return;
  await tab.tap({ force: true });
}