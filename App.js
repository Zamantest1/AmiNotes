import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Modal,
    TouchableWithoutFeedback,
    Platform,
    Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

// --- Theme and Constants ---
const COLORS = {
    bgMain: '#FDF7FA',
    bgCard: '#FFFFFF',
    textPrimary: '#4E3D52',
    textSecondary: '#8A798D',
    textOnAccent: '#FFFFFF',
    accentPrimary: '#EF9A9A', // Soft pink
    accentPrimaryDarker: '#E57373',
    accentSecondary: '#CE93D8', // Soft purple
    borderColor: '#F3EAF5',
    shadowColor: 'rgba(149, 117, 205, 0.2)',
    danger: '#D32F2F',
    success: '#66BB6A', // Soft green
    info: '#4FC3F7', // Soft blue for info
};

const GRADIENT_THEMES = [
    ['#FEEAE6', '#F8BBD0', '#E1BEE7'], // Peachy Pink to Lavender
    ['#E1F5FE', '#B3E5FC', '#81D4FA'], // Baby Blue Sky
    ['#E8F5E9', '#C8E6C9', '#A5D6A7'], // Minty Green
    ['#FFFDE7', '#FFF9C4', '#FFF59D'], // Buttercream Yellow
    ['#FBE9E7', '#FFCCBC', '#FFAB91'], // Coral Sunset
    ['#ede5ff', '#d8b4fe', '#a78bfa'], // Lavender Haze
    ['#f0fdf4', '#bbf7d0', '#4ade80'], // Spring Meadow
    ['#fefce8', '#fef08a', '#facc15'], // Golden Sun
    ['#fff1f2', '#ffc0cb', '#f472b6'], // Pink Blossom
    ['#ecfeff', '#a5f3fc', '#22d3ee'], // Crystal Teal
];

const NOTE_COLORS = ['#F3E5F5', '#E1F5FE', '#E8F5E9', '#FFFDE7', '#FBE9E7'];

const FONT_FAMILY = {
    playfair: 'PlayfairDisplay_600SemiBold',
    poppins: 'Poppins_400Regular',
    poppinsMedium: 'Poppins_500Medium',
    poppinsBold: 'Poppins_600SemiBold',
};

// --- Helper: Checklist Item ---
const ChecklistItem = ({ item, onToggle, isEditing, onTextChange, onAddItem, onDeleteItem }) => (
    <View style={styles.checklistItem}>
        <TouchableOpacity onPress={onToggle} style={styles.checkbox}>
            {item.isChecked && <Feather name="check" size={14} color={COLORS.textSecondary} />}
        </TouchableOpacity>
        <TextInput
            value={item.text}
            onChangeText={onTextChange}
            placeholder="List item"
            placeholderTextColor={COLORS.textSecondary}
            style={[styles.checklistItemText, item.isChecked && !isEditing && styles.checklistItemTextChecked]}
            editable={isEditing}
            onSubmitEditing={onAddItem}
        />
        {isEditing && (
            <TouchableOpacity onPress={onDeleteItem} style={styles.deleteItemButton}>
                <Feather name="x" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
        )}
    </View>
);

// --- Note Viewer Modal ---
const NoteViewerModal = ({ isVisible, note, onClose, onEdit, onDelete, onToggleFavorite, onTogglePrivate, onToggleItem }) => {
    if (!note) return null;
    const theme = GRADIENT_THEMES[note.themeIndex || 0];

    return (
        <Modal visible={isVisible} animationType="slide" onRequestClose={onClose}>
            <LinearGradient colors={theme} style={{ flex: 1 }}>
                <SafeAreaView style={styles.viewerSafeArea}>
                    <View style={styles.viewerHeader}>
                        <TouchableOpacity onPress={onClose} style={styles.viewerButton}>
                            <Feather name="chevron-left" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                        <View style={styles.viewerHeaderActions}>
                            <TouchableOpacity onPress={() => onTogglePrivate(note.id)} style={styles.viewerButton}>
                                <Feather name={note.isPrivate ? "lock" : "unlock"} size={20} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => onToggleFavorite(note.id)} style={styles.viewerButton}>
                                <Feather name="star" size={22} color={note.isFavorite ? COLORS.accentPrimaryDarker : COLORS.textPrimary} style={{ opacity: note.isFavorite ? 1 : 0.5 }} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => onEdit(note)} style={styles.viewerButton}>
                                <Feather name="edit-2" size={20} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => onDelete(note.id)} style={styles.viewerButton}>
                                <Feather name="trash-2" size={20} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <ScrollView contentContainerStyle={styles.viewerContentContainer}>
                        <Text style={styles.viewerTitle}>{note.title || "Note"}</Text>
                        <Text style={styles.viewerDate}>Last updated: {new Date(note.date).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                        {note.type === 'checklist' ? (
                            (note.content || []).map(item => (
                                <ChecklistItem key={item.id} item={item} isEditing={false} onToggle={() => onToggleItem(note.id, item.id)} />
                            ))
                        ) : (
                            <Text style={styles.viewerContent}>{note.content}</Text>
                        )}
                    </ScrollView>
                </SafeAreaView>
            </LinearGradient>
        </Modal>
    );
}

