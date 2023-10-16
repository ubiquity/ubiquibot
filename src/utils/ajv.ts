import Ajv, { Schema } from "ajv";
import addFormats from "ajv-formats";

export const ajv = addFormats(new Ajv(), {
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
});

function getAdditionalProperties() {
  return ajv.errors
    ?.filter((error) => error.keyword === "additionalProperties")
    .map((error) => error.params.additionalProperty);
}

export function validate(
  scheme: string | Schema,
  data: unknown
): { valid: true; error: undefined } | { valid: false; error: string } {
  const valid = ajv.validate(scheme, data);
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
  }
  return { valid: true, error: undefined };
}
