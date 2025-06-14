import React, { useState, useEffect, useMemo, useRef, createContext, useContext } from 'react';
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

// --- Theme Colors ---
const lightColors = {
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

const darkColors = {
    bgMain: '#1A1A2E', // Dark background
    bgCard: '#2F2F4F', // Darker card background
    textPrimary: '#E0E0E0', // Light text
    textSecondary: '#B0B0B0', // Lighter secondary text
    textOnAccent: '#FFFFFF',
    accentPrimary: '#BB86FC', // Purple accent for dark mode (from Material Design Dark)
    accentPrimaryDarker: '#9C27B0', // Darker purple
    accentSecondary: '#03DAC6', // Teal accent for dark mode
    borderColor: '#3A3A5A', // Darker border
    shadowColor: 'rgba(0,0,0,0.5)', // Darker shadow
    danger: '#FF6F60', // Adjusted red
    success: '#81C784', // Adjusted green
    info: '#64B5F6', // Adjusted blue
};

// --- Gradient Themes for Light Mode ---
const lightGradientThemes = [
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

// --- Gradient Themes for Dark Mode (Adjusted for softer look) ---
const darkGradientThemes = [
    ['#1D2B3A', '#2C4054', '#3E5770'], // Soft Blue-Grey
    ['#2A2A3D', '#3F3F5A', '#58587D'], // Muted Indigo
    ['#20322F', '#304A47', '#456662'], // Deep Forest Green
    ['#32283A', '#4A3D54', '#645370'], // Rich Plum
    ['#2D2A1C', '#423E2A', '#5A543E'], // Warm Earthy Brown
    ['#1B3D4C', '#2A637C', '#3A8FB0'], // Deep Teal Blue
    ['#222222', '#333333', '#444444'], // Slightly Lighter Greys
    ['#3B2C1F', '#5A442E', '#7D614A'], // Rusty Orange-Brown
    ['#3F1E28', '#5E2C3D', '#81415A'], // Deep Berry Red
    ['#1A2A2A', '#2B4A4A', '#3C6B6B'], // Muted Cyan-Green
];

// Combined gradients for dynamic selection
const ALL_GRADIENT_THEMES = {
    light: lightGradientThemes,
    dark: darkGradientThemes,
};

const FONT_FAMILY = {
    playfair: 'PlayfairDisplay_600SemiBold',
    poppins: 'Poppins_400Regular',
    poppinsMedium: 'Poppins_500Medium',
    poppinsBold: 'Poppins_600SemiBold',
};

// --- Theme Context ---
const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

const ThemeProvider = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const THEME_KEY = '@AminaAura:theme';

    useEffect(() => {
        const loadTheme = async () => {
            try {
                const storedTheme = await AsyncStorage.getItem(THEME_KEY);
                if (storedTheme !== null) {
                    setIsDarkMode(JSON.parse(storedTheme));
                }
            } catch (e) {
                console.error("Failed to load theme.", e);
            }
        };
        loadTheme();
    }, []);

    const toggleDarkMode = async () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        try {
            await AsyncStorage.setItem(THEME_KEY, JSON.stringify(newMode));
        } catch (e) {
            console.error("Failed to save theme.", e);
        }
    };

    const colors = isDarkMode ? darkColors : lightColors;

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, colors }}>
            {children}
        </ThemeContext.Provider>
    );
};


// --- Helper: Checklist Item ---
const ChecklistItem = React.memo(({ item, onToggle, isEditing, onTextChange, onAddItem, onDeleteItem, colors }) => (
    <View style={getStyles(colors).checklistItem}>
        <TouchableOpacity onPress={onToggle} style={[getStyles(colors).checkbox, {borderColor: colors.textSecondary}]}>
            {item.isChecked && <Feather name="check" size={14} color={colors.textSecondary} />}
        </TouchableOpacity>
        <TextInput
            value={item.text}
            onChangeText={onTextChange}
            placeholder="List item"
            placeholderTextColor={colors.textSecondary}
            style={[getStyles(colors).checklistItemText, {color: colors.textPrimary}, item.isChecked && !isEditing && getStyles(colors).checklistItemTextChecked]}
            editable={isEditing}
            onSubmitEditing={onAddItem}
        />
        {isEditing && (
            <TouchableOpacity onPress={onDeleteItem} style={getStyles(colors).deleteItemButton}>
                <Feather name="x" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
        )}
    </View>
));

