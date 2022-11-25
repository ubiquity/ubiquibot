import { Label, RecognizedProfits, RecognizedTimes } from "../../types";

const getLowestLabel = (search: Label[], recognizedItems: RecognizedProfits | RecognizedTimes): LowestLabel | null {
    const matches = search.map((label) => {
      const keyName = label.name;
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
      console.warn(`No matches found for ${JSON.stringify(search)} in ${JSON.stringify(library)}`);
      return null;
    }
  
    const minimum = matches.reduce((a, b) => (a.value < b.value ? a : b));
    // @ts-ignore-error
    return minimum;
  }
