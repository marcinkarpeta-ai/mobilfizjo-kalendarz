import type { FamilyOwner } from "./types";

export const FAMILY_OWNERS: { value: FamilyOwner; label: string }[] = [
  { value: "his", label: "Dawid" },
  { value: "hers", label: "Kasia" },
  { value: "both", label: "Wspólne" },
];

export function familyOwnerLabel(owner?: FamilyOwner | null): string {
  return FAMILY_OWNERS.find((o) => o.value === (owner ?? "both"))?.label ?? "Wspólne";
}

// Klasy tła i paska akcentu dla trzech kategorii właściciela wydarzenia.
export function familyOwnerClasses(owner?: FamilyOwner | null): {
  bg: string;
  bar: string;
  border: string;
} {
  switch (owner) {
    case "his":
      return {
        bg: "bg-family-his",
        bar: "bg-family-his-bar",
        border: "border-family-his-bar",
      };
    case "hers":
      return {
        bg: "bg-family-hers",
        bar: "bg-family-hers-bar",
        border: "border-family-hers-bar",
      };
    default:
      return { bg: "bg-family", bar: "bg-family-bar", border: "border-family-bar" };
  }
}