// --- Note Editor Modal ---
const NoteEditorModal = ({ isVisible, onClose, onSave, editingData }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [checklistItems, setChecklistItems] = useState([]);
    const [currentNoteType, setCurrentNoteType] = useState('text');
    const [isPrivate, setIsPrivate] = useState(false);
    const [themeIndex, setThemeIndex] = useState(0);

    const editingNote = editingData?.note;

    useEffect(() => {
        if (isVisible) {
            const initialType = editingNote?.type || 'text';
            setCurrentNoteType(initialType);
            setTitle(editingNote?.title || '');
            setIsPrivate(editingNote?.isPrivate || false);
            setThemeIndex(editingNote?.themeIndex ?? Math.floor(Math.random() * GRADIENT_THEMES.length));
            if (initialType === 'checklist') {
                setContent('');
                setChecklistItems(editingNote && Array.isArray(editingNote.content) ? editingNote.content : [{ id: Date.now(), text: '', isChecked: false }]);
            } else {
                setContent(editingNote?.content || '');
                setChecklistItems([]);
            }
        }
    }, [editingData, isVisible]);

    const handleSave = () => {
        const finalContent = currentNoteType === 'checklist' ? checklistItems.filter(item => item.text.trim() !== '') : content;
        onSave(title, finalContent, currentNoteType, isPrivate, themeIndex);
        onClose();
    };
    const canSave = title.trim().length > 0 || (currentNoteType === 'text' ? content.trim().length > 0 : checklistItems.some(item => item.text.trim() !== ''));
    const handleChecklistTextChange = (id, text) => setChecklistItems(items => items.map(item => item.id === id ? { ...item, text } : item));
    const handleAddChecklistItem = () => setChecklistItems(items => [...items, { id: Date.now(), text: '', isChecked: false }]);
    const handleDeleteChecklistItem = (id) => setChecklistItems(items => items.filter(item => item.id !== id));
    const toggleNoteType = () => setCurrentNoteType(prev => prev === 'text' ? 'checklist' : 'text');

    const activeTheme = GRADIENT_THEMES[themeIndex];

    return (
        <Modal visible={isVisible} animationType="slide" onRequestClose={onClose}>
            <LinearGradient colors={activeTheme} style={{ flex: 1 }}>
                <SafeAreaView style={styles.editorSafeArea}>
                    <View style={styles.editorHeader}>
                        <TouchableOpacity onPress={onClose} style={styles.viewerButton}><Text style={styles.editorHeaderText}>Cancel</Text></TouchableOpacity>
                        <Text style={styles.editorTitle}>{editingNote ? "Edit Note" : "Create Note"}</Text>
                        <TouchableOpacity onPress={handleSave} disabled={!canSave} style={styles.viewerButton}><Text style={[styles.editorHeaderText, styles.editorSaveButton, !canSave && styles.editorSaveButtonDisabled]}>Save</Text></TouchableOpacity>
                    </View>
                    <ScrollView style={styles.editorContentContainer}>
                        <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={styles.editorTitleInput} placeholderTextColor={COLORS.textSecondary} multiline={true} />
                        {currentNoteType === 'checklist' ? (
                            <View>
                                {checklistItems.map((item, index) => (
                                    <ChecklistItem key={item.id} item={item} isEditing={true} onTextChange={(text) => handleChecklistTextChange(item.id, text)} onAddItem={index === checklistItems.length - 1 ? handleAddChecklistItem : () => {}} onDeleteItem={() => handleDeleteChecklistItem(item.id)} />
                                ))}
                                <TouchableOpacity onPress={handleAddChecklistItem} style={styles.addChecklistItem}>
                                    <Feather name="plus" size={16} color={COLORS.textSecondary} />
                                    <Text style={styles.addChecklistItemText}>Add Item</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TextInput placeholder="Your thoughts here..." value={content} onChangeText={setContent} multiline style={styles.editorContentInput} placeholderTextColor={COLORS.textSecondary} />
                        )}
                    </ScrollView>
                    <View style={styles.editorToolbar}>
                        <View style={styles.toolbarLeftActions}>
                             <TouchableOpacity onPress={toggleNoteType} style={styles.toolbarButton}>
                                <Feather name={currentNoteType === 'checklist' ? 'type' : 'check-square'} size={22} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setIsPrivate(!isPrivate)} style={styles.toolbarButton}>
                                <Feather name={isPrivate ? 'lock' : 'unlock'} size={22} color={isPrivate ? COLORS.accentPrimaryDarker : COLORS.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeSelector}>
                           {GRADIENT_THEMES.map((theme, index) => (
                               <TouchableOpacity key={index} onPress={() => setThemeIndex(index)}>
                                   <LinearGradient colors={theme} style={[styles.themeDot, themeIndex === index && styles.themeDotActive]} />
                               </TouchableOpacity>
                           ))}
                        </ScrollView>
                    </View>
                </SafeAreaView>
            </LinearGradient>
        </Modal>
    );
};

