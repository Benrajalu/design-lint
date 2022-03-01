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

export const FigmaFriendlyTypography = () => {
  const typeTokens = availableTypography();
  const fontWeights = {
    200: "Light",
    400: "Regular",
    500: "Medium",
    600: "SemiBold",
    800: "Bold"
  };
  return pipe(
    typeTokens,
    Array.reduce({}, (acc, current) => {
      // tslint:disable-next-line:max-line-length
      const cleanFigmaValue = `${current.fontFamily} ${
        fontWeights[current.fontWeight]
      } / ${parseFloat(current.fontSize.replace("rem", "")) *
        10} (${current.lineHeight.replace("%", "")} line-height)`;
      const cleanName = current.name
        .replace("coral", "")
        .split(/(?=[A-Z])/)
        .join(" / ");
      return {
        ...acc,
        [cleanName]: {
          figmaValue: cleanFigmaValue,
          name: cleanName
        }
      };
    })
  );
};
