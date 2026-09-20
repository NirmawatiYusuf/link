import { ItemViewerPage } from "@/components/viewer/item-viewer-page";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ItemViewerPage itemId={id} />;
}
