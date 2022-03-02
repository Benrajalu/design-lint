import { pipe } from "fp-ts/function";
import * as ArrayFP from "fp-ts/Array";
import * as OptionFP from "fp-ts/Option";

export function sanitizeFigmaKey(id: string) {
  return id.replace("S:", "").split(",")[0];
}

export function libToFigmaTokenName(token: string) {
  return token
    .replace("coral", "")
    .replace("Color", "")
    .split(/(?=[A-Z])/)
    .join("/")
    .toLowerCase();
}

export function libToFigmaColorTokenName(token: string) {
  const tokenAsArray = token
    .replace("coral", "")
    .replace("Color", "")
    .split(/(?=[A-Z])/);

  const prefix = tokenAsArray[0];

  const suffix = pipe(
    tokenAsArray,
    ArrayFP.deleteAt(0),
    OptionFP.fold(() => "", values => values.join("-").toLowerCase())
  );

  return `${prefix.toLowerCase()}/${suffix}`;
}
