import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/advisor/dashboard")({
  beforeLoad: () => { throw redirect({ to: "/" }); },
  component: () => null,
});
