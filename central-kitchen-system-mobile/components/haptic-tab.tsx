import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';

export function HapticTab(props: BottomTabBarButtonProps) {
  const { pointerEvents, style, ...rest } = props;
  const safeRest = { ...rest } as Record<string, unknown>;
  delete safeRest.pointerEvents;
  return (
    <PlatformPressable
      {...(safeRest as Omit<BottomTabBarButtonProps, 'style' | 'pointerEvents'>)}
      style={[style, pointerEvents != null ? ({ pointerEvents } as const) : undefined]}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
