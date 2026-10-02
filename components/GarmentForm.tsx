import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Swatch } from "@/components/Swatch";
import { Chip, Field, Kicker, space } from "@/components/ui";
import { isHexColor } from "@/lib/colorName";
import { CATEGORY_LABELS, GARMENT_CATEGORIES, OCCASIONS, SEASONS, type GarmentCategory } from "@/lib/types";

export type GarmentDraft = {
  name: string;
  category: GarmentCategory;
  subcategory: string;
  colors: string[];
  pattern: string;
  fit: string;
  season: string[];
  occasions: string[];
  material?: string;
  brand?: string;
};

type Props = {
  value: GarmentDraft;
  onChange: (next: GarmentDraft) => void;
};

function toggle(list: string[], item: string) {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/** Every attribute the stylist reads, editable. Used by scan review and item edit. */
export function GarmentForm({ value, onChange }: Props) {
  const [newColor, setNewColor] = useState("");
  const set = <K extends keyof GarmentDraft>(key: K, next: GarmentDraft[K]) => onChange({ ...value, [key]: next });

  function addColor() {
    const hex = newColor.trim().startsWith("#") ? newColor.trim() : `#${newColor.trim()}`;
    if (!isHexColor(hex) || value.colors.includes(hex.toUpperCase())) return;
    set("colors", [...value.colors, hex.toUpperCase()]);
    setNewColor("");
  }

  return (
    <View style={styles.form}>
      <Field label="Name" value={value.name} onChangeText={(t) => set("name", t)} />

      <View style={styles.group}>
        <Kicker>Category</Kicker>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {GARMENT_CATEGORIES.map((cat) => (
            <Chip
              key={cat}
              label={CATEGORY_LABELS[cat]}
              selected={value.category === cat}
              onPress={() => set("category", cat)}
            />
          ))}
        </View>
      </View>

      <Field label="Cut" value={value.subcategory} onChangeText={(t) => set("subcategory", t)} />

      <View style={styles.group}>
        <Kicker>Colors</Kicker>
        <View style={styles.swatches}>
          {value.colors.map((color) => (
            <Swatch
              key={color}
              color={color}
              onRemove={value.colors.length > 1 ? () => set("colors", value.colors.filter((c) => c !== color)) : undefined}
            />
          ))}
        </View>
        <Field
          label="Add color (hex)"
          placeholder="#1A1A1A"
          autoCapitalize="characters"
          autoCorrect={false}
          value={newColor}
          onChangeText={setNewColor}
          onSubmitEditing={addColor}
          returnKeyType="done"
        />
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <Field label="Pattern" value={value.pattern} onChangeText={(t) => set("pattern", t)} />
        </View>
        <View style={styles.half}>
          <Field label="Fit" value={value.fit} onChangeText={(t) => set("fit", t)} />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <Field label="Material" value={value.material ?? ""} onChangeText={(t) => set("material", t || undefined)} />
        </View>
        <View style={styles.half}>
          <Field label="Brand" value={value.brand ?? ""} onChangeText={(t) => set("brand", t || undefined)} />
        </View>
      </View>

      <View style={styles.group}>
        <Kicker>Seasons</Kicker>
        <View style={styles.chips}>
          {SEASONS.map((s) => (
            <Chip
              key={s}
              role="checkbox"
              label={s}
              selected={value.season.includes(s)}
              onPress={() => set("season", toggle(value.season, s))}
            />
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <Kicker>Occasions</Kicker>
        <View style={styles.chips}>
          {OCCASIONS.map((o) => (
            <Chip
              key={o}
              role="checkbox"
              label={o}
              selected={value.occasions.includes(o)}
              onPress={() => set("occasions", toggle(value.occasions, o))}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.xl },
  group: { gap: space.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", columnGap: space.lg },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, paddingVertical: space.xs },
  row: { flexDirection: "row", gap: space.lg },
  half: { flex: 1 },
});
