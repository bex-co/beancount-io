import { G, Path, Svg, Polygon } from "react-native-svg";
import { useTheme } from "@/common/theme";

function GiftIconComponent(): JSX.Element {
  const { colorTheme: theme } = useTheme();

  return (
    <Svg width="50px" height="52px" viewBox="0 0 50 52" fill={theme.white}>
      <G id="Page-1" stroke="none" stroke-width="1" fill-rule="evenodd">
        <G
          id="ISTOCKPHOTO_1084909636"
          transform="translate(-44.000000, -115.000000)"
          strokeWidth="2"
        >
          <Polygon
            id="Fill-1"
            fill={theme.white}
            points="0 479.94 498 479.94 498 0 0 0"
          ></Polygon>
          <Path
            stroke="#20211F"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></Path>
          <G
            id="Group"
            transform="translate(45.000000, 116.000000)"
            stroke={theme.success}
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
          >
            <Path
              d="M46,24 L46,46 C46,48.209 44.21,50 42,50 L6,50 C3.791,50 2,48.209 2,46 L2,24 L46,24 Z"
              id="Path"
            ></Path>
            <Path
              d="M46.8,24 L1.2,24 C0.538,24 0,23.463 0,22.8 L0,13.2 C0,12.537 0.538,12 1.2,12 L46.8,12 C47.463,12 48,12.537 48,13.2 L48,22.8 C48,23.463 47.463,24 46.8,24 Z"
              id="Path"
            ></Path>
            <Polygon id="Path" points="19 50 29 50 29 24 19 24"></Polygon>
            <Polygon id="Path" points="18 24 30 24 30 12 18 12"></Polygon>
            <Path
              d="M30,12 C30,8.686 27.314,6 24,6 C20.687,6 18,8.686 18,12 L30,12 Z"
              id="Path"
            ></Path>
            <Path
              d="M36,0 C31.923,0 28.768,3.454 26.718,6.656 C27.847,7.231 28.768,8.152 29.344,9.281 C31.152,7.419 33.387,6 36,6 C38.221,6 40.158,7.207 41.195,9 C41.706,8.117 42,7.093 42,6 C42,2.686 39.314,0 36,0 Z"
              id="Path"
            ></Path>
            <Path
              d="M36,6 C33.387,6 31.152,7.419 29.344,9.281 C29.76,10.098 30,11.02 30,12 L36,12 C38.221,12 40.158,10.793 41.195,9 C40.158,7.207 38.221,6 36,6 Z"
              id="Path"
            ></Path>
            <Path
              d="M12,6 C14.613,6 16.849,7.419 18.656,9.281 C19.232,8.152 20.153,7.231 21.282,6.656 C19.232,3.454 16.078,0 12,0 C8.687,0 6,2.686 6,6 C6,7.093 6.294,8.117 6.805,9 C7.842,7.207 9.78,6 12,6 Z"
              id="Path"
            ></Path>
            <Path
              d="M12,6 C9.78,6 7.842,7.207 6.805,9 C7.842,10.793 9.78,12 12,12 L18,12 C18,11.02 18.24,10.098 18.656,9.281 C16.849,7.419 14.613,6 12,6 Z"
              id="Path"
            ></Path>
          </G>
        </G>
      </G>
    </Svg>
  );
}

export const GiftIcon = GiftIconComponent;
