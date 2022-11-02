import { Label } from "../interfaces/Label";
import { RecognizedProfits, RecognizedTimes } from "../interfaces/Recognized";
type RecognizedKeys = typeof RecognizedProfits | typeof RecognizedTimes;
export type LowestLabel = {
  label: Label;
  key: RecognizedKeys;
  value: number;
};

export default function getLowestMatchFromLibrary(search: Label[], library: RecognizedKeys): LowestLabel {
  const matches = search.map((label) => {
    // @ts-ignore-error
    const keyName = label.name as RecognizedKeys;
    // @ts-ignore-error
    const labelNumericalValue = library[keyName];
    if (!labelNumericalValue) {
      throw new Error(`Could not find value for ${keyName} in ${library}`);
    }
    return {
      label,
      key: keyName,
      value: labelNumericalValue,
    };
  });

  if (!matches.length) {
    throw new Error(`No matches found for ${JSON.stringify(search)} in ${JSON.stringify(library)}`);
  }

  const minimum = matches.reduce((a, b) => (a.value < b.value ? a : b));
  // @ts-ignore-error
  return minimum;
}

// export function getLowestLabel(search: Label[], library: typeof RecognizedProfits | typeof RecognizedTimes): LowestLabel {
//   const lowest: LowestLabel = {
//     label: search[0],
//     minimum: {
//       key: search[0].name,
//       value: library[search[0].name],
//     },
//   };

//   for (const label of search) {
//     if (library[label.name] < lowest.minimum.value) {
//       lowest.label = label;
//       lowest.minimum.key = label.name;
//       lowest.minimum.value = library[label.name];
//     }
//   }

//   return lowest;
// }

// export function getLowestLabel(search: Label[], library: typeof RecognizedProfits | typeof RecognizedTimes): LowestLabel {
//   const libraryValues = Object.values(library);
//   const minimumLibraryValue = Math.min(...libraryValues);
//   // get the key associated with the minimum library value
//   const flip = (data: typeof library) => Object.fromEntries(Object.entries(data).map(([key, value]) => [value, key]));

//   const flipped = flip(library) as { [key: string]: string };
//   const key = minimumLibraryValue.toString();
//   const minimumKey = flipped[key];
//   const lowestLabel = search.find((label) => label.name == minimumKey);

//   console.log({ lowestLabel });
//   if (!lowestLabel) {
//     throw new Error("could not find lowest value");
//   }
//   return {
//     label: lowestLabel as Label,
//     minimum: {
//       key: minimumKey,
//       value: minimumLibraryValue,
//     },
//   };
// }

// function sortLibraryInOrderOfValue(){

// }
