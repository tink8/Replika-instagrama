const HttpError = require("./httpError");

function toPositiveInt(value, fieldName) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, `${fieldName} mora biti pozitivan ceo broj.`);
  }

  return parsed;
}

module.exports = {
  toPositiveInt
};