// --- Note Viewer Modal ---
const NoteViewerModal = ({ isVisible, note, onClose, onEdit, onDelete, onToggleFavorite, onTogglePrivate, onToggleItem }) => {
    const { colors, isDarkMode } = useTheme();
    if (!note) return null;

    // Dynamically select gradient theme based on current mode
    const currentGradientTheme = ALL_GRADIENT_THEMES[isDarkMode ? 'dark' : 'light'][note.themeIndex || 0];

    return (
        <Modal visible={isVisible} animationType="slide" onRequestClose={onClose}>
            <LinearGradient colors={currentGradientTheme} style={{ flex: 1 }}>
                <SafeAreaView style={getStyles(colors).viewerSafeArea}>
                    <View style={getStyles(colors).viewerHeader}>
                        <TouchableOpacity onPress={onClose} style={getStyles(colors).viewerButton}>
                            <Feather name="chevron-left" size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <View style={getStyles(colors).viewerHeaderActions}>
                            <TouchableOpacity onPress={() => onTogglePrivate(note.id)} style={getStyles(colors).viewerButton}>
                                <Feather name={note.isPrivate ? "lock" : "unlock"} size={20} color={colors.textPrimary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => onToggleFavorite(note.id)} style={getStyles(colors).viewerButton}>
                                <Feather name="star" size={22} color={note.isFavorite ? colors.accentPrimaryDarker : colors.textPrimary} style={{ opacity: note.isFavorite ? 1 : 0.5 }} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => onEdit(note)} style={getStyles(colors).viewerButton}>
                                <Feather name="edit-2" size={20} color={colors.textPrimary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => onDelete(note.id)} style={getStyles(colors).viewerButton}>
                                <Feather name="trash-2" size={20} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <ScrollView contentContainerStyle={getStyles(colors).viewerContentContainer}>
                        <Text style={[getStyles(colors).viewerTitle, {color: colors.textPrimary}]}>{note.title || "Note"}</Text>
                        <Text style={[getStyles(colors).viewerDate, {color: colors.textSecondary}]}>Last updated: {new Date(note.date).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                        {note.type === 'checklist' ? (
                            (note.content || []).map(item => (
                                <ChecklistItem key={item.id} item={item} isEditing={false} onToggle={() => onToggleItem(note.id, item.id)} colors={colors} />
                            ))
                        ) : (
                            <Text style={[getStyles(colors).viewerContent, {color: colors.textPrimary}]}>{note.content}</Text>
                        )}
                    </ScrollView>
                </SafeAreaView>
            </LinearGradient>
        </Modal>
    );
}

