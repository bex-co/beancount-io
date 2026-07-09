import { ScrollView, View } from "react-native";
import { useTheme } from "@/common/theme";
import { InviteSection } from "@/screens/referral-screen/components/invite-section";
import { MainContent } from "./main-content";

export const About = () => {
  const theme = useTheme().colorTheme;

  return (
    <ScrollView bounces={false} style={{ backgroundColor: theme.white }}>
      <InviteSection />
      <View style={{ paddingHorizontal: 16 }}>
        <MainContent />
      </View>
    </ScrollView>
  );
};
