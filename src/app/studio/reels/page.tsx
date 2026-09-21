import { getStudioData } from "@/lib/studio";
import ReelAutopsy from "@/components/studio/ReelAutopsy";

export default async function ReelsPage() {
  return <ReelAutopsy data={await getStudioData()} />;
}
