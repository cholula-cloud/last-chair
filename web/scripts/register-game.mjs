import path from "node:path";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

const webRoot = path.dirname(import.meta.dirname);
const srcRoot = path.join(webRoot, "src");

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) {
      const rel = specifier.slice(2).replace(/\.[cm]?[jt]sx?$/, "");
      const file = path.join(srcRoot, rel + ".ts");
      return { shortCircuit: true, url: pathToFileURL(file).href };
    }
    if (
      context.parentURL?.includes("/src/") &&
      specifier.startsWith(".") &&
      !/\.([cm]?[jt]sx?|json)$/i.test(specifier)
    ) {
      return next(specifier + ".ts", context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith(".json")) {
      return next(url, { ...context, format: "json", importAttributes: { type: "json" } });
    }
    const isSrcTs = url.includes("/src/") && url.endsWith(".ts");
    return next(url, isSrcTs ? { ...context, format: "module-typescript" } : context);
  },
});