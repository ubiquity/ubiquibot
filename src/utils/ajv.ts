import Ajv from "ajv";
import addFormats from "ajv-formats";

export const ajv = addFormats(
  new Ajv({
    strict: true,
    removeAdditional: false,
    useDefaults: true,
    allErrors: true,
    coerceTypes: true,
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
