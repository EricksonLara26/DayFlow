import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

// Punto de entrada de React: monta la aplicacion dentro del nodo #root de index.html.
createRoot(document.getElementById("root")).render(<App />);
