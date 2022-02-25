import { pipe } from "fp-ts/function";
import * as Array from "fp-ts/Array";
import * as N from "fp-ts/number";
import tokens from "@talend/design-tokens/lib/light/dictionary";

export const availableRadii = () => {
  return pipe(
    tokens,
    Array.filter(entry => entry.type === "radius"),
    Array.map(radius => {
      const cleanRadius = radius.value.replace("rem", "");
      return Number(cleanRadius) * 10;
    }),
    Array.sort(N.Ord)
  );
};

export const availableBorders = () => {
  return pipe(
    tokens,
    Array.filter(entry => entry.type === "border")
  );
};

export const availableTypography = () => {
  return pipe(
    tokens,
    Array.filter(entry => entry.type === "typography")
  );
};
