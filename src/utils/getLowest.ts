import { Label } from "../interfaces/Label";
import { RecognizedProfits, RecognizedTimes } from "../interfaces/Recognized";
import { LabelAndIndex } from "../index";

export function getLowest(valueLabels: Label[], recognizedValues: typeof RecognizedProfits | typeof RecognizedTimes) {
  for (const recognizedValue of recognizedValues) {
    const recognizedValueMatches = valueLabels.map(mapper(recognizedValue)).filter(Boolean) as LabelAndIndex[];
    // console.log("recognized:");
    // console.log(recognizedValueMatches);
    if (recognizedValueMatches.length) {
      const recognizedValueMatch = recognizedValueMatches.shift() as LabelAndIndex;
      console.log("lowest:");
      console.log(recognizedValueMatch);
      return recognizedValueMatch
    }
  }
  throw new Error("failed to find lowest value");
}

export function mapper(recognizedValue: string): (value: Label, index: number, array: Label[]) => { lowest: Label; index: number } | null {
  return (valueLabel, index) => {
    if (valueLabel.name === recognizedValue) {
      const lowest = valueLabel;
      return { lowest, index };
    }
    return null;
  };
}
