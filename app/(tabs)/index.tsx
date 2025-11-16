import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  Button,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Note = {
  id: string;
  text: string;
};

const STORAGE_KEY = "MY_NOTES_V1";

export default function Index() {
  const [input, setInput] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  // Uygulama açılınca kaydedilmiş notları yükle
  useEffect(() => {
    async function loadNotes() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          setNotes(JSON.parse(saved));
        }
      } catch (e) {
        console.log("Notlar yüklenirken hata:", e);
      } finally {
        setLoading(false);
      }
    }

    loadNotes();
  }, []);

  // Notlar değiştikçe storage'a kaydet
  useEffect(() => {
    async function saveNotes() {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      } catch (e) {
        console.log("Notlar kaydedilirken hata:", e);
      }
    }

    if (!loading) {
      saveNotes();
    }
  }, [notes, loading]);

  function addNote() {
    const trimmed = input.trim();
    if (!trimmed) return;

    const newNote: Note = {
      id: Date.now().toString(),
      text: trimmed,
    };

    setNotes((prev) => [...prev, newNote]);
    setInput("");
  }

  function deleteNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notlarım</Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Yeni not..."
          value={input}
          onChangeText={setInput}
        />
        <Button title="Ekle" onPress={addNote} />
      </View>

      {loading ? (
        <Text>Yükleniyor...</Text>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Henüz not yok, bir tane ekle 🙂
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onLongPress={() => deleteNote(item.id)}
              style={styles.noteItem}
            >
              <Text style={styles.noteText}>{item.text}</Text>
              <Text style={styles.noteHint}>(Silmek için uzun bas)</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  noteItem: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 16,
  },
  noteHint: {
    fontSize: 11,
    color: "gray",
    marginTop: 4,
  },
  emptyText: {
    textAlign: "center",
    color: "gray",
    marginTop: 16,
  },
});
