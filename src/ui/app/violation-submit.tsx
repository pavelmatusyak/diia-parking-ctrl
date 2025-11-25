import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/constants/themed-view';
import { useViolationContext } from '@/context/violation-context';
import { submitViolation, startTimer, type SubmitViolationPayload } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ViolationSubmitScreen() {
    const insets = useSafeAreaInsets();
    const { reportId } = useViolationContext();
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!reportId) {
            Alert.alert('Помилка', 'Відсутній ідентифікатор порушення');
            return;
        }

        setSubmitting(true);
        try {
            // Build payload from selected violations
            // For now, using a simple example - this should come from parking analysis
            const payload: SubmitViolationPayload = {
                violations: [
                    {
                        violation_reason: 'parking_prohibited_zone',
                        violation_code: 'parking_prohibited_zone',
                        violation_type: 'parking_prohibited_zone'
                    }
                ],
                notes: notes.trim() || undefined
            };

            const result = await submitViolation(reportId, payload);

            // Check if we got a success response
            if (result.status === 'submitted') {
                router.replace('/violation-success');
            }
        } catch (error: any) {
            console.error('Submission error:', error);

            // Check if timer is required
            if (error.status === 400 && error.data?.detail) {
                const detail = error.data.detail;

                if (detail.includes('timer') || detail.includes('road sign')) {
                    // Start timer
                    try {
                        await startTimer(reportId);
                        router.push('/waiting-confirmation');
                    } catch (timerError) {
                        console.error('Timer start error:', timerError);
                        Alert.alert('Помилка', 'Не вдалося запустити таймер');
                    }
                } else {
                    Alert.alert('Помилка', detail);
                }
            } else {
                Alert.alert('Помилка', error.message || 'Не вдалося відправити звіт');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
                    Деталі порушення
                </ThemedText>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                <ThemedText style={styles.sectionTitle}>Додаткові коментарі</ThemedText>
                <TextInput
                    style={styles.textInput}
                    placeholder="Опишіть деталі порушення (необов'язково)"
                    placeholderTextColor="#999"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                />
            </ScrollView>

            {/* Submit Button */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <ThemedText style={styles.submitButtonText}>
                            Відправити звіт
                        </ThemedText>
                    )}
                </TouchableOpacity>
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 18 },
    scrollView: { flex: 1 },
    content: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    textInput: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        minHeight: 120,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
    },
    submitButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
});
