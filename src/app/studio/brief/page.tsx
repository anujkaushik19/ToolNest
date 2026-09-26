import { getStudioData, generateBrief } from "@/lib/studio";
import { PageHeader } from "@/components/studio/ui";
import { BriefView } from "@/components/studio/BriefView";

export default async function BriefPage() {
  const data = await getStudioData();
  const brief = generateBrief(data);

  return (
    <div>
      <PageHeader title="Monday Brief" subtitle={`Week of ${brief.periodLabel}`} />
      <BriefView
        brief={brief}
        accountLabel={`${data.account.username ? `@${data.account.username}` : "Your account"}${data.isDemo ? " · demo data" : ""}`}
        footnote="This brief is generated from your own account history with transparent rules — no guesswork, no AI. It refreshes as new daily snapshots come in."
      />
    </div>
  );
}
