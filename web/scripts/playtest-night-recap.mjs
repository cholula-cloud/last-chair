/** Phone night recap: fare/snow controls sit under 2. Tomorrow. */
export async function openPlanTomorrow(page) {
  const tab = page.getByRole("tab", { name: /^(2\. Tomorrow|Plan tomorrow)$/ });
  if ((await tab.count()) > 0 && (await tab.isVisible())) {
    await tab.tap({ force: true });
  }
}

export async function openTodaysResults(page) {
  const tab = page.getByRole("tab", { name: /^(1\. Tonight|Today's results)$/ });
  if ((await tab.count()) === 0 || !(await tab.isVisible())) return;
  if (await tab.getAttribute("aria-selected") === "true") return;
  await tab.tap({ force: true });
}