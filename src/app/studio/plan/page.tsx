import { getStudioData } from "@/lib/studio";
import GrowthPlan from "@/components/studio/GrowthPlan";

export default async function PlanPage() {
  return <GrowthPlan data={await getStudioData()} />;
}
