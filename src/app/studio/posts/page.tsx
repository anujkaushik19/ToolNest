import { getStudioData } from "@/lib/studio";
import ContentGallery from "@/components/studio/ContentGallery";

export default async function PostsPage() {
  return <ContentGallery data={await getStudioData()} />;
}