// --- Custom Themed Modals ---
const PinModal = ({ isVisible, onClose, onSubmit, isSettingPin }) => {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const title = isSettingPin ? "Set Your 4-Digit PIN" : "Enter PIN";

    const handleSubmit = () => {
        setError('');
        if (isSettingPin) {
            if (pin.length !== 4) {
                setError("Your PIN must be exactly 4 digits.");
                return;
            }
            if (pin !== confirmPin) {
                setError("The PINs you entered do not match.");
                return;
            }
        }
        onSubmit(pin);
        handleClose();
    };

    const handleClose = () => {
        setPin(''); setConfirmPin(''); setError('');
        onClose();
    }

    return (
        <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={handleClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.alertContainer}>
                    <Feather name="key" size={24} color={COLORS.accentSecondary} style={{marginBottom: 10}}/>
                    <Text style={styles.alertTitle}>{title}</Text>
                     <Text style={styles.alertMessage}>
                        {isSettingPin ? "This PIN will protect your locked notes." : "Please enter your PIN to continue."}
                    </Text>
                    <TextInput style={styles.pinInput} placeholder="----" placeholderTextColor={COLORS.textSecondary+'80'} secureTextEntry value={pin} onChangeText={setPin} keyboardType="numeric" maxLength={4} textAlign="center" letterSpacing={20} />
                    {isSettingPin && (
                        <TextInput style={styles.pinInput} placeholder="----" placeholderTextColor={COLORS.textSecondary+'80'} secureTextEntry value={confirmPin} onChangeText={setConfirmPin} keyboardType="numeric" maxLength={4} textAlign="center" letterSpacing={20} />
                    )}
                    {error ? <Text style={styles.modalErrorText}>{error}</Text> : null}
                    <View style={styles.alertButtonContainer}>
                        <TouchableOpacity style={[styles.alertButton, styles.alertButtonCancel]} onPress={handleClose}><Text style={styles.alertButtonText}>Cancel</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.alertButton, { backgroundColor: COLORS.accentPrimary }]} onPress={handleSubmit}><Text style={styles.alertButtonTextWhite}>{isSettingPin ? "Set PIN" : "Unlock"}</Text></TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const InfoModal = ({ isVisible, onClose, title, message, iconName = "info", iconColor = COLORS.info }) => (
    <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
            <View style={styles.alertContainer}>
                <Feather name={iconName} size={24} color={iconColor} style={{ marginBottom: 10 }} />
                <Text style={styles.alertTitle}>{title}</Text>
                <Text style={styles.alertMessage}>{message}</Text>
                <TouchableOpacity style={styles.singleAlertButton} onPress={onClose}>
                    <Text style={styles.alertButtonTextWhite}>OK</Text>
                </TouchableOpacity>
            </View>
        </View>
    </Modal>
);

