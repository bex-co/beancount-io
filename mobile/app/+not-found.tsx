import { Link, Stack } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { FlexCenter } from "@/components/flex-center";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <FlexCenter>
        <Link href="/auth/welcome" style={styles.link}>
          <Text>Go to Welcome</Text>
        </Link>
      </FlexCenter>
    </>
  );
}

const styles = StyleSheet.create({
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
