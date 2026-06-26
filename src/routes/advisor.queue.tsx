import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/advisor/queue")({
  beforeLoad: () => { throw redirect({ to: "/" }); },
  component: () => null,
});
