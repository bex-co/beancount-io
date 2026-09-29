import { ReportsScreen } from "@/screens/reports-screen";
import { ExampleTabScreen } from "@/screens/examples/example-tabs";

export default function Reports() {
  return (
    <ExampleTabScreen view="reports">
      <ReportsScreen />
    </ExampleTabScreen>
  );
}
