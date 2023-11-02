import Ajv, { Schema, ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

export const ajv = addFormats(
  new Ajv({
    strict: true,
    removeAdditional: true,
    useDefaults: true,
    allErrors: true,
  }),
  {
    formats: [
      "date",
      "time",
      "date-time",
      "duration",
      "uri",
      "uri-reference",
      "uri-template",
      "email",
      "hostname",
      "ipv4",
      "ipv6",
      "regex",
      "uuid",
      "json-pointer",
      "relative-json-pointer",
      "byte",
      "int32",
      "int64",
      "float",
      "double",
      "password",
      "binary",
    ],
  }
);

function getAdditionalProperties() {
  return ajv.errors
    ?.filter((error) => error.keyword === "additionalProperties")
    .map((error) => error.params.additionalProperty);
}

export function validateTypes(schema: Schema | ValidateFunction, data: unknown) {
  // : { valid: true; error: undefined } | { valid: false; error: string }
  // try {
  let valid: boolean;
  if (schema instanceof Function) {
    valid = schema(data);
  } else {
    valid = ajv.validate(schema, data);
  }

  if (!valid) {
    const additionalProperties = getAdditionalProperties();
    return {
      valid: false,
      error: `${ajv.errorsText()}. ${
        additionalProperties && additionalProperties.length > 0
          ? `Unnecessary properties: ${additionalProperties.join(", ")}`
          : null
      }`,
    };
    // return { valid: false, error: ajv.errorsText() };
    // throw new Error(ajv.errorsText());
  }

  // return data;

  // }
  return { valid: true, error: null };
  // } catch (error) {
  // throw console.trace(error);
  // }
}
