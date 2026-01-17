import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function RunbookPage() {
  const session = await getServerSession();
  if (!session) redirect("/");

  return (
    <div className="pixel-wrap">
      <div className="pixel-card">
        <div className="pixel-tag">RUNBOOK</div>
        <h1 className="pixel-title" style={{ marginTop: 12 }}>
          FRIDAY CHECKLIST (COMING NEXT)
        </h1>
        <p className="pixel-sub">
          Next: persist snapshots + stage + checklist completion.
        </p>
      </div>
    </div>
  );
}