// --- Note Editor Modal ---
const NoteEditorModal = ({ isVisible, onClose, onSave, editingData }) => {
    const { colors, isDarkMode } = useTheme();
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
            // Ensure themeIndex is within bounds of the current mode's gradient themes
            const maxThemeIndex = ALL_GRADIENT_THEMES[isDarkMode ? 'dark' : 'light'].length - 1;
            setThemeIndex(editingNote?.themeIndex != null ? Math.min(editingNote.themeIndex, maxThemeIndex) : Math.floor(Math.random() * (maxThemeIndex + 1)));

            if (initialType === 'checklist') {
                setContent('');
                setChecklistItems(editingNote && Array.isArray(editingNote.content) ? editingNote.content : [{ id: Date.now(), text: '', isChecked: false }]);
            } else {
                setContent(editingNote?.content || '');
                setChecklistItems([]);
            }
        }
    }, [editingData, isVisible, isDarkMode]); // Add isDarkMode to dependencies

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

    // Select active theme from the correct set (light/dark)
    const activeTheme = ALL_GRADIENT_THEMES[isDarkMode ? 'dark' : 'light'][themeIndex];

    return (
        <Modal visible={isVisible} animationType="slide" onRequestClose={onClose}>
            <LinearGradient colors={activeTheme} style={{ flex: 1 }}>
                <SafeAreaView style={getStyles(colors).editorSafeArea}>
                    <View style={getStyles(colors).editorHeader}>
                        <TouchableOpacity onPress={onClose} style={getStyles(colors).viewerButton}><Text style={[getStyles(colors).editorHeaderText, {color: colors.textPrimary}]}>Cancel</Text></TouchableOpacity>
                        <Text style={[getStyles(colors).editorTitle, {color: colors.textPrimary}]}>{editingNote ? "Edit Note" : "Create Note"}</Text>
                        <TouchableOpacity onPress={handleSave} disabled={!canSave} style={getStyles(colors).viewerButton}><Text style={[getStyles(colors).editorHeaderText, getStyles(colors).editorSaveButton, !canSave && getStyles(colors).editorSaveButtonDisabled, {color: colors.accentPrimaryDarker}]}>Save</Text></TouchableOpacity>
                    </View>
                    <ScrollView style={getStyles(colors).editorContentContainer}>
                        <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={[getStyles(colors).editorTitleInput, {color: colors.textPrimary}]} placeholderTextColor={colors.textSecondary} multiline={true} />
                        {currentNoteType === 'checklist' ? (
                            <View>
                                {checklistItems.map((item, index) => (
                                    <ChecklistItem key={item.id} item={item} isEditing={true} onTextChange={(text) => handleChecklistTextChange(item.id, text)} onAddItem={index === checklistItems.length - 1 ? handleAddChecklistItem : () => {}} onDeleteItem={() => handleDeleteChecklistItem(item.id)} colors={colors} />
                                ))}
                                <TouchableOpacity onPress={handleAddChecklistItem} style={getStyles(colors).addChecklistItem}>
                                    <Feather name="plus" size={16} color={colors.textSecondary} />
                                    <Text style={[getStyles(colors).addChecklistItemText, {color: colors.textSecondary}]}>Add Item</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TextInput placeholder="Your thoughts here..." value={content} onChangeText={setContent} multiline style={[getStyles(colors).editorContentInput, {color: colors.textPrimary}]} placeholderTextColor={colors.textSecondary} />
                        )}
                    </ScrollView>
                    <View style={getStyles(colors).editorToolbar}>
                        <View style={getStyles(colors).toolbarLeftActions}>
                             <TouchableOpacity onPress={toggleNoteType} style={getStyles(colors).toolbarButton}>
                                 <Feather name={currentNoteType === 'checklist' ? 'type' : 'check-square'} size={22} color={colors.textPrimary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setIsPrivate(!isPrivate)} style={getStyles(colors).toolbarButton}>
                                <Feather name={isPrivate ? 'lock' : 'unlock'} size={22} color={isPrivate ? colors.accentPrimaryDarker : colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={getStyles(colors).themeSelector}>
                           {ALL_GRADIENT_THEMES[isDarkMode ? 'dark' : 'light'].map((theme, index) => (
                               <TouchableOpacity key={index} onPress={() => setThemeIndex(index)}>
                                   <LinearGradient colors={theme} style={[getStyles(colors).themeDot, themeIndex === index && getStyles(colors).themeDotActive]} />
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
    const { colors } = useTheme();
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
            <View style={getStyles(colors).modalOverlay}>
                <View style={getStyles(colors).alertContainer}>
                    <Feather name="key" size={24} color={colors.accentSecondary} style={{marginBottom: 10}}/>
                    <Text style={getStyles(colors).alertTitle}>{title}</Text>
                     <Text style={getStyles(colors).alertMessage}>
                         {isSettingPin ? "This PIN will protect your locked notes." : "Please enter your PIN to continue."}
                    </Text>
                    <TextInput style={[getStyles(colors).pinInput, {backgroundColor: colors.borderColor, color: colors.textPrimary}]} placeholder="----" placeholderTextColor={colors.textSecondary+'80'} secureTextEntry value={pin} onChangeText={setPin} keyboardType="numeric" maxLength={4} textAlign="center" letterSpacing={20} />
                    {isSettingPin && (
                        <TextInput style={[getStyles(colors).pinInput, {backgroundColor: colors.borderColor, color: colors.textPrimary}]} placeholder="----" placeholderTextColor={colors.textSecondary+'80'} secureTextEntry value={confirmPin} onChangeText={setConfirmPin} keyboardType="numeric" maxLength={4} textAlign="center" letterSpacing={20} />
                    )}
                    {error ? <Text style={getStyles(colors).modalErrorText}>{error}</Text> : null}
                    <View style={getStyles(colors).alertButtonContainer}>
                        <TouchableOpacity style={[getStyles(colors).alertButton, getStyles(colors).alertButtonCancel, {backgroundColor: colors.borderColor}]} onPress={handleClose}><Text style={[getStyles(colors).alertButtonText, {color: colors.textPrimary}]}>Cancel</Text></TouchableOpacity>
                        <TouchableOpacity style={[getStyles(colors).alertButton, { backgroundColor: colors.accentPrimary }]} onPress={handleSubmit}><Text style={getStyles(colors).alertButtonTextWhite}>{isSettingPin ? "Set PIN" : "Unlock"}</Text></TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const InfoModal = ({ isVisible, onClose, title, message, iconName = "info", iconColor }) => {
    const { colors } = useTheme();
    const finalIconColor = iconColor || colors.info; // Use provided color or default from theme
    return (
        <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View style={getStyles(colors).modalOverlay}>
                <View style={getStyles(colors).alertContainer}>
                    <Feather name={iconName} size={24} color={finalIconColor} style={{ marginBottom: 10 }} />
                    <Text style={getStyles(colors).alertTitle}>{title}</Text>
                    <Text style={getStyles(colors).alertMessage}>{message}</Text>
                    <TouchableOpacity style={[getStyles(colors).singleAlertButton, {backgroundColor: colors.accentPrimary}]} onPress={onClose}>
                        <Text style={getStyles(colors).alertButtonTextWhite}>OK</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const ActionSheetModal = ({ isVisible, onClose, title, options }) => {
    const { colors } = useTheme();
    return (
        <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={getStyles(colors).modalOverlay}>
                    <TouchableWithoutFeedback>
                        <View style={getStyles(colors).actionSheetContainer}>
                            <Text style={getStyles(colors).actionSheetTitle}>{title}</Text>
                            {(options || []).map((opt, index) => (
                                <TouchableOpacity key={index} style={getStyles(colors).actionSheetButton} onPress={() => { opt.onPress(); onClose(); }}>
                                    <Feather name={opt.icon} size={20} color={opt.color || colors.textPrimary} />
                                    <Text style={[getStyles(colors).actionSheetButtonText, { color: opt.color || colors.textPrimary }]}>{opt.label}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity style={[getStyles(colors).actionSheetButton, { borderTopWidth: 1, borderColor: colors.borderColor }]} onPress={onClose}>
                                <Text style={[getStyles(colors).actionSheetButtonText, {color: colors.textPrimary}]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const CustomAlertModal = ({ isVisible, onClose, onConfirm, title, message, confirmText = "Delete", confirmColor }) => {
    const { colors } = useTheme();
    const finalConfirmColor = confirmColor || colors.danger; // Use provided color or default from theme
    return (
        <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View style={getStyles(colors).modalOverlay}>
                <View style={getStyles(colors).alertContainer}>
                     <Feather name="alert-triangle" size={24} color={finalConfirmColor} style={{marginBottom: 10}}/>
                    <Text style={getStyles(colors).alertTitle}>{title}</Text>
                    <Text style={getStyles(colors).alertMessage}>{message}</Text>
                    <View style={getStyles(colors).alertButtonContainer}>
                        <TouchableOpacity style={[getStyles(colors).alertButton, getStyles(colors).alertButtonCancel, {backgroundColor: colors.borderColor}]} onPress={onClose}><Text style={[getStyles(colors).alertButtonText, {color: colors.textPrimary}]}>Cancel</Text></TouchableOpacity>
                        <TouchableOpacity style={[getStyles(colors).alertButton, { backgroundColor: finalConfirmColor }]} onPress={onConfirm}><Text style={getStyles(colors).alertButtonTextWhite}>{confirmText}</Text></TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// --- FAB Menu Component ---
const FabMenu = ({ onSelect, animation }) => {
    const { colors } = useTheme();
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
        <View style={getStyles(colors).fabContainer} pointerEvents="box-none">
            <Animated.View style={listIconAnimation}>
                <TouchableOpacity style={[getStyles(colors).fabIconContainer, {backgroundColor: colors.accentPrimary}]} onPress={() => onSelect('checklist')}>
                    <Feather name="check-square" size={20} color="white" />
                </TouchableOpacity>
            </Animated.View>
            <Animated.View style={textIconAnimation}>
                <TouchableOpacity style={[getStyles(colors).fabIconContainer, {backgroundColor: colors.accentPrimary}]} onPress={() => onSelect('text')}>
                    <Feather name="type" size={20} color="white" />
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const NoteCard = React.memo(({ item, onOpen, onToggleFavorite, onToggleItem }) => {
    const { colors, isDarkMode } = useTheme();
    // Dynamically select the base color from the appropriate gradient theme
    const cardBaseColor = ALL_GRADIENT_THEMES[isDarkMode ? 'dark' : 'light'][item.themeIndex || 0][0];
    const isTrashed = !!item.deletedAt;

    if (item.isPrivate && !isTrashed) {
        return (
            <TouchableOpacity style={getStyles(colors).noteCardContainer} onPress={() => onOpen(item)}>
                {/* For private notes, use the theme's bgCard for a consistent locked appearance */}
                <View style={[getStyles(colors).noteCard, { backgroundColor: colors.bgCard, justifyContent: 'space-between', minHeight: 150 }]}>
                    <View style={getStyles(colors).lockedCardContent}>
                                 <Feather name="lock" size={40} color={colors.textSecondary} style={{opacity: 0.5}}/>
                    </View>
                    <View>
                        {/* Text in locked card should be primary text color for readability */}
                        <Text style={[getStyles(colors).noteTitle, {textAlign: 'center', color: colors.textPrimary}]} numberOfLines={1}>{item.title || "Locked Note"}</Text>
                        <Text style={[getStyles(colors).noteDate, {textAlign: 'center', color: colors.textSecondary}]}>{new Date(item.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity style={getStyles(colors).noteCardContainer} onPress={() => onOpen(item)}>
            {/* For regular notes, use the selected gradient theme's base color */}
            <View style={[getStyles(colors).noteCard, { backgroundColor: cardBaseColor }]}>
                {!isTrashed && (
                    <TouchableOpacity style={getStyles(colors).favoriteIcon} onPress={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}>
                        <Feather name="star" size={18} color={item.isFavorite ? colors.accentPrimaryDarker : colors.textSecondary} style={{ opacity: item.isFavorite ? 1 : 0.4 }} />
                    </TouchableOpacity>
                )}
                {/* Ensure note title and content use textPrimary for readability against varied gradient backgrounds */}
                <Text style={[getStyles(colors).noteTitle, {color: colors.textPrimary}]} numberOfLines={2}>{item.title || "Untitled Note"}</Text>
                {item.type === 'checklist' ? (
                    <View>
                        {(item.content || []).slice(0, 4).map(checkItem => (
                            <ChecklistItem key={checkItem.id} item={checkItem} isEditing={false} onToggle={(e) => { e.stopPropagation(); onToggleItem(item.id, checkItem.id) }} colors={colors} />
                        ))}
                    </View>
                ) : (
                    <Text style={[getStyles(colors).noteContent, {color: colors.textPrimary}]} numberOfLines={5}>{item.content}</Text>
                )}
                <Text style={[getStyles(colors).noteDate, {color: colors.textSecondary}]}>{isTrashed ? `Deleted: ${new Date(item.deletedAt).toLocaleDateString()}` : new Date(item.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
        </TouchableOpacity>
    );
});


// --- Standalone Notepad Screen ---
function NotepadScreen() {
    const { isDarkMode, toggleDarkMode, colors } = useTheme();
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
            showInfoModal("Note Restored", "The note has been moved back to your main list.", "rotate-ccw", colors.success);
        }
    };

    const handlePermanentDelete = (noteId) => {
        saveTrashedNotes(trashedNotes.filter(note => note.id !== noteId));
        showInfoModal("Deleted", "The note has been permanently deleted.", "trash-2", colors.danger);
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
            showInfoModal("PIN Set!", "Your PIN has been set successfully.", "check-circle", colors.success);
        } else {
            if (pin === appPin) {
                if (noteToUnlock) {
                    setViewingData({ note: noteToUnlock });
                    setViewerVisible(true);
                    setNoteToUnlock(null);
                }
            } else {
                showInfoModal("Incorrect PIN", "The PIN you entered is incorrect. Please try again.", "alert-triangle", colors.danger);
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
                     { label: "Restore Note", icon: "rotate-ccw", color: colors.success, onPress: () => handleRestoreNote(note.id) },
                     { label: "Delete Permanently", icon: "trash-2", color: colors.danger, onPress: () => handlePermanentDelete(note.id) },
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

    if (!fontsLoaded) return <View style={getStyles(colors).fullScreenLoader}><ActivityIndicator size="large" color={colors.accentPrimary} /></View>;

    return (
        <SafeAreaView style={getStyles(colors).container}>
            {/* Centered Header */}
            <View style={getStyles(colors).header}>
                <View style={{flex: 1, alignItems: 'flex-start'}}>
                    {/* Empty view to push the title to center */}
                </View>
                <Text style={getStyles(colors).headerTitle}>Amina's Note</Text>
                <View style={{flex: 1, alignItems: 'flex-end'}}>
                    <TouchableOpacity onPress={toggleDarkMode} style={{padding: 5}}>
                        <Feather name={isDarkMode ? "moon" : "sun"} size={22} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>
            <View style={getStyles(colors).controlsContainer}>
                <View style={[getStyles(colors).searchContainer, {backgroundColor: colors.bgCard, borderColor: colors.borderColor}]}>
                    <Feather name="search" size={16} color={colors.textSecondary} style={getStyles(colors).searchIcon} />
                    <TextInput placeholder="Search notes..." placeholderTextColor={colors.textSecondary} style={[getStyles(colors).searchInput, {color: colors.textPrimary}]} value={searchQuery} onChangeText={setSearchQuery} />
                </View>
                <View style={getStyles(colors).filterContainer}>
                    <TouchableOpacity onPress={() => setCurrentView('all')} style={[getStyles(colors).filterButton, {backgroundColor: colors.bgCard, borderColor: colors.borderColor}, currentView === 'all' && getStyles(colors).filterButtonActive]}><Text style={[getStyles(colors).filterButtonText, {color: colors.textSecondary}, currentView === 'all' && getStyles(colors).filterButtonTextActive]}>All</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setCurrentView('favorites')} style={[getStyles(colors).filterButton, {backgroundColor: colors.bgCard, borderColor: colors.borderColor}, currentView === 'favorites' && getStyles(colors).filterButtonActive]}><Text style={[getStyles(colors).filterButtonText, {color: colors.textSecondary}, currentView === 'favorites' && getStyles(colors).filterButtonTextActive]}>Favorites</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setCurrentView('trash')} style={[getStyles(colors).filterButton, {backgroundColor: colors.bgCard, borderColor: colors.borderColor}, currentView === 'trash' && getStyles(colors).filterButtonActive]}><Text style={[getStyles(colors).filterButtonText, {color: colors.textSecondary}, currentView === 'trash' && getStyles(colors).filterButtonTextActive]}>Trash</Text></TouchableOpacity>
                </View>
            </View>

            <View style={{ flex: 1 }}>
                {notesToDisplay.length > 0 ? (
                    <ScrollView contentContainerStyle={getStyles(colors).notesGrid}>
                        <View style={getStyles(colors).column}>{notesToDisplay.filter((_, i) => i % 2 === 0).map(item => <NoteCard key={item.id} item={item} onOpen={handleOpenViewer} onToggleFavorite={handleToggleFavorite} onToggleItem={handleToggleChecklistItem}/>)}</View>
                        <View style={getStyles(colors).column}>{notesToDisplay.filter((_, i) => i % 2 !== 0).map(item => <NoteCard key={item.id} item={item} onOpen={handleOpenViewer} onToggleFavorite={handleToggleFavorite} onToggleItem={handleToggleChecklistItem}/>)}</View>
                    </ScrollView>
                ) : ( <View style={getStyles(colors).emptyListContainer}>
                                 <Feather name={currentView === 'trash' ? 'trash-2' : 'file-text'} size={48} color={colors.accentSecondary} />
                                 <Text style={getStyles(colors).emptyListText}>{searchQuery ? 'No notes match your search.' : (currentView === 'favorites' ? "You have no favorite notes." : (currentView === 'trash' ? "Trash is empty." : "Create your first note!"))}</Text>
                             </View> )}
            </View>

            {isFabMenuVisible && (
                <TouchableWithoutFeedback onPress={() => setFabMenuVisible(false)}>
                    <Animated.View style={[getStyles(colors).fabOverlay, { backgroundColor: fabOverlayBackground }]}>
                        <FabMenu onSelect={handleCreateNote} animation={fabAnimation}/>
                    </Animated.View>
                </TouchableWithoutFeedback>
            )}
            {currentView !== 'trash' && (
                <TouchableOpacity style={getStyles(colors).createButton} onPress={() => setFabMenuVisible(!isFabMenuVisible)}>
                    <LinearGradient colors={[colors.accentSecondary, colors.accentPrimary]} style={getStyles(colors).createButtonGradient}>
                        <Animated.View style={{transform: [{rotate: fabIconRotation}]}}><Feather name={"plus"} size={24} color="white" /></Animated.View>
                    </LinearGradient>
                </TouchableOpacity>
            )}

            <NoteEditorModal isVisible={isEditorVisible} onClose={() => setEditorVisible(false)} onSave={handleSaveNote} editingData={editingData} />
            <NoteViewerModal isVisible={isViewerVisible} note={viewingData?.note} onClose={() => setViewerVisible(false)} onEdit={() => handleOpenEditor(viewingData?.note)} onDelete={confirmDeleteNote} onToggleFavorite={handleToggleFavorite} onTogglePrivate={handleTogglePrivate} onToggleItem={handleToggleChecklistItem} />
            <CustomAlertModal isVisible={isDeleteModalVisible} onClose={() => setDeleteModalVisible(false)} onConfirm={moveToTrash} title="Move to Trash" message="This note will be moved to the trash and deleted permanently after 30 days." confirmText="Move" confirmColor={colors.accentPrimaryDarker} />
            <PinModal isVisible={isPinModalVisible} onClose={() => setPinModalVisible(false)} onSubmit={handlePinSubmit} isSettingPin={isSettingPin} />
            <InfoModal isVisible={infoModalConfig.isVisible} onClose={() => setInfoModalConfig({ isVisible: false })} title={infoModalConfig.title} message={infoModalConfig.message} iconName={infoModalConfig.iconName} iconColor={infoModalConfig.iconColor} />
            <ActionSheetModal isVisible={actionSheetConfig.isVisible} onClose={() => setActionSheetConfig({ isVisible: false, title: '', options: [] })} title={actionSheetConfig.title} options={actionSheetConfig.options} />
        </SafeAreaView>
    );
}

// --- Stylesheet ---
// Using a function to create styles based on the current theme colors
const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgMain, paddingTop: Platform.OS === 'android' ? 35 : 0 },
    fullScreenLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgMain },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    headerTitle: { fontFamily: FONT_FAMILY.playfair, fontSize: 24, color: colors.textPrimary },
    controlsContainer: { paddingHorizontal: 20, paddingTop: 15 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: colors.borderColor },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, fontFamily: FONT_FAMILY.poppins, fontSize: 15, height: 48 },
    filterContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 15 },
    filterButton: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginHorizontal: 5, borderWidth: 1 },
    filterButtonActive: { backgroundColor: colors.accentPrimary, borderColor: colors.accentPrimary },
    filterButtonText: { fontFamily: FONT_FAMILY.poppinsMedium, fontSize: 14 },
    filterButtonTextActive: { color: colors.textOnAccent },
    notesGrid: { flexDirection: 'row', paddingHorizontal: 10, paddingTop: 0, paddingBottom: 100 },
    column: { flex: 1, paddingHorizontal: 5 },
    noteCardContainer: { marginBottom: 10 },
    noteCard: { borderRadius: 18, padding: 15, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5, overflow: 'hidden' },
    favoriteIcon: { position: 'absolute', top: 10, right: 10, padding: 5, zIndex: 1 },
    noteTitle: { fontFamily: FONT_FAMILY.poppinsBold, fontSize: 16, marginBottom: 5, paddingRight: 25 }, // Color set inline
    noteContent: { fontFamily: FONT_FAMILY.poppins, fontSize: 14, lineHeight: 21 }, // Color set inline
    lockedCardContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 20, },
    noteDate: { fontFamily: FONT_FAMILY.poppins, fontSize: 12, marginTop: 10, opacity: 0.9 }, // Color set inline
    emptyListContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, opacity: 0.7 },
    emptyListText: { fontFamily: FONT_FAMILY.poppins, fontSize: 16, color: colors.textSecondary, marginTop: 15, textAlign: 'center' },
    createButton: { position: 'absolute', bottom: 80, right: 30, width: 60, height: 60, borderRadius: 30, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8, zIndex: 9 },
    createButtonGradient: { flex: 1, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
    fabOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 },
    fabContainer: { position: 'absolute', right: 30, bottom: 90, alignItems: 'center' },
    fabIconContainer: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    editorSafeArea: { flex: 1, backgroundColor: 'transparent' },
    editorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    editorTitle: { fontFamily: FONT_FAMILY.poppinsBold, fontSize: 18 }, // Color set inline
    editorHeaderText: { fontFamily: FONT_FAMILY.poppinsMedium, fontSize: 16, padding: 5 }, // Color set inline
    editorSaveButton: { fontWeight: 'bold' },
    editorSaveButtonDisabled: { opacity: 0.5 }, // Color from getStyles(colors).editorHeaderText
    editorContentContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
    editorTitleInput: { fontFamily: FONT_FAMILY.playfair, fontSize: 28, paddingBottom: 15 }, // Color set inline
    editorContentInput: { flex: 1, fontFamily: FONT_FAMILY.poppins, fontSize: 17, lineHeight: 26, textAlignVertical: 'top' }, // Color set inline
    editorToolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingLeft: 5, paddingRight: 15, borderTopWidth: 1, borderColor: colors.borderColor, backgroundColor: 'transparent' },
    toolbarLeftActions: { flexDirection: 'row' },
    toolbarButton: { padding: 10, marginHorizontal: 5 },
    themeSelector: { paddingVertical: 5 },
    themeDot: { width: 28, height: 28, borderRadius: 14, marginHorizontal: 5, borderWidth: 2, borderColor: 'transparent' },
    themeDotActive: { borderColor: 'white', transform: [{ scale: 1.1 }] },
    viewerSafeArea: { flex: 1, backgroundColor: 'transparent' },
    viewerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: colors.borderColor },
    viewerHeaderActions: { flexDirection: 'row', alignItems: 'center' },
    viewerButton: { paddingHorizontal: 10, paddingVertical: 5 },
    viewerContentContainer: { padding: 20, paddingBottom: 50 },
    viewerTitle: { fontFamily: FONT_FAMILY.playfair, fontSize: 32, marginBottom: 8 }, // Color set inline
    viewerDate: { fontFamily: FONT_FAMILY.poppins, fontSize: 13, marginBottom: 20 }, // Color set inline
    viewerContent: { fontFamily: FONT_FAMILY.poppins, fontSize: 17, lineHeight: 28 }, // Color set inline
    checklistItem: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginRight: 12 }, // BorderColor set inline
    checklistItemText: { fontFamily: FONT_FAMILY.poppins, fontSize: 16, flex: 1 }, // Color set inline
    checklistItemTextChecked: { textDecorationLine: 'line-through' }, // Color from getStyles(colors).checklistItemText
    addChecklistItem: { flexDirection: 'row', alignItems: 'center', padding: 10, marginTop: 5 },
    addChecklistItemText: { fontFamily: FONT_FAMILY.poppins, fontSize: 16, marginLeft: 10 }, // Color set inline
    deleteItemButton: { padding: 5 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    alertContainer: { width: '100%', maxWidth: 400, backgroundColor: colors.bgCard, borderRadius: 24, padding: 25, alignItems: 'center', shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 10 },
    alertTitle: { fontFamily: FONT_FAMILY.poppinsBold, fontSize: 20, color: colors.textPrimary, marginBottom: 8 },
    alertMessage: { fontFamily: FONT_FAMILY.poppins, fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 25, lineHeight: 22 },
    alertButtonContainer: { flexDirection: 'row', width: '100%' },
    alertButton: { flex: 1, padding: 14, borderRadius: 16, alignItems: 'center' },
    alertButtonCancel: { marginRight: 10 },
    alertButtonText: { fontFamily: FONT_FAMILY.poppinsBold, fontSize: 16 }, // Color set inline
    alertButtonTextWhite: { fontFamily: FONT_FAMILY.poppinsBold, fontSize: 16, color: colors.textOnAccent },
    singleAlertButton: { paddingVertical: 14, paddingHorizontal: 40, borderRadius: 16, alignItems: 'center' },
    pinInput: { width: '80%', height: 60, borderRadius: 16, fontFamily: FONT_FAMILY.poppinsBold, fontSize: 24, marginBottom: 15 }, // Background and color set inline
    modalErrorText: { fontFamily: FONT_FAMILY.poppins, fontSize: 14, color: colors.danger, marginBottom: 15, textAlign: 'center' },
    actionSheetContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 10, paddingBottom: Platform.OS === 'ios' ? 30 : 10 },
    actionSheetTitle: { fontFamily: FONT_FAMILY.poppinsBold, fontSize: 16, color: colors.textSecondary, textAlign: 'center', paddingVertical: 10, },
    actionSheetButton: { flexDirection: 'row', alignItems: 'center', padding: 15 },
    actionSheetButtonText: { fontFamily: FONT_FAMILY.poppinsMedium, fontSize: 18, marginLeft: 15 }, // Color set inline
});

// Main App component wrapper for ThemeProvider
export default function App() {
    return (
        <ThemeProvider>
            <NotepadScreen />
        </ThemeProvider>
    );
}
