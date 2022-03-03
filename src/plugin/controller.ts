import {
  customCheckEffects,
  checkFills,
  checkRadius,
  customCheckBackgroundFills,
  customCheckStrokes,
  customCheckTextFills,
  customCheckTextStyles,
  customCheckVectorFills,
  customCheckShapeFills
} from "./lintingFunctions";
import { availableRadii } from "./tokenFunctions";

figma.showUI(__html__, { width: 360, height: 580 });

let borderRadiusArray = [0, ...availableRadii()];
let originalNodeTree = [];
let lintVectors = false;
// let defaultTheme = [];

figma.ui.onmessage = async msg => {
  // Fetch a specific node by ID.
  if (msg.type === "fetch-layer-data") {
    const layer = figma.getNodeById(msg.id);
    const layerArray = [];

    // Using selection and viewport requires an array.
    layerArray.push(layer);

    // Moves the layer into focus and selects so the user can update it.
    // figma.notify(`Layer ${layer.name} selected`, { timeout: 750 });
    figma.currentPage.selection = layerArray;
    figma.viewport.scrollAndZoomIntoView(layerArray);

    const layerData = JSON.stringify(layer, [
      "id",
      "name",
      "description",
      "fills",
      "key",
      "type",
      "remote",
      "paints",
      "fontName",
      "fontSize",
      "font"
    ]);

    figma.ui.postMessage({
      type: "fetched layer",
      message: layerData
    });
  }

  // Could this be made less expensive?
  if (msg.type === "update-errors") {
    figma.ui.postMessage({
      type: "updated errors",
      errors: lint(originalNodeTree)
    });
  }

  // Updates client storage with a new ignored error
  // when the user selects "ignore" from the context menu
  if (msg.type === "update-storage") {
    const arrayToBeStored = JSON.stringify(msg.storageArray);
    figma.clientStorage.setAsync("storedErrorsToIgnore", arrayToBeStored);
  }

  // Clears all ignored errors
  // invoked from the settings menu
  if (msg.type === "update-storage-from-settings") {
    const arrayToBeStored = JSON.stringify(msg.storageArray);
    figma.clientStorage.setAsync("storedErrorsToIgnore", arrayToBeStored);

    figma.ui.postMessage({
      type: "reset storage",
      storage: arrayToBeStored
    });

    figma.notify("Cleared ignored errors", { timeout: 1000 });
  }

  // Changes the linting rules, invoked from the settings menu
  if (msg.type === "update-lint-rules-from-settings") {
    lintVectors = msg.boolean;
  }

  // For when the user updates the border radius values to lint from the settings menu.
  if (msg.type === "update-border-radius") {
    const newString = msg.radiusValues.replace(/\s+/g, "");
    let newRadiusArray = newString.split(",");
    newRadiusArray = newRadiusArray
      .filter(x => x.trim().length && !isNaN(x))
      .map(Number);

    // Most users won't add 0 to the array of border radius so let's add it in for them.
    if (newRadiusArray.indexOf(0) === -1) {
      newRadiusArray.unshift(0);
    }

    // Update the array we pass into checkRadius for linting.
    borderRadiusArray = newRadiusArray;

    // Save this value in client storage.
    const radiusToBeStored = JSON.stringify(borderRadiusArray);
    figma.clientStorage.setAsync("storedRadiusValues", radiusToBeStored);

    figma.ui.postMessage({
      type: "fetched border radius",
      storage: JSON.stringify(borderRadiusArray)
    });

    figma.notify("Saved new border radius values", { timeout: 1000 });
  }

  if (msg.type === "reset-border-radius") {
    borderRadiusArray = availableRadii();
    figma.clientStorage.setAsync("storedRadiusValues", []);

    figma.ui.postMessage({
      type: "fetched border radius",
      storage: JSON.stringify(borderRadiusArray)
    });

    figma.notify("Reset border radius value", { timeout: 1000 });
  }

  if (msg.type === "select-multiple-layers") {
    const layerArray = msg.nodeArray;
    const nodesToBeSelected = [];

    layerArray.forEach(item => {
      const layer = figma.getNodeById(item);
      // Using selection and viewport requires an array.
      nodesToBeSelected.push(layer);
    });

    // Moves the layer into focus and selects so the user can update it.
    figma.currentPage.selection = nodesToBeSelected;
    figma.viewport.scrollAndZoomIntoView(nodesToBeSelected);
    figma.notify("Multiple layers selected", { timeout: 1000 });
  }

  if (msg.type === "select-multiple-hidden-layers") {
    const layerArray = msg.nodeArray;
    const nodesToBeSelected = [];

    layerArray.forEach(item => {
      const layer: BaseNode = figma.getNodeById(item);
      const isNodeHidden =
        !["DOCUMENT", "PAGE"].includes(layer.type) &&
        !(layer as SceneNode).visible;
      if (isNodeHidden) {
        // Using selection and viewport requires an array.
        nodesToBeSelected.push(layer);
      }
    });

    // Moves the layer into focus and selects so the user can update it.
    figma.currentPage.selection = nodesToBeSelected;
    figma.viewport.scrollAndZoomIntoView(nodesToBeSelected);
    figma.notify("Multiple layers selected", { timeout: 1000 });
  }

  /*if (msg.type === "setTheme") {
    console.log({msg});
    defaultTheme = msg.value;
    figma.ui.postMessage({
      type: "readyToLaunch",
    });
  }*/

  // Serialize nodes to pass back to the UI.
  function serializeNodes(nodes) {
    const serializedNodes = JSON.stringify(nodes, [
      "name",
      "type",
      "children",
      "id"
    ]);

    return serializedNodes;
  }

  function lint(nodes, lockedParentNode?) {
    const errorArray = [];
    const childArray = [];

    nodes.forEach(node => {
      let isLayerLocked;

      // Create a new object.
      const newObject: any = {};

      // Give it the existing node id.
      newObject.id = node.id;

      // Don't lint locked layers or the children/grandchildren of locked layers.
      if (lockedParentNode === undefined && node.locked === true) {
        isLayerLocked = true;
      } else if (lockedParentNode === undefined && node.locked === false) {
        isLayerLocked = false;
      } else if (lockedParentNode === false && node.locked === true) {
        isLayerLocked = true;
      } else {
        isLayerLocked = lockedParentNode;
      }

      if (isLayerLocked === true || !node.visible) {
        newObject.errors = [];
      } else {
        newObject.errors = determineType(node);
      }

      // Recursively run this function to flatten out children and grandchildren nodes
      if (node.children && node.visible) {
        node.children.forEach(childNode => {
          childArray.push(childNode.id);
        });

        newObject.children = childArray;

        // If the layer is locked, pass the optional parameter to the recursive Lint
        // function to indicate this layer is locked.
        if (isLayerLocked === true) {
          errorArray.push(...lint(node.children, true));
        } else {
          errorArray.push(...lint(node.children, false));
        }
      }

      errorArray.push(newObject);
    });

    return errorArray;
  }

  // Initialize the app
  if (msg.type === "init-app") {
    figma.ui.postMessage({
      type: "fetchTheme"
    });
  }
  if (msg.type === "run-app") {
    if (figma.currentPage.selection.length === 0) {
      figma.notify("Select a frame(s) to get started", { timeout: 2000 });
      return;
    } else {
      const nodes = figma.currentPage.selection;

      // Maintain the original tree structure so we can enable
      // refreshing the tree and live updating errors.
      // @ts-ignore
      originalNodeTree = nodes;

      // Pass the array back to the UI to be displayed.
      figma.ui.postMessage({
        type: "complete",
        message: serializeNodes(nodes),
        errors: lint(nodes)
      });

      figma.notify(`Design lint is running and will auto refresh for changes`, {
        timeout: 2000
      });

      figma.clientStorage.getAsync("storedErrorsToIgnore").then(result => {
        figma.ui.postMessage({
          type: "fetched storage",
          storage: result
        });
      });

      figma.clientStorage.getAsync("storedRadiusValues").then(result => {
        if (result.length) {
          borderRadiusArray = JSON.parse(result);

          figma.ui.postMessage({
            type: "fetched border radius",
            storage: result
          });
        }
      });
    }
  }

  function determineType(node) {
    switch (node.type) {
      case "SLICE":
      case "GROUP": {
        // Groups styles apply to their children so we can skip this node type.
        const errors = [];
        return errors;
      }
      case "BOOLEAN_OPERATION":
      case "VECTOR": {
        return lintVectorRules(node);
      }
      case "POLYGON":
      case "STAR":
      case "ELLIPSE": {
        return lintShapeRules(node);
      }
      case "FRAME": {
        return lintFrameRules(node);
      }
      case "INSTANCE":
      case "RECTANGLE": {
        return lintRectangleRules(node);
      }
      case "COMPONENT": {
        return lintComponentRules(node);
      }
      case "COMPONENT_SET": {
        // Component Set is the frame that wraps a set of variants
        // the variants within the set are still linted as components (lintComponentRules)
        // this type is generally only present where the variant is defined so it
        // doesn't need as many linting requirements.
        return lintVariantWrapperRules(node);
      }
      case "TEXT": {
        return lintTextRules(node);
      }
      case "LINE": {
        return lintLineRules(node);
      }
      default: {
        // Do nothing
      }
    }
  }

  function lintComponentRules(node) {
    const errors = [];

    customCheckBackgroundFills(node, errors);
    checkRadius(node, errors, borderRadiusArray);
    customCheckEffects(node, errors);
    customCheckStrokes(node, errors);

    return errors;
  }

  function lintVariantWrapperRules(node) {
    const errors = [];

    checkFills(node, errors);

    return errors;
  }

  function lintLineRules(node) {
    const errors = [];

    customCheckStrokes(node, errors);
    customCheckEffects(node, errors);

    return errors;
  }

  function lintFrameRules(node) {
    const errors = [];

    customCheckBackgroundFills(node, errors);
    customCheckStrokes(node, errors);
    checkRadius(node, errors, borderRadiusArray);
    customCheckEffects(node, errors);

    return errors;
  }

  function lintTextRules(node) {
    const errors = [];

    customCheckTextStyles(node, errors);
    customCheckTextFills(node, errors);
    customCheckEffects(node, errors);
    customCheckStrokes(node, errors);

    return errors;
  }

  function lintRectangleRules(node) {
    const errors = [];

    customCheckBackgroundFills(node, errors);
    checkRadius(node, errors, borderRadiusArray);
    customCheckStrokes(node, errors);
    customCheckEffects(node, errors);

    return errors;
  }

  function lintVectorRules(node) {
    const errors = [];

    // This can be enabled by the user in settings.
    if (lintVectors === true) {
      customCheckVectorFills(node, errors);
      customCheckStrokes(node, errors);
      customCheckEffects(node, errors);
    }

    return errors;
  }

  function lintShapeRules(node) {
    const errors = [];

    customCheckShapeFills(node, errors);
    customCheckStrokes(node, errors);
    customCheckEffects(node, errors);

    return errors;
  }
};
