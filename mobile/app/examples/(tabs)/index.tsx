import { HomeScreen } from "@/screens/home-screen";
import { ExampleTabScreen } from "@/screens/examples/example-tabs";

export default function Home() {
  return (
    <ExampleTabScreen view="home">
      <HomeScreen />
    </ExampleTabScreen>
  );
}
