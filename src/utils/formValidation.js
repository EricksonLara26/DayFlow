export const FORM_MIN_LENGTHS = {
  comment: 2,
  description: 10,
  identifier: 2,
  name: 2,
  password: 4,
  position: 2,
  title: 5,
  username: 3,
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function cleanField(value) {
  return String(value ?? "").trim();
}

export function requiredError(value, label, { feminine = false, message = "" } = {}) {
  if (cleanField(value)) {
    return "";
  }

  if (message) {
    return message;
  }

  return `${label} es ${feminine ? "obligatoria" : "obligatorio"}.`;
}

export function minLengthError(value, label, minLength) {
  const cleanValue = cleanField(value);

  if (!cleanValue || cleanValue.length >= minLength) {
    return "";
  }

  return `${label} debe tener al menos ${minLength} caracteres.`;
}

export function emailError(value, { requireDotCom = true } = {}) {
  const email = cleanField(value).toLowerCase();

  if (!email) {
    return "El correo es obligatorio.";
  }

  if (!emailPattern.test(email)) {
    return "El correo debe tener un formato válido.";
  }

  if (requireDotCom && !email.endsWith(".com")) {
    return "El correo debe terminar en .com.";
  }

  return "";
}

export function confirmationError(value, confirmation, label = "La confirmación") {
  return cleanField(value) === cleanField(confirmation) ? "" : `${label} no coincide.`;
}

export function allowedValueError(value, allowedValues, label, { feminine = false } = {}) {
  return allowedValues.includes(value) ? "" : `${label} no es ${feminine ? "válida" : "válido"}.`;
}

export function setErrorIfAny(errors, field, error) {
  if (error) {
    return { ...errors, [field]: error };
  }

  return errors;
}

export function getApiErrorMessage(result, fallbackMessage) {
  if (!result) {
    return fallbackMessage;
  }

  return result.message ?? result.error?.message ?? fallbackMessage;
}

export function getApiFieldErrors(result) {
  const fields = result?.fields ?? result?.fieldErrors ?? result?.error?.fields;

  if (!fields || typeof fields !== "object") {
    return {};
  }

  return Object.entries(fields).reduce((errors, [field, value]) => {
    if (Array.isArray(value)) {
      return { ...errors, [field]: value.join(" ") };
    }

    return { ...errors, [field]: String(value) };
  }, {});
}
