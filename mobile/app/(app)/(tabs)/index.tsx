import { HomeScreen } from "@/screens/home-screen";
import { LazyTabScreen } from "@/components/lazy-tab-screen";

export default function Home() {
  return (
    <LazyTabScreen>
      <HomeScreen />
    </LazyTabScreen>
  );
}
