export const GLOBAL_STRINGS = {
  unassignComment: "Releasing the bounty back to dev pool because the allocated duration already ended!",
  askUpdate: "Do you have any updates",
  assignCommandDisabledComment: "The `/assign` command is disabled for this repository.",
  skipPriceLabelGenerationComment: "Pricing is disabled on parent issues.",
  ignoreStartCommandForParentIssueComment:
    "Please select a child issue from the specification checklist to work on. The `/start` command is disabled on parent issues.",
  autopayComment: "Automatic payment for this issue is enabled:",
};

const OPEN_BRACE = "{";
const CLOSE_BRACE = "}";
const ESCAPED_OPEN_BRACE = "{{";
const ESCAPED_CLOSE_BRACE = "}}";

type InputValues<K extends string = string> = Record<K, string>;
type ParsedFStringNode = { type: "literal"; text: string } | { type: "variable"; name: string };

const parseFString = (f_string: string): ParsedFStringNode[] => {
  const nodes: ParsedFStringNode[] = [];
  let currentPosition = 0;

  while (currentPosition < f_string.length) {
    switch (f_string[currentPosition]) {
      case OPEN_BRACE: {
        if (f_string.substr(currentPosition, 2) === ESCAPED_OPEN_BRACE) {
          const closePosition = f_string.indexOf(ESCAPED_CLOSE_BRACE, currentPosition + 2);

          if (closePosition > -1) {
            nodes.push({ type: "literal", text: f_string.substring(currentPosition + 1, closePosition + 1) });
            currentPosition = closePosition + 2;
          } else {
            nodes.push({ type: "literal", text: OPEN_BRACE });
            currentPosition += 1;
          }
        } else {
          const endBracePosition = f_string.indexOf(CLOSE_BRACE, currentPosition);
          if (endBracePosition < 0) throw new Error("Unclosed '{' in f_string.");

          nodes.push({
            type: "variable",
            name: f_string.substring(currentPosition + 1, endBracePosition),
          });
          currentPosition = endBracePosition + 1;
        }
        break;
      }
      case CLOSE_BRACE: {
        if (f_string.substr(currentPosition, 2) === ESCAPED_CLOSE_BRACE) {
          nodes.push({ type: "literal", text: CLOSE_BRACE });
          currentPosition += 2;
          continue;
        } else {
          throw new Error("Single '}' in f_string. Position: " + currentPosition);
        }
        break;
      }
      default: {
        const nextOpenBracePosition = f_string.indexOf(OPEN_BRACE, currentPosition);
        if (nextOpenBracePosition === -1) {
          nodes.push({ type: "literal", text: f_string.substring(currentPosition) });
          currentPosition = f_string.length;
        } else {
          nodes.push({ type: "literal", text: f_string.substring(currentPosition, nextOpenBracePosition) });
          currentPosition = nextOpenBracePosition;
        }
      }
    }
  }
  return nodes;
};

const interpolateFString = (f_string: string, values: InputValues) =>
  parseFString(f_string).reduce((res, node) => {
    if (node.type === "variable") {
      if (node.name in values) {
        return res + values[node.name];
      }
      throw new Error(`Missing value for variable: ${node.name}`);
    }
    return res + node.text;
  }, "");

export const formatFString = (f_string: string, inputValues: InputValues) => interpolateFString(f_string, inputValues);

export const checkValidFString = (f_string: string, inputVariables: string[]) => {
  try {
    const dummyInputs: InputValues = inputVariables.reduce((res, input) => ({ ...res, [input]: "" }), {});
    interpolateFString(f_string, dummyInputs);
  } catch (e: any) {
    throw new Error(`Invalid f-string: ${e.message}`);
  }
};
