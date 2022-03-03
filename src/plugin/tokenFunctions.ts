import { pipe } from "fp-ts/function";
import * as ArrayFP from "fp-ts/Array";
import * as N from "fp-ts/number";
import tokens from "@talend/design-tokens/lib/light/dictionary";

export function getAllLegalPaintStyles() {
  return pipe(
    tokens,
    ArrayFP.filter(token => token.type === "color")
  );
}

export function getLegalTextPaintStyles() {
  return pipe(
    tokens,
    ArrayFP.filter(
      token =>
        token.type === "color" && token.name.toLowerCase().includes("text")
    )
  );
}

export function getLegalBackgroundPaintStyles() {
  return pipe(
    tokens,
    ArrayFP.filter(
      token =>
        token.type === "color" &&
        (token.name.toLowerCase().includes("background") ||
          token.name.toLowerCase().includes("chart"))
    )
  );
}

export function getLegalShapePaintStyles() {
  return pipe(
    tokens,
    ArrayFP.filter(
      token =>
        token.type === "color" &&
        (token.name.toLowerCase().includes("background") ||
          token.name.toLowerCase().includes("chart") ||
          token.name.toLowerCase().includes("icon"))
    )
  );
}

export function getLegalVectorPaintStyles() {
  return pipe(
    tokens,
    ArrayFP.filter(
      token =>
        token.type === "color" &&
        (token.name.toLowerCase().includes("text") ||
          token.name.toLowerCase().includes("icon"))
    )
  );
}

export function getLegalBorderPaintStyles() {
  return pipe(
    tokens,
    ArrayFP.filter(
      token =>
        token.type === "color" && token.name.toLowerCase().includes("border")
    )
  );
}

export function getLegalTextStyles() {
  return pipe(
    tokens,
    ArrayFP.filter(token => token.type === "typography")
  );
}

export function getLegalEffectStyles() {
  return pipe(
    tokens,
    ArrayFP.filter(token => token.type === "shadow")
  );
}

export const availableRadii = () => {
  return pipe(
    tokens,
    ArrayFP.filter(entry => entry.type === "radius"),
    ArrayFP.map(radius => {
      const cleanRadius = radius.value.replace("rem", "");
      return Number(cleanRadius) * 10;
    }),
    ArrayFP.sort(N.Ord)
  );
};

export const availableBorders = () => {
  return pipe(
    tokens,
    ArrayFP.filter(entry => entry.type === "border")
  );
};

export const availableTypography = () => {
  return pipe(
    tokens,
    ArrayFP.filter(entry => entry.type === "typography")
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
    ArrayFP.reduce({}, (acc, current) => {
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

export const getTheme = async () => {
  const request = new XMLHttpRequest();
  request.open(
    "GET",
    "https://api.figma.com/v1/files/G5iL99Z4KEZVozB8BeVXxL/styles"
  );
  request.setRequestHeader("X-FIGMA-TOKEN", "SECRET");
  request.responseType = "json";
  request.onload = () => {
    const response = request.response;
    window.parent.postMessage(
      {
        pluginMessage: {
          type: "setTheme",
          value: response.meta.styles
        }
      },
      "*"
    );
  };
  request.send();
};
