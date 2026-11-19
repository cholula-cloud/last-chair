import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.includes("/src/game/") && specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      return next(specifier + ".ts", context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    return next(url, url.includes("/src/game/") && url.endsWith(".ts")
      ? { ...context, format: "module-typescript" }
      : context);
  },
});
