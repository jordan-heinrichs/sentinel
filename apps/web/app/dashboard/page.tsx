import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) redirect("/");

  const email = (session as any)?.user?.email;
  if (!email) redirect("/");

  // Keep this simple for now; can switch to env later.
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3001";

  return <DashboardClient apiBase={apiBase} email={email} />;
}
