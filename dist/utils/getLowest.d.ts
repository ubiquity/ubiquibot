import { Label } from "../interfaces/Label";
import { RecognizedProfits, RecognizedTimes } from "../interfaces/Recognized";
declare type RecognizedKeys = typeof RecognizedProfits | typeof RecognizedTimes;
export declare type LowestLabel = {
    label: Label;
    key: RecognizedKeys;
    value: number;
};
export default function getLowestMatchFromLibrary(search: Label[], library: RecognizedKeys): LowestLabel | null;
export {};
