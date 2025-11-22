import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, TextInput, ScrollView } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/constants/themed-view';
import { router } from 'expo-router';

const VIOLATIONS = [
  { id: 'railroad', title: 'Зупинка/стоянка на залізничному переїзді' },
  { id: 'tram', title: 'Зупинка/стоянка на трамвайних коліях' },
  { id: 'bridge', title: 'Зупинка/стоянка на мосту, шляхопроводі, естакаді, у тунелі або під ними' },
  { id: 'crosswalk', title: 'Зупинка/стоянка на пішохідному переході або ближче 10 м до нього' },
  { id: 'intersection', title: 'Зупинка/стоянка на перехресті або ближче 10 м до краю перехрещуваної дороги' },
];

export default function ViolationReasonScreen() {
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const toggleSelect = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const filtered = VIOLATIONS.filter(v =>
    v.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ThemedView style={styles.container}>
      {/* Title */}
      <ThemedText type="title" style={styles.title}>
        Оберіть правопорушення
      </ThemedText>

      {/* Info block */}
      <View style={styles.infoBlock}>
        <ThemedText style={styles.infoText}>
          Виберіть усі підходящі правопорушення для вашого випадку
        </ThemedText>
      </View>

      {/* Search */}
      <TextInput
        style={styles.search}
        placeholder="Пошук правопорушення"
        value={search}
        onChangeText={setSearch}
      />

      <ThemedText style={styles.selectedCount}>
        Обрано порушень: {selected.length}
      </ThemedText>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }}>
        {filtered.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() => toggleSelect(item.id)}
          >
            <View style={styles.checkboxWrapper}>
              <View style={[styles.checkbox, selected.includes(item.id) && styles.checkboxChecked]} />
            </View>

            <ThemedText style={styles.cardTitle}>{item.title}</ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bottom button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.nextBtn,
            selected.length === 0 ? styles.nextBtnDisabled : styles.nextBtnActive,
          ]}
          disabled={selected.length === 0}
          onPress={() => router.push('/waiting-confirmation')}
        >
          <ThemedText
            style={[
              styles.nextText,
              selected.length === 0 ? styles.nextTextDisabled : styles.nextTextActive,
            ]}
          >
            Далі
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E9F2F8',
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },

  infoBlock: {
    backgroundColor: '#D9E9F5',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },

  infoText: {
    fontSize: 14,
    color: '#1F1F1F',
  },

  search: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 8,
  },

  selectedCount: {
    fontSize: 13,
    color: '#6B6B6B',
    marginBottom: 12,
  },

  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#DCDCDC',
    alignItems: 'flex-start',
    gap: 12,
  },

  checkboxWrapper: {
    paddingTop: 4,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#222',
  },

  checkboxChecked: {
    backgroundColor: '#222',
  },

  cardTitle: {
    flex: 1,
    fontSize: 15,
    color: '#1F1F1F',
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#E9F2F8',
    padding: 20,
  },

  nextBtn: {
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },

  nextBtnDisabled: {
    backgroundColor: '#CBD4DB',
  },

  nextBtnActive: {
    backgroundColor: '#000',
  },

  nextText: {
    fontSize: 16,
    fontWeight: '600',
  },

  nextTextDisabled: {
    color: '#808080',
  },

  nextTextActive: {
    color: '#fff',
  },
});
