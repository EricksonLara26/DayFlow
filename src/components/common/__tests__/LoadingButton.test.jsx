import { fireEvent, render, screen } from "@testing-library/react";
import LoadingButton from "../LoadingButton";
import LoadingOverlay from "../LoadingOverlay";
import LoadingSpinner from "../LoadingSpinner";

describe("loading components", () => {
  test("LoadingButton muestra contenido normal", () => {
    const onClick = jest.fn();
    render(<LoadingButton onClick={onClick}>Guardar</LoadingButton>);

    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("LoadingButton muestra estado cargando y queda deshabilitado", () => {
    render(<LoadingButton loading>Guardar</LoadingButton>);

    const button = screen.getByRole("button", { name: /cargando/i });
    expect(button).toBeDisabled();
  });

  test("LoadingSpinner expone estado accesible", () => {
    render(<LoadingSpinner size="lg" />);

    expect(screen.getByLabelText(/cargando/i)).toBeInTheDocument();
  });

  test("LoadingOverlay se oculta cuando show es false", () => {
    render(<LoadingOverlay show={false} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("LoadingOverlay se muestra cuando show es true", () => {
    render(<LoadingOverlay show />);

    expect(screen.getByRole("status")).toHaveTextContent(/cargando/i);
  });
});
