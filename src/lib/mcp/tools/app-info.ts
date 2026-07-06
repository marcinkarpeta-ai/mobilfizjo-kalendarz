import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "app_info",
  title: "About FizjoPlan",
  description:
    "Return a short description of the FizjoPlan app: what it does, its main screens, and how patient/visit data is organized.",
  inputSchema: {},
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: () => ({
    content: [
      {
        type: "text",
        text: [
          "FizjoPlan — planer wizyt dla fizjoterapeuty mobilnego.",
          "",
          "Ekrany:",
          "- Dzisiaj: skrót dnia i najbliższe wizyty.",
          "- Kalendarz: dzienna oś czasu 07:00–20:00 z paskiem dostępności.",
          "- Pacjenci: kartoteka z edycją, archiwizacją, historią wizyt i notatkami.",
          "- Wiadomości: SMS-y (przypomnienia 24h, potwierdzenia, propozycje marketingowe).",
          "- Ustawienia: dane terapeuty, szablony wiadomości, etykiety wizyt.",
          "",
          "Model danych: pacjenci (telefon unikalny, zgoda obsługowa/marketingowa),",
          "wizyty (patient_visit lub family_event, statusy scheduled/completed/cancelled),",
          "notatki powizytowe, szablony i logi wiadomości.",
        ].join("\n"),
      },
    ],
    structuredContent: {
      name: "FizjoPlan",
      screens: ["Dzisiaj", "Kalendarz", "Pacjenci", "Wiadomości", "Ustawienia"],
    },
  }),
});
