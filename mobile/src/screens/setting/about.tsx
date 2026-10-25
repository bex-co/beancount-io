import { ScrollView, View } from "react-native";
import { useTheme } from "@/common/theme";
import { contentColumn } from "@/common/content-column";
import { InviteSection } from "@/screens/referral-screen/components/invite-section";
import { MainContent } from "./main-content";

export const About = () => {
  const theme = useTheme().colorTheme;

  return (
    <ScrollView
      bounces={false}
      style={{ backgroundColor: theme.white }}
      // Capped centered column on iPad; a no-op on phones (w21/m2).
      contentContainerStyle={contentColumn}
    >
      <InviteSection />
      <View style={{ paddingHorizontal: 16 }}>
        <MainContent />
      </View>
    </ScrollView>
  );
};
