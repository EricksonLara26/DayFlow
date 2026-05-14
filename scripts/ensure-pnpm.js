const userAgent = process.env.npm_config_user_agent || "";

if (!userAgent.startsWith("pnpm/")) {
  console.error("");
  console.error("DayFlow usa pnpm como gestor de paquetes.");
  console.error("Ejecuta: corepack pnpm install");
  console.error("Para desarrollo: corepack pnpm dev");
  console.error("");
  process.exit(1);
}
