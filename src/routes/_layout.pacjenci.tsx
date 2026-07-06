import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/pacjenci")({
  component: PatientsLayout,
});

function PatientsLayout() {
  return <Outlet />;
}