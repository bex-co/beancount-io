import { ReportsScreen } from "@/screens/reports-screen";
import { LazyTabScreen } from "@/components/lazy-tab-screen";

export default function Reports() {
  return (
    <LazyTabScreen>
      <ReportsScreen />
    </LazyTabScreen>
  );
}
