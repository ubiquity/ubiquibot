import { Label } from "../interfaces/Label";
import { RecognizedProfits, RecognizedTimes } from "../interfaces/Recognized";
type RecognizedKeys = typeof RecognizedProfits | typeof RecognizedTimes;
export type LowestLabel = {
    label: Label;
    key: RecognizedKeys;
    value: number;
};
export default function getLowestMatchFromLibrary(search: Label[], library: RecognizedKeys): LowestLabel | null;
export {};
