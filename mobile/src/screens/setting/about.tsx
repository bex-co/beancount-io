import { ScrollView, View } from "react-native";
import { useTheme } from "@/common/theme";
import { AccountHeader } from "./account-header";
import { InviteSection } from "@/screens/referral-screen/components/invite-section";

import { MainContent } from "./main-content";

export const About = () => {
  const theme = useTheme().colorTheme;

  return (
    <ScrollView bounces={false} style={{ backgroundColor: theme.white }}>
      <AccountHeader />
      <InviteSection />
      <View style={{ paddingHorizontal: 16 }}>
        <MainContent />
      </View>
    </ScrollView>
  );
};
