import {
  allowedValueError,
  confirmationError,
  emailError,
  minLengthError,
  requiredError,
} from "../formValidation";

describe("formValidation", () => {
  test("valida requeridos con genero correcto", () => {
    expect(requiredError("", "El título")).toBe("El título es obligatorio.");
    expect(requiredError("", "La contraseña", { feminine: true })).toBe("La contraseña es obligatoria.");
  });

  test("valida longitud minima", () => {
    expect(minLengthError("ab", "El usuario", 3)).toBe("El usuario debe tener al menos 3 caracteres.");
    expect(minLengthError("abc", "El usuario", 3)).toBe("");
  });

  test("valida correo corporativo .com", () => {
    expect(emailError("sin-formato")).toBe("El correo debe tener un formato válido.");
    expect(emailError("usuario@empresa.net")).toBe("El correo debe terminar en .com.");
    expect(emailError("usuario@empresa.com")).toBe("");
  });

  test("valida confirmacion y valores permitidos", () => {
    expect(confirmationError("abc", "abcd")).toBe("La confirmación no coincide.");
    expect(allowedValueError("BAD", ["OK"], "La prioridad", { feminine: true })).toBe(
      "La prioridad no es válida.",
    );
  });
});