const ActionSheetModal = ({ isVisible, onClose, title, options }) => (
    <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
            <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                    <View style={styles.actionSheetContainer}>
                        <Text style={styles.actionSheetTitle}>{title}</Text>
                        {(options || []).map((opt, index) => (
                            <TouchableOpacity key={index} style={styles.actionSheetButton} onPress={() => { opt.onPress(); onClose(); }}>
                                <Feather name={opt.icon} size={20} color={opt.color || COLORS.textPrimary} />
                                <Text style={[styles.actionSheetButtonText, { color: opt.color || COLORS.textPrimary }]}>{opt.label}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={[styles.actionSheetButton, { borderTopWidth: 1, borderColor: COLORS.borderColor }]} onPress={onClose}>
                            <Text style={styles.actionSheetButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableWithoutFeedback>
            </View>
        </TouchableWithoutFeedback>
    </Modal>
);

const CustomAlertModal = ({ isVisible, onClose, onConfirm, title, message, confirmText = "Delete", confirmColor = COLORS.danger }) => (
    <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
            <View style={styles.alertContainer}>
                 <Feather name="alert-triangle" size={24} color={confirmColor} style={{marginBottom: 10}}/>
                <Text style={styles.alertTitle}>{title}</Text>
                <Text style={styles.alertMessage}>{message}</Text>
                <View style={styles.alertButtonContainer}>
                    <TouchableOpacity style={[styles.alertButton, styles.alertButtonCancel]} onPress={onClose}><Text style={styles.alertButtonText}>Cancel</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.alertButton, { backgroundColor: confirmColor }]} onPress={onConfirm}><Text style={styles.alertButtonTextWhite}>{confirmText}</Text></TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);

// --- FAB Menu Component ---
const FabMenu = ({ onSelect, animation }) => {
    const textIconAnimation = {
        transform: [
            { scale: animation },
            { translateY: animation.interpolate({ inputRange: [0, 1], outputRange: [0, -85] }) }
        ],
        opacity: animation
    };
    const listIconAnimation = {
        transform: [
            { scale: animation },
            { translateY: animation.interpolate({ inputRange: [0, 1], outputRange: [0, -120] }) }
        ],
        opacity: animation
    };

    return (
        <View style={styles.fabContainer} pointerEvents="box-none">
            <Animated.View style={listIconAnimation}>
                <TouchableOpacity style={styles.fabIconContainer} onPress={() => onSelect('checklist')}>
                    <Feather name="check-square" size={20} color="white" />
                </TouchableOpacity>
            </Animated.View>
            <Animated.View style={textIconAnimation}>
                <TouchableOpacity style={styles.fabIconContainer} onPress={() => onSelect('text')}>
                    <Feather name="type" size={20} color="white" />
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const NoteCard = React.memo(({ item, onOpen, onToggleFavorite, onToggleItem }) => {
    const cardColor = GRADIENT_THEMES[item.themeIndex || 0][0];
    const isTrashed = !!item.deletedAt;

    if (item.isPrivate && !isTrashed) {
        return (
            <TouchableOpacity style={styles.noteCardContainer} onPress={() => onOpen(item)}>
                <View style={[styles.noteCard, { backgroundColor: cardColor, justifyContent: 'space-between', minHeight: 150 }]}>
                    <View style={styles.lockedCardContent}>
                         <Feather name="lock" size={40} color={COLORS.textSecondary} style={{opacity: 0.5}}/>
                    </View>
                    <View>
                        <Text style={[styles.noteTitle, {textAlign: 'center'}]} numberOfLines={1}>{item.title || "Locked Note"}</Text>
                        <Text style={[styles.noteDate, {textAlign: 'center'}]}>{new Date(item.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity style={styles.noteCardContainer} onPress={() => onOpen(item)}>
            <View style={[styles.noteCard, { backgroundColor: cardColor }]}>
                {!isTrashed && (
                    <TouchableOpacity style={styles.favoriteIcon} onPress={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}>
                        <Feather name="star" size={18} color={item.isFavorite ? COLORS.accentPrimaryDarker : COLORS.textSecondary} style={{ opacity: item.isFavorite ? 1 : 0.4 }} />
                    </TouchableOpacity>
                )}
                <Text style={styles.noteTitle} numberOfLines={2}>{item.title || "Untitled Note"}</Text>
                {item.type === 'checklist' ? (
                    <View>
                        {(item.content || []).slice(0, 4).map(checkItem => (
                            <ChecklistItem key={checkItem.id} item={checkItem} isEditing={false} onToggle={(e) => { e.stopPropagation(); onToggleItem(item.id, checkItem.id) }} />
                        ))}
                    </View>
                ) : (
                    <Text style={styles.noteContent} numberOfLines={5}>{item.content}</Text>
                )}
                <Text style={styles.noteDate}>{isTrashed ? `Deleted: ${new Date(item.deletedAt).toLocaleDateString()}` : new Date(item.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
        </TouchableOpacity>
    );
});


// --- Standalone Notepad Screen ---
export default function NotepadScreen() {
    const [fontsLoaded] = useFonts({ PlayfairDisplay_600SemiBold, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold });

    const [notes, setNotes] = useState([]);
    const [trashedNotes, setTrashedNotes] = useState([]);
    const [appPin, setAppPin] = useState(null);
    const [currentView, setCurrentView] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const [isPinModalVisible, setPinModalVisible] = useState(false);
    const [isSettingPin, setIsSettingPin] = useState(false);
    const [noteToUnlock, setNoteToUnlock] = useState(null);
    const [isEditorVisible, setEditorVisible] = useState(false);
    const [isViewerVisible, setViewerVisible] = useState(false);
    const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState(null);
    const [isFabMenuVisible, setFabMenuVisible] = useState(false);
    const [infoModalConfig, setInfoModalConfig] = useState({ isVisible: false, title: '', message: '' });
    const [actionSheetConfig, setActionSheetConfig] = useState({ isVisible: false, title: '', options: [] });

    const fabAnimation = useRef(new Animated.Value(0)).current;
    const [editingData, setEditingData] = useState(null);
    const [viewingData, setViewingData] = useState(null);

    const NOTES_STORAGE_KEY = '@AminaAura:notes_v10';
    const TRASH_STORAGE_KEY = '@AminaAura:notes_trash_v10';
    const PIN_STORAGE_KEY = '@AminaAura:pin_v10';

    useEffect(() => {
        const loadAllData = async () => {
            await loadNotes();
            await loadTrashedNotes();
            await loadPin();
        };
        loadAllData();
    }, []);

    useEffect(() => { Animated.spring(fabAnimation, { toValue: isFabMenuVisible ? 1 : 0, friction: 7, useNativeDriver: false }).start(); }, [isFabMenuVisible]);

    const showInfoModal = (title, message, iconName, iconColor) => setInfoModalConfig({ isVisible: true, title, message, iconName, iconColor });
    const loadNotes = async () => { try { const jsonValue = await AsyncStorage.getItem(NOTES_STORAGE_KEY); if (jsonValue !== null) setNotes(JSON.parse(jsonValue)); } catch (e) { console.error("Failed to load notes.", e); } };
    const saveNotes = async (newNotes) => { try { await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(newNotes)); setNotes(newNotes); } catch (e) { console.error("Failed to save notes.", e); } };

    const loadTrashedNotes = async () => {
        try {
            const jsonValue = await AsyncStorage.getItem(TRASH_STORAGE_KEY);
            let loadedTrash = jsonValue !== null ? JSON.parse(jsonValue) : [];
            const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
            const validTrash = loadedTrash.filter(note => new Date(note.deletedAt).getTime() > thirtyDaysAgo);
            if (validTrash.length !== loadedTrash.length) await saveTrashedNotes(validTrash);
            else setTrashedNotes(validTrash);
        } catch (e) { console.error("Failed to load trashed notes.", e); }
    };
    const saveTrashedNotes = async (newTrash) => { try { await AsyncStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(newTrash)); setTrashedNotes(newTrash); } catch (e) { console.error("Failed to save trashed notes.", e); } };

    const loadPin = async () => { try { const pin = await AsyncStorage.getItem(PIN_STORAGE_KEY); setAppPin(pin); } catch (e) { console.error("Failed to load PIN.", e); } };
    const savePin = async (pin) => { try { await AsyncStorage.setItem(PIN_STORAGE_KEY, pin); setAppPin(pin); } catch (e) { console.error("Failed to save PIN.", e); } };

    const handleSaveNote = (title, content, type, isPrivate, themeIndex) => {
        if (isPrivate && !appPin) {
            setIsSettingPin(true); 
            setPinModalVisible(true);
            return;
        }
        let newNotes;
        const noteData = { title, content, type, isPrivate, themeIndex, date: new Date().toISOString() };
        if (editingData?.note) {
            newNotes = notes.map(note => note.id === editingData.note.id ? { ...note, ...noteData } : note);
        } else {
            newNotes = [{ id: Date.now().toString(), ...noteData, isFavorite: false }, ...notes];
        }
        saveNotes(newNotes);
        setEditingData(null);
    };

    const confirmDeleteNote = (id) => { setNoteToDelete(id); setViewerVisible(false); setDeleteModalVisible(true); };
    const moveToTrash = () => {
        const noteToMove = notes.find(note => note.id === noteToDelete);
        if (noteToMove) {
            const newTrashedNote = { ...noteToMove, deletedAt: new Date().toISOString() };
            saveTrashedNotes([newTrashedNote, ...trashedNotes]);
            saveNotes(notes.filter(note => note.id !== noteToDelete));
        }
        setDeleteModalVisible(false); setNoteToDelete(null);
    };

    const handleRestoreNote = (noteId) => {
        const noteToRestore = trashedNotes.find(note => note.id === noteId);
        if (noteToRestore) {
            delete noteToRestore.deletedAt;
            saveNotes([noteToRestore, ...notes]);
            saveTrashedNotes(trashedNotes.filter(note => note.id !== noteId));
            showInfoModal("Note Restored", "The note has been moved back to your main list.", "rotate-ccw", COLORS.success);
        }
    };

    const handlePermanentDelete = (noteId) => {
        saveTrashedNotes(trashedNotes.filter(note => note.id !== noteId));
        showInfoModal("Deleted", "The note has been permanently deleted.", "trash-2", COLORS.danger);
    };

    const handleToggleFavorite = (id) => {
        const newNotes = notes.map(note => note.id === id ? { ...note, isFavorite: !note.isFavorite } : note);
        saveNotes(newNotes);
        if (viewingData?.note.id === id) setViewingData(prev => ({ ...prev, note: { ...prev.note, isFavorite: !prev.note.isFavorite } }));
    };

    const handleTogglePrivate = (id) => {
        if (!appPin) {
            setIsSettingPin(true); 
            setPinModalVisible(true);
            return;
        }
        const newNotes = notes.map(note => note.id === id ? { ...note, isPrivate: !note.isPrivate } : note);
        saveNotes(newNotes);
        if (viewingData?.note.id === id) setViewingData(prev => ({ ...prev, note: { ...prev.note, isPrivate: !prev.note.isPrivate } }));
    };

    const handlePinSubmit = (pin) => {
        if (isSettingPin) {
            savePin(pin);
            showInfoModal("PIN Set!", "Your PIN has been set successfully.", "check-circle", COLORS.success);
        } else {
            if (pin === appPin) {
                if (noteToUnlock) {
                    setViewingData({ note: noteToUnlock });
                    setViewerVisible(true);
                    setNoteToUnlock(null);
                }
            } else {
                showInfoModal("Incorrect PIN", "The PIN you entered is incorrect. Please try again.", "alert-triangle", COLORS.danger);
            }
        }
    };

    const handleOpenEditor = (note = null) => { setEditingData({ note }); setViewerVisible(false); setEditorVisible(true); };
    const handleCreateNote = (type) => { setFabMenuVisible(false); handleOpenEditor(null, type); };

    const handleOpenViewer = (note) => {
        if (currentView === 'trash') {
             setActionSheetConfig({
                 isVisible: true,
                 title: note.title,
                 options: [
                     { label: "Restore Note", icon: "rotate-ccw", color: COLORS.success, onPress: () => handleRestoreNote(note.id) },
                     { label: "Delete Permanently", icon: "trash-2", color: COLORS.danger, onPress: () => handlePermanentDelete(note.id) },
                 ]
             });
            return;
        }
        if (note.isPrivate) {
            if (!appPin) { 
                showInfoModal("PIN Not Set", "A PIN is required to view this note, but none has been set for the app.");
                return; 
            }
            setNoteToUnlock(note);
            setIsSettingPin(false);
            setPinModalVisible(true);
        } else {
            setViewingData({ note });
            setViewerVisible(true);
        }
    };

    const handleToggleChecklistItem = (noteId, itemId) => {
        const newNotes = notes.map(note => {
            if (note.id === noteId && note.type === 'checklist') {
                const newContent = (note.content || []).map(item => item.id === itemId ? { ...item, isChecked: !item.isChecked } : item);
                return { ...note, content: newContent, date: new Date().toISOString() };
            }
            return note;
        });
        saveNotes(newNotes);
        if (viewingData?.note.id === noteId) {
            const updatedNote = newNotes.find(note => note.id === noteId);
            if (updatedNote) setViewingData(prev => ({ ...prev, note: updatedNote }));
        }
    };

    const notesToDisplay = useMemo(() => {
        let sourceNotes = currentView === 'trash' ? trashedNotes : notes;
        let filteredNotes = sourceNotes;
        if (currentView === 'favorites') filteredNotes = filteredNotes.filter(n => n.isFavorite);
        if (searchQuery.trim() !== '') {
            const lowercasedQuery = searchQuery.toLowerCase();
            filteredNotes = filteredNotes.filter(n => n.title.toLowerCase().includes(lowercasedQuery) || (typeof n.content === 'string' && n.content.toLowerCase().includes(lowercasedQuery)));
        }
        return filteredNotes;
    }, [notes, trashedNotes, currentView, searchQuery]);

    const fabIconRotation = fabAnimation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '135deg'] });
    const fabOverlayBackground = fabAnimation.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)'] });

    if (!fontsLoaded) return <View style={styles.fullScreenLoader}><ActivityIndicator size="large" color={COLORS.accentPrimary} /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}><Text style={styles.headerTitle}>Amina's Note</Text></View>
            <View style={styles.controlsContainer}>
                <View style={styles.searchContainer}>
                    <Feather name="search" size={16} color={COLORS.textSecondary} style={styles.searchIcon} />
                    <TextInput placeholder="Search notes..." placeholderTextColor={COLORS.textSecondary} style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} />
                </View>
                <View style={styles.filterContainer}>
                    <TouchableOpacity onPress={() => setCurrentView('all')} style={[styles.filterButton, currentView === 'all' && styles.filterButtonActive]}><Text style={[styles.filterButtonText, currentView === 'all' && styles.filterButtonTextActive]}>All</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setCurrentView('favorites')} style={[styles.filterButton, currentView === 'favorites' && styles.filterButtonActive]}><Text style={[styles.filterButtonText, currentView === 'favorites' && styles.filterButtonTextActive]}>Favorites</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setCurrentView('trash')} style={[styles.filterButton, currentView === 'trash' && styles.filterButtonActive]}><Text style={[styles.filterButtonText, currentView === 'trash' && styles.filterButtonTextActive]}>Trash</Text></TouchableOpacity>
                </View>
            </View>

            <View style={{ flex: 1 }}>
                {notesToDisplay.length > 0 ? (
                    <ScrollView contentContainerStyle={styles.notesGrid}>
                        <View style={styles.column}>{notesToDisplay.filter((_, i) => i % 2 === 0).map(item => <NoteCard key={item.id} item={item} onOpen={handleOpenViewer} onToggleFavorite={handleToggleFavorite} onToggleItem={handleToggleChecklistItem}/>)}</View>
                        <View style={styles.column}>{notesToDisplay.filter((_, i) => i % 2 !== 0).map(item => <NoteCard key={item.id} item={item} onOpen={handleOpenViewer} onToggleFavorite={handleToggleFavorite} onToggleItem={handleToggleChecklistItem}/>)}</View>
                    </ScrollView>
                ) : ( <View style={styles.emptyListContainer}>
                        <Feather name={currentView === 'trash' ? 'trash-2' : 'file-text'} size={48} color={COLORS.accentSecondary} />
                        <Text style={styles.emptyListText}>{searchQuery ? 'No notes match your search.' : (currentView === 'favorites' ? "You have no favorite notes." : (currentView === 'trash' ? "Trash is empty." : "Create your first note!"))}</Text>
                    </View> )}
            </View>

            {isFabMenuVisible && (
                <TouchableWithoutFeedback onPress={() => setFabMenuVisible(false)}>
                    <Animated.View style={[styles.fabOverlay, { backgroundColor: fabOverlayBackground }]}>
                        <FabMenu onSelect={handleCreateNote} animation={fabAnimation}/>
                    </Animated.View>
                </TouchableWithoutFeedback>
            )}
            {currentView !== 'trash' && (
                <TouchableOpacity style={styles.createButton} onPress={() => setFabMenuVisible(!isFabMenuVisible)}>
                    <LinearGradient colors={[COLORS.accentSecondary, COLORS.accentPrimary]} style={styles.createButtonGradient}>
                        <Animated.View style={{transform: [{rotate: fabIconRotation}]}}><Feather name={"plus"} size={24} color="white" /></Animated.View>
                    </LinearGradient>
                </TouchableOpacity>
            )}

            <NoteEditorModal isVisible={isEditorVisible} onClose={() => setEditorVisible(false)} onSave={handleSaveNote} editingData={editingData} />
            <NoteViewerModal isVisible={isViewerVisible} note={viewingData?.note} onClose={() => setViewerVisible(false)} onEdit={() => handleOpenEditor(viewingData?.note)} onDelete={confirmDeleteNote} onToggleFavorite={handleToggleFavorite} onTogglePrivate={handleTogglePrivate} onToggleItem={handleToggleChecklistItem} />
            <CustomAlertModal isVisible={isDeleteModalVisible} onClose={() => setDeleteModalVisible(false)} onConfirm={moveToTrash} title="Move to Trash" message="This note will be moved to the trash and deleted permanently after 30 days." confirmText="Move" confirmColor={COLORS.accentPrimaryDarker} />
            <PinModal isVisible={isPinModalVisible} onClose={() => setPinModalVisible(false)} onSubmit={handlePinSubmit} isSettingPin={isSettingPin} />
            <InfoModal isVisible={infoModalConfig.isVisible} onClose={() => setInfoModalConfig({ isVisible: false })} title={infoModalConfig.title} message={infoModalConfig.message} iconName={infoModalConfig.iconName} iconColor={infoModalConfig.iconColor} />
            <ActionSheetModal isVisible={actionSheetConfig.isVisible} onClose={() => setActionSheetConfig({ isVisible: false, title: '', options: [] })} title={actionSheetConfig.title} options={actionSheetConfig.options} />
        </SafeAreaView>
    );
}
// --- Stylesheet ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bgMain, paddingTop: Platform.OS === 'android' ? 35 : 0 },
    fullScreenLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgMain },
    header: { paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.borderColor, alignItems: 'center' },
    headerTitle: { fontFamily: FONT_FAMILY.playfair, fontSize: 24, color: COLORS.textPrimary },
    controlsContainer: { paddingHorizontal: 20, paddingTop: 15 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: COLORS.borderColor },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, fontFamily: FONT_FAMILY.poppins, fontSize: 15, color: COLORS.textPrimary, height: 48 },
    filterContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 15 },
    filterButton: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginHorizontal: 5, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.borderColor },
    filterButtonActive: { backgroundColor: COLORS.accentPrimary, borderColor: COLORS.accentPrimary },
    filterButtonText: { fontFamily: FONT_FAMILY.poppinsMedium, fontSize: 14, color: COLORS.textSecondary },
    filterButtonTextActive: { color: COLORS.textOnAccent },
    notesGrid: { flexDirection: 'row', paddingHorizontal: 10, paddingTop: 0, paddingBottom: 100 },
    column: { flex: 1, paddingHorizontal: 5 },
    noteCardContainer: { marginBottom: 10 },
    noteCard: { borderRadius: 18, padding: 15, shadowColor: COLORS.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5, overflow: 'hidden' },
    favoriteIcon: { position: 'absolute', top: 10, right: 10, padding: 5, zIndex: 1 },
    noteTitle: { fontFamily: FONT_FAMILY.poppinsBold, fontSize: 16, color: COLORS.textPrimary, marginBottom: 5, paddingRight: 25 },
    noteContent: { fontFamily: FONT_FAMILY.poppins, fontSize: 14, color: COLORS.textSecondary, lineHeight: 21 },
    lockedCardContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 20, },
    noteDate: { fontFamily: FONT_FAMILY.poppins, fontSize: 12, color: COLORS.textSecondary, marginTop: 10, opacity: 0.9 },
    emptyListContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, opacity: 0.7 },
    emptyListText: { fontFamily: FONT_FAMILY.poppins, fontSize: 16, color: COLORS.textSecondary, marginTop: 15, textAlign: 'center' },
    createButton: { position: 'absolute', bottom: 80, right: 30, width: 60, height: 60, borderRadius: 30, shadowColor: COLORS.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8, zIndex: 9 },
    createButtonGradient: { flex: 1, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
    fabOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 },
    fabContainer: { position: 'absolute', right: 30, bottom: 90, alignItems: 'center' },
    fabIconContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.accentPrimary, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: COLORS.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    editorSafeArea: { flex: 1, backgroundColor: 'transparent' },
    editorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(78, 61, 82, 0.1)' },
    editorTitle: { fontFamily: FONT_FAMILY.poppinsBold, fontSize: 18, color: COLORS.textPrimary },
    editorHeaderText: { fontFamily: FONT_FAMILY.poppinsMedium, fontSize: 16, color: COLORS.accentPrimaryDarker, padding: 5 },
    editorSaveButton: { fontWeight: 'bold' },
    editorSaveButtonDisabled: { color: COLORS.textSecondary, opacity: 0.5 },
    editorContentContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
    editorTitleInput: { fontFamily: FONT_FAMILY.playfair, fontSize: 28, color: COLORS.textPrimary, paddingBottom: 15 },
    editorContentInput: { flex: 1, fontFamily: FONT_FAMILY.poppins, fontSize: 17, color: COLORS.textPrimary, lineHeight: 26, textAlignVertical: 'top' },
    editorToolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingLeft: 5, paddingRight: 15, borderTopWidth: 1, borderColor: 'rgba(78, 61, 82, 0.1)', backgroundColor: 'transparent' },
    toolbarLeftActions: { flexDirection: 'row' },
    toolbarButton: { padding: 10, marginHorizontal: 5 },
    themeSelector: { paddingVertical: 5 },
    themeDot: { width: 28, height: 28, borderRadius: 14, marginHorizontal: 5, borderWidth: 2, borderColor: 'transparent' },
    themeDotActive: { borderColor: 'white', transform: [{ scale: 1.1 }] },
    viewerSafeArea: { flex: 1, backgroundColor: 'transparent' },
    viewerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(78, 61, 82, 0.1)' },
    viewerHeaderActions: { flexDirection: 'row', alignItems: 'center' },
    viewerButton: { paddingHorizontal: 10, paddingVertical: 5 },
    viewerContentContainer: { padding: 20, paddingBottom: 50 },
    viewerTitle: { fontFamily: FONT_FAMILY.playfair, fontSize: 32, color: COLORS.textPrimary, marginBottom: 8 },
    viewerDate: { fontFamily: FONT_FAMILY.poppins, fontSize: 13, color: COLORS.textSecondary, marginBottom: 20 },
    viewerContent: { fontFamily: FONT_FAMILY.poppins, fontSize: 17, color: COLORS.textPrimary, lineHeight: 28 },
    checklistItem: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.textSecondary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    checklistItemText: { fontFamily: FONT_FAMILY.poppins, fontSize: 16, color: COLORS.textPrimary, flex: 1 },
    checklistItemTextChecked: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
    addChecklistItem: { flexDirection: 'row', alignItems: 'center', padding: 10, marginTop: 5 },
    addChecklistItemText: { fontFamily: FONT_FAMILY.poppins, fontSize: 16, color: COLORS.textSecondary, marginLeft: 10 },
    deleteItemButton: { padding: 5 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    alertContainer: { width: '100%', maxWidth: 400, backgroundColor: 'white', borderRadius: 24, padding: 25, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 10 },
    alertTitle: { fontFamily: FONT_FAMILY.poppinsBold, fontSize: 20, color: COLORS.textPrimary, marginBottom: 8 },
    alertMessage: { fontFamily: FONT_FAMILY.poppins, fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 25, lineHeight: 22 },
    alertButtonContainer: { flexDirection: 'row', width: '100%' },
    alertButton: { flex: 1, padding: 14, borderRadius: 16, alignItems: 'center' },
    alertButtonCancel: { backgroundColor: COLORS.borderColor, marginRight: 10 },
    alertButtonText: { fontFamily: FONT_FAMILY.poppinsBold, fontSize: 16, color: COLORS.textPrimary },
    singleAlertButton: { paddingVertical: 14, paddingHorizontal: 40, borderRadius: 16, alignItems: 'center', backgroundColor: COLORS.accentPrimary },
    pinInput: { width: '80%', height: 60, backgroundColor: COLORS.borderColor, borderRadius: 16, fontFamily: FONT_FAMILY.poppinsBold, fontSize: 24, color: COLORS.textPrimary, marginBottom: 15 },
    modalErrorText: { fontFamily: FONT_FAMILY.poppins, fontSize: 14, color: COLORS.danger, marginBottom: 15, textAlign: 'center' },
    actionSheetContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 10, paddingBottom: Platform.OS === 'ios' ? 30 : 10 },
    actionSheetTitle: { fontFamily: FONT_FAMILY.poppinsBold, fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 10, },
    actionSheetButton: { flexDirection: 'row', alignItems: 'center', padding: 15 },
    actionSheetButtonText: { fontFamily: FONT_FAMILY.poppinsMedium, fontSize: 18, marginLeft: 15 },
});