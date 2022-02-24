import { pipe } from "fp-ts/function";
import * as Array from "fp-ts/Array";
// Linting functions

// Generic function for creating an error object to pass to the app.
import { availableRadii } from "./tokenFunctions";

export function createErrorObject(node, type, message, value?, rule?) {
  const error = {
    message: "",
    type: "",
    node: "",
    value: "",
    rule: ""
  };

  error.message = message;
  error.type = type;
  error.node = node;

  if (value !== undefined) {
    error.value = value;
  }

  if (rule !== undefined) {
    error.rule = rule;
  }

  return error;
}

// Determine a nodes fills
export function determineFill(fills) {
  const fillValues = [];

  fills.forEach(fill => {
    if (fill.type === "SOLID") {
      const rgbObj: any = convertColor(fill.color);
      fillValues.push(RGBToHex(rgbObj.r, rgbObj.g, rgbObj.b));
    } else if (fill.type === "IMAGE") {
      fillValues.push("Image - " + fill.imageHash);
    } else {
      const gradientValues = [];
      fill.gradientStops.forEach(gradientStops => {
        const gradientColorObject: any = convertColor(gradientStops.color);
        gradientValues.push(
          RGBToHex(
            gradientColorObject.r,
            gradientColorObject.g,
            gradientColorObject.b
          )
        );
      });
      const gradientValueString = gradientValues.toString();
      fillValues.push(`${fill.type} ${gradientValueString}`);
    }
  });

  return fillValues[0];
}

// Lint border radius
export function checkRadius(node, errors, radiusValues) {
  const cornerType = node.cornerRadius;

  if (typeof cornerType !== "symbol") {
    if (cornerType === 0) {
      return;
    }
  }

  // If the radius isn't even on all sides, check each corner.
  if (typeof cornerType === "symbol") {
    if (radiusValues.indexOf(node.topLeftRadius) === -1) {
      return errors.push(
        createErrorObject(
          node,
          "radius",
          "Incorrect Top Left Radius",
          node.topRightRadius,
          `Pick from these: ${availableRadii().join(", ")}`
        )
      );
    } else if (radiusValues.indexOf(node.topRightRadius) === -1) {
      return errors.push(
        createErrorObject(
          node,
          "radius",
          "Incorrect top right radius",
          node.topRightRadius,
          `Pick from these: ${availableRadii().join(", ")}`
        )
      );
    } else if (radiusValues.indexOf(node.bottomLeftRadius) === -1) {
      return errors.push(
        createErrorObject(
          node,
          "radius",
          "Incorrect bottom left radius",
          node.bottomLeftRadius,
          `Pick from these: ${availableRadii().join(", ")}`
        )
      );
    } else if (radiusValues.indexOf(node.bottomRightRadius) === -1) {
      return errors.push(
        createErrorObject(
          node,
          "radius",
          "Incorrect bottom right radius",
          node.bottomRightRadius,
          `Pick from these: ${availableRadii().join(", ")}`
        )
      );
    } else {
      return;
    }
  } else {
    if (radiusValues.indexOf(node.cornerRadius) === -1) {
      return errors.push(
        createErrorObject(
          node,
          "radius",
          "Incorrect border radius",
          node.cornerRadius,
          `Pick from these: ${availableRadii().join(", ")}`
        )
      );
    } else {
      return;
    }
  }
}

// Custom Lint rule that isn't being used yet!
// that ensures our text fills aren't using styles (design tokens) meant for backgrounds.
export function customCheckTextFills(node, errors) {
  const allStyles = figma.getLocalPaintStyles();
  // Here we create an array of style keys (https://www.figma.com/plugin-docs/api/PaintStyle/#key)
  // that we want to make sure our text layers are using.
  const fillsToCheck = pipe(
    allStyles,
    Array.filter(paintStyle => paintStyle.name.includes("text")),
    Array.map(
      textPaintStyle => textPaintStyle.id.replace("S:", "").split(",")[0]
    )
  );

  let nodeFillStyle = node.fillStyleId;

  // If there are multiple text styles on a single text layer, we can't lint it
  // we can return an error instead.
  if (typeof nodeFillStyle === "symbol") {
    return errors.push(
      createErrorObject(
        node, // Node object we use to reference the error (id, layer name, etc)
        "fill", // Type of error (fill, text, effect, etc)
        "Mixing two styles together", // Message we show to the user
        "Multiple Styles", // Normally we return a hex value here
        "We can lint here. Ensure all the styles used are tokens"
      )
    );
  }

  const currentStyle = pipe(
    allStyles,
    Array.filter(style => style.id === nodeFillStyle),
    Array.map(current => current.name)
  );

  // We strip the additional style key characters so we can check
  // to see if the fill is being used incorrectly.
  nodeFillStyle = nodeFillStyle.replace("S:", "");
  nodeFillStyle = nodeFillStyle.split(",")[0];

  console.log(currentStyle);

  // If the node (layer) has a fill style, then check to see if there's an error.
  if (nodeFillStyle !== "") {
    // If we find the layer has a fillStyle that doesn't match in the array create an error.
    if (!fillsToCheck.includes(nodeFillStyle)) {
      return errors.push(
        createErrorObject(
          node, // Node object we use to reference the error (id, layer name, etc)
          "fill", // Type of error (fill, text, effect, etc)
          "Incorrect text color", // Message we show to the user
          currentStyle[0] ? currentStyle[0] : "Not a text token!",
          'Use semantic ".../text" tokens'
        )
      );
    }
    // If there is no fillStyle on this layer,
    // check to see why with our default linting function for fills.
  } else {
    checkFills(node, errors);
  }
}

