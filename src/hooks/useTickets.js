import { useContext } from "react";
import { TicketsContext } from "../context/TicketsContext";

export function useTickets() {
  const context = useContext(TicketsContext);

  if (!context) {
    throw new Error("useTickets debe usarse dentro de TicketsProvider.");
  }

  return context;
}
