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