// Check for effects like shadows, blurs etc.
export function checkEffects(node, errors) {
  if (node.effects.length) {
    if (node.effectStyleId === "") {
      const effectsArray = [];

      node.effects.forEach(effect => {
        const effectsObject = {
          type: "",
          radius: "",
          offsetX: "",
          offsetY: "",
          fill: "",
          value: ""
        };

        // All effects have a radius.
        effectsObject.radius = effect.radius;

        if (effect.type === "DROP_SHADOW") {
          effectsObject.type = "Drop Shadow";
        } else if (effect.type === "INNER_SHADOW") {
          effectsObject.type = "Inner Shadow";
        } else if (effect.type === "LAYER_BLUR") {
          effectsObject.type = "Layer Blur";
        } else {
          effectsObject.type = "Background Blur";
        }

        if (effect.color) {
          const effectsFill: any = convertColor(effect.color);
          effectsObject.fill = RGBToHex(
            effectsFill.r,
            effectsFill.g,
            effectsFill.b
          );
          effectsObject.offsetX = effect.offset.x;
          effectsObject.offsetY = effect.offset.y;
          // tslint:disable-next-line:max-line-length
          effectsObject.value = `${effectsObject.type} ${effectsObject.fill} ${effectsObject.radius}px X: ${effectsObject.offsetX}, Y: ${effectsObject.offsetY}`;
        } else {
          effectsObject.value = `${effectsObject.type} ${effectsObject.radius}px`;
        }

        effectsArray.unshift(effectsObject);
      });

      const currentStyle = effectsArray[0].value;

      return errors.push(
        createErrorObject(
          node,
          "effects",
          "Missing effects style",
          currentStyle
        )
      );
    } else {
      return;
    }
  }
}

export function checkFills(node, errors) {
  if (node.fills.length && node.visible === true) {
    if (
      node.fillStyleId === "" &&
      node.fills[0].type !== "IMAGE" &&
      node.fills[0].visible === true
    ) {
      // We may need an array to loop through fill types.
      return errors.push(
        createErrorObject(
          node,
          "fill",
          "Missing fill style",
          determineFill(node.fills)
        )
      );
    } else {
      return;
    }
  }
}

export function checkStrokes(node, errors) {
  if (node.strokes.length) {
    if (node.strokeStyleId === "" && node.visible === true) {
      const strokeObject = {
        strokeWeight: "",
        strokeAlign: "",
        strokeFills: []
      };

      strokeObject.strokeWeight = node.strokeWeight;
      strokeObject.strokeAlign = node.strokeAlign;
      strokeObject.strokeFills = determineFill(node.strokes);

      const currentStyle = `${strokeObject.strokeFills} / ${strokeObject.strokeWeight} / ${strokeObject.strokeAlign}`;

      return errors.push(
        createErrorObject(
          node,
          "stroke",
          "Missing stroke color style",
          currentStyle,
          "Use a design token for the stroke color"
        )
      );
    } else {
      return;
    }
  }
}

export function checkType(node, errors) {
  if (node.textStyleId === "" && node.visible === true) {
    const textObject = {
      font: "",
      fontStyle: "",
      fontSize: "",
      lineHeight: {}
    };

    textObject.font = node.fontName.family;
    textObject.fontStyle = node.fontName.style;
    textObject.fontSize = node.fontSize;

    // Line height can be "auto" or a pixel value
    if (node.lineHeight.value !== undefined) {
      textObject.lineHeight = node.lineHeight.value;
    } else {
      textObject.lineHeight = "Auto";
    }

    // tslint:disable-next-line:max-line-length
    const currentStyle = `${textObject.font} ${textObject.fontStyle} / ${textObject.fontSize} (${textObject.lineHeight} line-height)`;

    return errors.push(
      createErrorObject(node, "text", "Missing text style", currentStyle)
    );
  } else {
    return;
  }
}

// Utility functions for color conversion.
const convertColor = color => {
  const colorObj = color;
  const figmaColor = {};

  Object.entries(colorObj).forEach(cf => {
    const [key, value] = cf;

    if (["r", "g", "b"].includes(key)) {
      figmaColor[key] = (255 * (value as number)).toFixed(0);
    }
    if (key === "a") {
      figmaColor[key] = value;
    }
  });
  return figmaColor;
};

function RGBToHex(r, g, b) {
  r = Number(r).toString(16);
  g = Number(g).toString(16);
  b = Number(b).toString(16);

  if (r.length === 1) r = "0" + r;
  if (g.length === 1) g = "0" + g;
  if (b.length === 1) b = "0" + b;

  return "#" + r + g + b;
}
