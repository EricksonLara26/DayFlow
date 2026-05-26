import { useContext } from "react";
import { UsersContext } from "../context/UsersContext";

export function useUsers() {
  const context = useContext(UsersContext);

  if (!context) {
    throw new Error("useUsers debe usarse dentro de UsersProvider.");
  }

  return context;
}
