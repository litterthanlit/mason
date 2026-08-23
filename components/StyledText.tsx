import { Text, TextProps } from './Themed';
import { Fonts } from '@/constants/Fonts';

export function MonoText(props: TextProps) {
  return <Text {...props} style={[props.style, { fontFamily: Fonts.sans }]} />;
}
