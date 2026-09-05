import { OverviewPanel } from "@/components/overview-panel";
import { operationsByGroup } from "@/lib/operations/catalog";

export default function HomePage() {
  return <OverviewPanel groups={operationsByGroup()} />;
}
