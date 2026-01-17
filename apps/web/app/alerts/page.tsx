import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function AlertsPage() {
  const session = await getServerSession();
  if (!session) redirect("/");

  return (
    <div className="pixel-wrap">
      <div className="pixel-card">
        <div className="pixel-tag">ALERTS</div>
        <h1 className="pixel-title" style={{ marginTop: 12 }}>
          ALERT ENGINE (COMING NEXT)
        </h1>
        <p className="pixel-sub">
          Next: price polling + thresholds + email notifications.
        </p>
      </div>
    </div>
  );
}