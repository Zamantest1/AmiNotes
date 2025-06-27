"use client"

import React, { useState, useEffect, useMemo, useRef, createContext, useContext } from "react"
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
  Image,
  Dimensions,
  Alert,
} from "react-native"
import { Feather } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useFonts, PlayfairDisplay_600SemiBold } from "@expo-google-fonts/playfair-display"
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold } from "@expo-google-fonts/poppins"
import { LinearGradient } from "expo-linear-gradient"
import * as ImagePicker from "expo-image-picker"
import * as FileSystem from "expo-file-system"
import * as DocumentPicker from "expo-document-picker"
import * as Sharing from "expo-sharing"

const { width: screenWidth, height: screenHeight } = Dimensions.get("window")

// --- Theme Colors ---
const lightColors = {
  bgMain: "#FDF7FA",
  bgCard: "#FFFFFF",
  textPrimary: "#4E3D52",
  textSecondary: "#8A798D",
  textOnAccent: "#FFFFFF",
  accentPrimary: "#EF9A9A",
  accentPrimaryDarker: "#E57373",
  accentSecondary: "#CE93D8",
  borderColor: "#F3EAF5",
  shadowColor: "rgba(149, 117, 205, 0.2)",
  danger: "#D32F2F",
  success: "#66BB6A",
  info: "#4FC3F7",
}

const darkColors = {
  bgMain: "#1A1A2E",
  bgCard: "#2F2F4F",
  textPrimary: "#E0E0E0",
  textSecondary: "#B0B0B0",
  textOnAccent: "#FFFFFF",
  accentPrimary: "#BB86FC",
  accentPrimaryDarker: "#9C27B0",
  accentSecondary: "#03DAC6",
  borderColor: "#3A3A5A",
  shadowColor: "rgba(0,0,0,0.5)",
  danger: "#FF6F60",
  success: "#81C784",
  info: "#64B5F6",
}

// --- Gradient Themes ---
const lightGradientThemes = [
  ["#FEEAE6", "#F8BBD0", "#E1BEE7"],
  ["#E1F5FE", "#B3E5FC", "#81D4FA"],
  ["#E8F5E9", "#C8E6C9", "#A5D6A7"],
  ["#FFFDE7", "#FFF9C4", "#FFF59D"],
  ["#FBE9E7", "#FFCCBC", "#FFAB91"],
  ["#ede5ff", "#d8b4fe", "#a78bfa"],
  ["#f0fdf4", "#bbf7d0", "#4ade80"],
  ["#fefce8", "#fef08a", "#facc15"],
  ["#fff1f2", "#ffc0cb", "#f472b6"],
  ["#ecfeff", "#a5f3fc", "#22d3ee"],
]

const darkGradientThemes = [
  ["#1D2B3A", "#2C4054", "#3E5770"],
  ["#2A2A3D", "#3F3F5A", "#58587D"],
  ["#20322F", "#304A47", "#456662"],
  ["#32283A", "#4A3D54", "#645370"],
  ["#2D2A1C", "#423E2A", "#5A543E"],
  ["#1B3D4C", "#2A637C", "#3A8FB0"],
  ["#222222", "#333333", "#444444"],
  ["#3B2C1F", "#5A442E", "#7D614A"],
  ["#3F1E28", "#5E2C3D", "#81415A"],
  ["#1A2A2A", "#2B4A4A", "#3C6B6B"],
]

const ALL_GRADIENT_THEMES = {
  light: lightGradientThemes,
  dark: darkGradientThemes,
}

const FONT_FAMILY = {
  playfair: "PlayfairDisplay_600SemiBold",
  poppins: "Poppins_400Regular",
  poppinsMedium: "Poppins_500Medium",
  poppinsBold: "Poppins_600SemiBold",
}

// --- Theme Context ---
const ThemeContext = createContext()
export const useTheme = () => useContext(ThemeContext)

const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isThemeLoaded, setIsThemeLoaded] = useState(false)
  const THEME_KEY = "@AminaAura:theme"

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_KEY)
        if (storedTheme !== null) {
          setIsDarkMode(JSON.parse(storedTheme))
        }
      } catch (e) {
        console.error("Failed to load theme.", e)
      } finally {
        setIsThemeLoaded(true)
      }
    }
    loadTheme()
  }, [])

  const toggleDarkMode = async () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    try {
      await AsyncStorage.setItem(THEME_KEY, JSON.stringify(newMode))
    } catch (e) {
      console.error("Failed to save theme.", e)
    }
  }

  const colors = isDarkMode ? darkColors : lightColors

  if (!isThemeLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bgMain }}>
        <ActivityIndicator size="large" color={colors.accentPrimary} />
      </View>
    )
  }

  return <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, colors }}>{children}</ThemeContext.Provider>
}

// --- Backup & Restore Modal Component ---
const BackupRestoreModal = ({ isVisible, onClose, notes, onImportComplete }) => {
  const { colors } = useTheme()
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  // Constants for backup directory and file management
  const BACKUP_METADATA_KEY = "@AminaAura:backup_metadata"

  // Replace the BACKUP_DIRECTORY constant with:
  const getDownloadsDirectory = async () => {
    if (Platform.OS === "android") {
      // Android Downloads folder
      return FileSystem.documentDirectory + "../Download/"
    } else {
      // iOS - use Documents directory (Downloads not directly accessible)
      return FileSystem.documentDirectory + "Downloads/"
    }
  }

  // Replace the ensureBackupDirectoryExists function with:
  const ensureDownloadsDirectoryExists = async () => {
    try {
      const downloadsDir = await getDownloadsDirectory()
      console.log("Checking downloads directory:", downloadsDir)

      const dirInfo = await FileSystem.getInfoAsync(downloadsDir)
      if (!dirInfo.exists) {
        console.log("Creating downloads directory:", downloadsDir)
        await FileSystem.makeDirectoryAsync(downloadsDir, { intermediates: true })
        console.log("Downloads directory created successfully")
      } else {
        console.log("Downloads directory already exists:", downloadsDir)
      }
      return downloadsDir
    } catch (error) {
      console.error("Error with downloads directory:", error)
      // Fallback to documents directory
      const fallbackDir = FileSystem.documentDirectory + "AminaNotesBackups/"
      const dirInfo = await FileSystem.getInfoAsync(fallbackDir)
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(fallbackDir, { intermediates: true })
      }
      return fallbackDir
    }
  }

  // Replace the saveBackupMetadata function to use the new directory:
  const saveBackupMetadata = async (filename, noteCount, backupPath) => {
    try {
      const metadata = {
        lastBackup: new Date().toISOString(),
        filename,
        noteCount,
        backupPath,
      }
      await AsyncStorage.setItem(BACKUP_METADATA_KEY, JSON.stringify(metadata))
      console.log("Backup metadata saved:", metadata)
    } catch (error) {
      console.error("Error saving backup metadata:", error)
      // Non-critical error, don't throw
    }
  }

  const handleExportNotes = async () => {
    if (isExporting || isImporting) return

    try {
      setIsExporting(true)
      console.log("Starting export process...")

      // Validate notes data
      if (!notes || !Array.isArray(notes)) {
        throw new Error("Invalid notes data - expected an array")
      }

      if (notes.length === 0) {
        Alert.alert("No Notes to Export", "You don't have any notes to export yet.")
        return
      }

      // In the handleExportNotes function, replace the directory setup section with:
      // Ensure downloads directory exists
      const backupDirectory = await ensureDownloadsDirectoryExists()

      // Create filename with current date
      const currentDate = new Date().toISOString().split("T")[0] // YYYY-MM-DD format
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[1].split(".")[0] // HH-MM-SS
      const filename = `amina_notes_backup_${currentDate}_${timestamp}.json`
      const fileUri = backupDirectory + filename

      // Prepare export data
      const exportData = {
        noteCount: notes.length,
        version: 1,
        notes: notes.map((note) => ({
          id: note.id,
          title: note.title,
          content: note.content,
          date: note.date,
          isLocked: note.isPrivate,
          type: note.type,
          themeIndex: note.themeIndex,
          images: note.images,
          isFavorite: note.isFavorite,
        })),
      }

      console.log("Export data prepared:", {
        noteCount: exportData.noteCount,
        version: exportData.version,
      })

      // Write file to local storage with proper formatting
      const jsonString = JSON.stringify(exportData, null, 2)
      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      })

      // Verify file was written successfully
      const fileInfo = await FileSystem.getInfoAsync(fileUri)
      if (!fileInfo.exists) {
        throw new Error("File was not created successfully")
      }

      console.log("File written successfully:", {
        path: fileUri,
        size: fileInfo.size,
        exists: fileInfo.exists,
      })

      // After successful file write, update the saveBackupMetadata call:
      await saveBackupMetadata(filename, exportData.noteCount, fileUri)

      // Show success message with sharing option
      // Update the success alert message:
      Alert.alert(
        "Export Successful! ✅",
        `Successfully saved ${exportData.noteCount} notes to Downloads folder.\n\nFile: ${filename}\n\n📁 Location: Downloads folder on your device\n\nYou can find this file in your device's Downloads folder or file manager.`,
        [
          {
            text: "Open Downloads",
            onPress: async () => {
              try {
                // Try to open the file location
                if (Platform.OS === "android") {
                  // On Android, try to open Downloads folder
                  await Sharing.shareAsync(fileUri, {
                    mimeType: "application/json",
                    dialogTitle: "Backup saved in Downloads",
                    UTI: "public.json",
                  })
                } else {
                  // On iOS, share the file
                  await Sharing.shareAsync(fileUri, {
                    mimeType: "application/json",
                    dialogTitle: "Share Notes Backup",
                    UTI: "public.json",
                  })
                }
              } catch (error) {
                console.error("Error opening downloads:", error)
                Alert.alert(
                  "File Saved",
                  "Your backup is saved in the Downloads folder. You can access it through your device's file manager.",
                )
              }
            },
          },
          {
            text: "Share File",
            onPress: async () => {
              try {
                console.log("User chose to share backup file")
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(fileUri, {
                    mimeType: "application/json",
                    dialogTitle: "Share Notes Backup",
                    UTI: "public.json",
                  })
                  console.log("File shared successfully")
                } else {
                  Alert.alert(
                    "Sharing Not Available",
                    "File sharing is not available on this device, but your backup is saved in Downloads folder.",
                  )
                }
              } catch (shareError) {
                console.error("Share error:", shareError)
                Alert.alert(
                  "Share Failed",
                  "Could not share the file, but your backup is safely saved in Downloads folder.",
                )
              }
            },
          },
          {
            text: "Done",
            style: "cancel",
          },
        ],
      )
    } catch (error) {
      console.error("Export error:", error)

      // Provide specific error messages based on error type
      let errorMessage = "There was an error exporting your notes. Please try again."

      if (error.message.includes("directory")) {
        errorMessage = "Failed to create backup directory. Please check device storage permissions."
      } else if (error.message.includes("write") || error.message.includes("created")) {
        errorMessage = "Failed to write backup file. Please check available storage space."
      } else if (error.message.includes("Invalid notes")) {
        errorMessage = "Invalid notes data. Please restart the app and try again."
      }

      Alert.alert("Export Failed ❌", errorMessage)
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportNotes = async () => {
    if (isExporting || isImporting) return

    try {
      setIsImporting(true)
      console.log("Starting import process...")

      // Pick document from local storage
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/json", "*/*"],
        copyToCacheDirectory: true,
        multiple: false,
      })

      console.log("DocumentPicker result:", result)

      // Handle different DocumentPicker API versions
      const pickedFile = result.assets ? result.assets[0] : result

      if (result.canceled || !pickedFile || !pickedFile.uri) {
        console.log("User canceled file selection or no file selected")
        return
      }

      console.log("Selected file:", {
        uri: pickedFile.uri,
        name: pickedFile.name,
        size: pickedFile.size,
        mimeType: pickedFile.mimeType,
      })

      // Verify file exists and is accessible
      const fileInfo = await FileSystem.getInfoAsync(pickedFile.uri)
      if (!fileInfo.exists) {
        throw new Error("Selected file does not exist or is not accessible")
      }

      console.log("File info:", fileInfo)

      // Read file content
      console.log("Reading file content...")
      const fileContent = await FileSystem.readAsStringAsync(pickedFile.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      })

      if (!fileContent || fileContent.trim().length === 0) {
        throw new Error("File is empty or could not be read")
      }

      console.log("File content length:", fileContent.length)

      // Parse JSON content
      let importedData
      try {
        importedData = JSON.parse(fileContent)
        console.log("JSON parsed successfully:", {
          hasNotes: !!importedData.notes,
          noteCount: importedData.notes?.length || 0,
          version: importedData.version,
        })
      } catch (parseError) {
        console.error("JSON parse error:", parseError)
        throw new Error("Invalid JSON format. Please select a valid backup file.")
      }

      // Validate imported data structure
      let notesToImport = []

      // Handle different backup formats
      if (importedData.notes && Array.isArray(importedData.notes)) {
        // New format with metadata
        notesToImport = importedData.notes
      } else if (Array.isArray(importedData)) {
        // Legacy format - direct array of notes
        notesToImport = importedData
      } else {
        throw new Error("Invalid backup file format. Expected notes array.")
      }

      if (notesToImport.length === 0) {
        throw new Error("No notes found in the backup file.")
      }

      console.log("Notes to import:", notesToImport.length)

      // Validate and process each note
      const processedNotes = notesToImport
        .filter((note) => {
          // Basic validation - note must be an object with some content
          return note && typeof note === "object" && (note.id || note.title || note.content)
        })
        .map((note, index) => {
          // Ensure required fields exist
          const processedNote = {
            id: note.id || `imported_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
            title: note.title || "",
            content: note.content || "",
            date: note.date || new Date().toISOString(),
            isPrivate: note.isLocked || note.isPrivate || false,
            type: note.type || "text",
            themeIndex: Math.floor(Math.random() * 10), // Random theme for imported notes
            images: [], // No images in backup
            isFavorite: note.isFavorite || false,
          }

          console.log(`Processed note ${index + 1}:`, {
            id: processedNote.id,
            title: processedNote.title.substring(0, 50) + "...",
            hasContent: !!processedNote.content,
            isPrivate: processedNote.isPrivate,
          })

          return processedNote
        })

      if (processedNotes.length === 0) {
        throw new Error("No valid notes found in the backup file.")
      }

      console.log("Successfully processed notes:", processedNotes.length)

      // Confirm import with user
      Alert.alert(
        "Import Notes",
        `Found ${processedNotes.length} notes in the backup file.\n\nThis will add these notes to your existing collection. Continue?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Import",
            onPress: async () => {
              try {
                console.log("User confirmed import, calling onImportComplete...")
                await onImportComplete(processedNotes)

                Alert.alert(
                  "Import Successful! ✅",
                  `Successfully imported ${processedNotes.length} notes from local storage.\n\nYour notes have been added to your collection.`,
                  [{ text: "Done" }],
                )

                console.log("Import completed successfully")
              } catch (importError) {
                console.error("Error during import completion:", importError)
                Alert.alert(
                  "Import Failed ❌",
                  "There was an error adding the imported notes to your collection. Please try again.",
                )
              }
            },
          },
        ],
      )
    } catch (error) {
      console.error("Import error:", error)

      // Provide specific error messages based on error type
      let errorMessage = "There was an error importing your notes. Please try again."

      if (error.message.includes("canceled") || error.message.includes("not accessible")) {
        errorMessage = "Could not access the selected file. Please try selecting the file again."
      } else if (error.message.includes("JSON") || error.message.includes("format")) {
        errorMessage = "Invalid file format. Please select a valid notes backup JSON file."
      } else if (error.message.includes("empty")) {
        errorMessage = "The selected file is empty or corrupted."
      } else if (error.message.includes("No notes found") || error.message.includes("No valid notes")) {
        errorMessage = "No valid notes found in the selected backup file."
      }

      Alert.alert("Import Failed ❌", errorMessage)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={getStyles(colors).modalOverlay}>
        <View style={getStyles(colors).backupModalContainer}>
          <View style={getStyles(colors).backupModalHeader}>
            <Feather name="cloud" size={24} color={colors.accentPrimary} />
            <Text style={[getStyles(colors).backupModalTitle, { color: colors.textPrimary }]}>Local Backup</Text>
            <TouchableOpacity onPress={onClose} style={getStyles(colors).backupModalCloseButton}>
              <Feather name="x" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={getStyles(colors).backupModalContent}>
            <TouchableOpacity
              style={[
                getStyles(colors).backupButton,
                { backgroundColor: colors.accentPrimary },
                (isExporting || isImporting) && { opacity: 0.6 },
              ]}
              onPress={handleExportNotes}
              disabled={isExporting || isImporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Feather name="download" size={20} color="white" />
              )}
              <Text style={getStyles(colors).backupButtonText}>
                {isExporting ? "Saving to Device..." : "Export Notes"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                getStyles(colors).backupButton,
                { backgroundColor: colors.accentSecondary },
                (isExporting || isImporting) && { opacity: 0.6 },
              ]}
              onPress={handleImportNotes}
              disabled={isExporting || isImporting}
            >
              {isImporting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Feather name="upload" size={20} color="white" />
              )}
              <Text style={getStyles(colors).backupButtonText}>
                {isImporting ? "Loading from Device..." : "Import Notes"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Update the backupModalNoticeText: */}
          <View style={getStyles(colors).backupModalNotice}>
            <Feather name="info" size={16} color={colors.textSecondary} />
            <Text style={[getStyles(colors).backupModalNoticeText, { color: colors.textSecondary }]}>
              Files are saved to your device's Downloads folder for easy access. Only text notes are backed up - photos
              are excluded. Locked notes remain locked after import.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// --- Permission Modal Component ---
const PermissionModal = ({ isVisible, onClose, onGrant, onDeny }) => {
  const { colors } = useTheme()

  return (
    <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={getStyles(colors).modalOverlay}>
        <View style={getStyles(colors).alertContainer}>
          <View style={getStyles(colors).permissionIconContainer}>
            <LinearGradient
              colors={[colors.accentSecondary, colors.accentPrimary]}
              style={getStyles(colors).permissionIconGradient}
            >
              <Feather name="image" size={32} color="white" />
            </LinearGradient>
          </View>

          <Text style={[getStyles(colors).alertTitle, { color: colors.textPrimary }]}>Photo Library Access</Text>

          <Text style={[getStyles(colors).alertMessage, { color: colors.textSecondary }]}>
            Amina's Note would like to access your photo library to add images to your notes. This will help you create
            richer, more visual notes.
          </Text>

          <View style={getStyles(colors).permissionFeaturesList}>
            <View style={getStyles(colors).permissionFeature}>
              <Feather name="check" size={16} color={colors.success} />
              <Text style={[getStyles(colors).permissionFeatureText, { color: colors.textSecondary }]}>
                Add photos to your notes
              </Text>
            </View>
            <View style={getStyles(colors).permissionFeature}>
              <Feather name="check" size={16} color={colors.success} />
              <Text style={[getStyles(colors).permissionFeatureText, { color: colors.textSecondary }]}>
                View images in full screen
              </Text>
            </View>
            <View style={getStyles(colors).permissionFeature}>
              <Feather name="check" size={16} color={colors.success} />
              <Text style={[getStyles(colors).permissionFeatureText, { color: colors.textSecondary }]}>
                Your photos stay private
              </Text>
            </View>
          </View>

          <View style={getStyles(colors).alertButtonContainer}>
            <TouchableOpacity
              style={[
                getStyles(colors).alertButton,
                getStyles(colors).alertButtonCancel,
                { backgroundColor: colors.borderColor },
              ]}
              onPress={onDeny}
            >
              <Text style={[getStyles(colors).alertButtonText, { color: colors.textPrimary }]}>Not Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[getStyles(colors).alertButton, getStyles(colors).permissionAllowButton]}
              onPress={onGrant}
            >
              <Text style={[getStyles(colors).alertButtonText, getStyles(colors).permissionAllowButtonText]}>
                Allow Access
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// --- Enhanced Image Component ---
const EnhancedImage = ({ uri, style, onPress, showZoomIndicator = false, resizeMode = "cover" }) => {
  const { colors } = useTheme()
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (uri) {
      Image.getSize(
        uri,
        (width, height) => {
          setImageDimensions({ width, height })
          setImageLoading(false)
        },
        (error) => {
          console.error("Error getting image size:", error)
          setImageError(true)
          setImageLoading(false)
        },
      )
    }
  }, [uri])

  if (imageError) {
    return (
      <View style={[style, getStyles(colors).imageErrorContainer]}>
        <Feather name="image" size={24} color={colors.textSecondary} />
        <Text style={[getStyles(colors).imageErrorText, { color: colors.textSecondary }]}>Image unavailable</Text>
      </View>
    )
  }

  return (
    <TouchableOpacity onPress={onPress} style={[style, getStyles(colors).enhancedImageContainer]} disabled={!onPress}>
      {imageLoading && (
        <View style={[style, getStyles(colors).imageLoadingContainer]}>
          <ActivityIndicator size="small" color={colors.accentPrimary} />
        </View>
      )}

      <Image
        source={{ uri }}
        style={[style, { opacity: imageLoading ? 0 : 1 }]}
        resizeMode={resizeMode}
        onLoad={() => setImageLoading(false)}
        onError={() => {
          setImageError(true)
          setImageLoading(false)
        }}
      />

      {showZoomIndicator && !imageLoading && !imageError && (
        <View style={getStyles(colors).zoomIndicator}>
          <LinearGradient
            colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0.8)"]}
            style={getStyles(colors).zoomIndicatorGradient}
          >
            <Feather name="maximize-2" size={16} color="white" />
          </LinearGradient>
        </View>
      )}
    </TouchableOpacity>
  )
}

// --- Enhanced Image Gallery Component ---
const ImageGallery = ({ images = [], isEditing = false, onRemoveImage, onImagePress, colors }) => {
  if (!images || images.length === 0) return null

  const cardWidth = screenWidth * 0.4 // 40% of screen width for note cards
  const maxImageHeight = 120
  const imageSpacing = 8

  // Calculate optimal image size based on container
  const getImageSize = (containerWidth, maxHeight) => {
    const availableWidth = containerWidth - imageSpacing * 2
    return {
      width: availableWidth,
      height: Math.min(maxHeight, availableWidth * 0.75), // 4:3 aspect ratio max
    }
  }

  const imageSize = getImageSize(cardWidth, maxImageHeight)
  const maxDisplayImages = isEditing ? 6 : 3
  const displayImages = images.slice(0, maxDisplayImages)
  const remainingCount = images.length - maxDisplayImages

  return (
    <View style={getStyles(colors).imageGallery}>
      {displayImages.map((imageUri, index) => (
        <View key={index} style={[getStyles(colors).imageContainer, imageSize]}>
          <EnhancedImage
            uri={imageUri}
            style={[getStyles(colors).noteImage, imageSize]}
            onPress={() => onImagePress && onImagePress(index)}
            showZoomIndicator={!isEditing}
            resizeMode="cover"
          />
          {isEditing && (
            <TouchableOpacity style={getStyles(colors).removeImageButton} onPress={() => onRemoveImage(index)}>
              <LinearGradient
                colors={["rgba(255,0,0,0.8)", "rgba(200,0,0,0.9)"]}
                style={getStyles(colors).removeImageButtonGradient}
              >
                <Feather name="x" size={12} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      ))}

      {remainingCount > 0 && (
        <TouchableOpacity
          style={[getStyles(colors).imageContainer, getStyles(colors).moreImagesContainer, imageSize]}
          onPress={() => onImagePress && onImagePress(maxDisplayImages - 1)}
        >
          <LinearGradient
            colors={[colors.borderColor, colors.accentPrimary + "20"]}
            style={[getStyles(colors).moreImagesGradient, imageSize]}
          >
            <Feather name="plus" size={20} color={colors.textPrimary} />
            <Text style={[getStyles(colors).moreImagesText, { color: colors.textPrimary }]}>+{remainingCount}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  )
}

// --- Enhanced Image Viewer Modal ---
const ImageViewerModal = ({ isVisible, images = [], initialIndex = 0, onClose }) => {
  const { colors } = useTheme()
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [imageLoading, setImageLoading] = useState(true)
  const scrollViewRef = useRef(null)

  useEffect(() => {
    setCurrentIndex(initialIndex)
    setImageLoading(true)
  }, [initialIndex, isVisible])

  useEffect(() => {
    if (scrollViewRef.current && isVisible) {
      scrollViewRef.current.scrollTo({
        x: currentIndex * screenWidth,
        animated: false,
      })
    }
  }, [currentIndex, isVisible])

  if (!images || images.length === 0) return null

  const handleScroll = (event) => {
    const contentOffset = event.nativeEvent.contentOffset
    const index = Math.round(contentOffset.x / screenWidth)
    if (index !== currentIndex && index >= 0 && index < images.length) {
      setCurrentIndex(index)
    }
  }

  return (
    <Modal visible={isVisible} animationType="fade" onRequestClose={onClose}>
      <View style={[getStyles(colors).imageViewerContainer, { backgroundColor: "rgba(0,0,0,0.95)" }]}>
        <SafeAreaView style={{ flex: 1 }}>
          {/* Header */}
          <View style={getStyles(colors).imageViewerHeader}>
            <TouchableOpacity onPress={onClose} style={getStyles(colors).imageViewerButton}>
              <LinearGradient
                colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.1)"]}
                style={getStyles(colors).imageViewerButtonGradient}
              >
                <Feather name="x" size={24} color="white" />
              </LinearGradient>
            </TouchableOpacity>

            <View style={getStyles(colors).imageViewerInfo}>
              <Text style={getStyles(colors).imageViewerCounter}>
                {currentIndex + 1} of {images.length}
              </Text>
            </View>

            <View style={{ width: 44 }} />
          </View>

          {/* Image Container */}
          <View style={{ flex: 1 }}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {images.map((imageUri, index) => (
                <View key={index} style={getStyles(colors).fullScreenImageContainer}>
                  <EnhancedImage uri={imageUri} style={getStyles(colors).fullScreenImage} resizeMode="contain" />
                </View>
              ))}
            </ScrollView>

            {/* Page Indicators */}
            {images.length > 1 && (
              <View style={getStyles(colors).pageIndicatorContainer}>
                {images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      getStyles(colors).pageIndicator,
                      {
                        backgroundColor: index === currentIndex ? "white" : "rgba(255,255,255,0.4)",
                      },
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  )
}

// --- Helper: Checklist Item ---
const ChecklistItem = React.memo(({ item, onToggle, isEditing, onTextChange, onAddItem, onDeleteItem, colors }) => (
  <View style={getStyles(colors).checklistItem}>
    <TouchableOpacity onPress={onToggle} style={[getStyles(colors).checkbox, { borderColor: colors.textSecondary }]}>
      {item.isChecked && <Feather name="check" size={14} color={colors.textSecondary} />}
    </TouchableOpacity>
    <TextInput
      value={item.text}
      onChangeText={onTextChange}
      placeholder="List item"
      placeholderTextColor={colors.textSecondary}
      style={[
        getStyles(colors).checklistItemText,
        { color: colors.textPrimary },
        item.isChecked && !isEditing && getStyles(colors).checklistItemTextChecked,
      ]}
      editable={isEditing}
      onSubmitEditing={onAddItem}
    />
    {isEditing && (
      <TouchableOpacity onPress={onDeleteItem} style={getStyles(colors).deleteItemButton}>
        <Feather name="x" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    )}
  </View>
))

// --- Note Viewer Modal ---
const NoteViewerModal = ({
  isVisible,
  note,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
  onTogglePrivate,
  onToggleItem,
}) => {
  const { colors, isDarkMode } = useTheme()
  const [imageViewerVisible, setImageViewerVisible] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  if (!note) return null

  const currentGradientTheme = ALL_GRADIENT_THEMES[isDarkMode ? "dark" : "light"][note.themeIndex || 0]

  const handleImagePress = (index) => {
    setSelectedImageIndex(index)
    setImageViewerVisible(true)
  }

  return (
    <>
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
                  <Feather
                    name="star"
                    size={22}
                    color={note.isFavorite ? colors.accentPrimaryDarker : colors.textPrimary}
                    style={{ opacity: note.isFavorite ? 1 : 0.5 }}
                  />
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
              <Text style={[getStyles(colors).viewerTitle, { color: colors.textPrimary }]}>{note.title || "Note"}</Text>
              <Text style={[getStyles(colors).viewerDate, { color: colors.textSecondary }]}>
                Last updated:{" "}
                {new Date(note.date).toLocaleString([], {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>

              {note.images && note.images.length > 0 && (
                <View style={getStyles(colors).viewerImagesContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {note.images.map((imageUri, index) => (
                      <View key={index} style={getStyles(colors).viewerImageContainer}>
                        <EnhancedImage
                          uri={imageUri}
                          style={getStyles(colors).viewerImage}
                          onPress={() => handleImagePress(index)}
                          showZoomIndicator={true}
                          resizeMode="cover"
                        />
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {note.type === "checklist" ? (
                (note.content || []).map((item) => (
                  <ChecklistItem
                    key={item.id}
                    item={item}
                    isEditing={false}
                    onToggle={() => onToggleItem(note.id, item.id)}
                    colors={colors}
                  />
                ))
              ) : (
                <Text style={[getStyles(colors).viewerContent, { color: colors.textPrimary }]}>{note.content}</Text>
              )}
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </Modal>

      <ImageViewerModal
        isVisible={imageViewerVisible}
        images={note.images || []}
        initialIndex={selectedImageIndex}
        onClose={() => setImageViewerVisible(false)}
      />
    </>
  )
}

// --- Note Editor Modal ---
const NoteEditorModal = ({ isVisible, onClose, onSave, editingData }) => {
  const { colors, isDarkMode } = useTheme()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [checklistItems, setChecklistItems] = useState([])
  const [currentNoteType, setCurrentNoteType] = useState("text")
  const [isPrivate, setIsPrivate] = useState(false)
  const [themeIndex, setThemeIndex] = useState(0)
  const [images, setImages] = useState([])
  const [isPickingImage, setIsPickingImage] = useState(false)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [hasAskedPermission, setHasAskedPermission] = useState(false)

  const editingNote = editingData?.note
  const PERMISSION_KEY = "@AminaAura:photo_permission_asked"

  useEffect(() => {
    const checkPermissionStatus = async () => {
      try {
        const hasAsked = await AsyncStorage.getItem(PERMISSION_KEY)
        setHasAskedPermission(hasAsked === "true")
      } catch (error) {
        console.error("Error checking permission status:", error)
      }
    }
    checkPermissionStatus()
  }, [])

  useEffect(() => {
    if (isVisible) {
      const initialType = editingNote?.type || "text"
      setCurrentNoteType(initialType)
      setTitle(editingNote?.title || "")
      setIsPrivate(editingNote?.isPrivate || false)
      setImages(editingNote?.images || [])

      const maxThemeIndex = ALL_GRADIENT_THEMES[isDarkMode ? "dark" : "light"].length - 1
      setThemeIndex(
        editingNote?.themeIndex != null
          ? Math.min(editingNote.themeIndex, maxThemeIndex)
          : Math.floor(Math.random() * (maxThemeIndex + 1)),
      )

      if (initialType === "checklist") {
        setContent("")
        setChecklistItems(
          editingNote && Array.isArray(editingNote.content)
            ? editingNote.content
            : [{ id: Date.now(), text: "", isChecked: false }],
        )
      } else {
        setContent(editingNote?.content || "")
        setChecklistItems([])
      }
    }
  }, [editingData, isVisible, isDarkMode])

  const handlePermissionGrant = async () => {
    setShowPermissionModal(false)
    try {
      await AsyncStorage.setItem(PERMISSION_KEY, "true")
      setHasAskedPermission(true)
      pickImageWithPermission()
    } catch (error) {
      console.error("Error saving permission status:", error)
    }
  }

  const handlePermissionDeny = async () => {
    setShowPermissionModal(false)
    try {
      await AsyncStorage.setItem(PERMISSION_KEY, "true")
      setHasAskedPermission(true)
    } catch (error) {
      console.error("Error saving permission status:", error)
    }
  }

  const pickImageWithPermission = async () => {
    if (isPickingImage) return

    try {
      setIsPickingImage(true)

      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library in Settings to add images to your notes.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => ImagePicker.requestMediaLibraryPermissionsAsync() },
          ],
        )
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Disable cropping to preserve original aspect ratio
        quality: 0.8,
        allowsMultipleSelection: false,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImageUri = result.assets[0].uri
        setImages((prev) => [...prev, newImageUri])
      }
    } catch (error) {
      console.error("Error picking image:", error)
      Alert.alert("Error", "Failed to pick image. Please try again.")
    } finally {
      setIsPickingImage(false)
    }
  }

  const pickImage = async () => {
    if (!hasAskedPermission) {
      setShowPermissionModal(true)
    } else {
      pickImageWithPermission()
    }
  }

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleImagePress = (index) => {
    // In editing mode, we could show a preview or options
    console.log("Image pressed in editor:", index)
  }

  const handleSave = () => {
    const finalContent =
      currentNoteType === "checklist" ? checklistItems.filter((item) => item.text.trim() !== "") : content
    onSave(title, finalContent, currentNoteType, isPrivate, themeIndex, images)
    onClose()
  }

  const canSave =
    title.trim().length > 0 ||
    (currentNoteType === "text" ? content.trim().length > 0 : checklistItems.some((item) => item.text.trim() !== ""))

  const handleChecklistTextChange = (id, text) =>
    setChecklistItems((items) => items.map((item) => (item.id === id ? { ...item, text } : item)))
  const handleAddChecklistItem = () =>
    setChecklistItems((items) => [...items, { id: Date.now(), text: "", isChecked: false }])
  const handleDeleteChecklistItem = (id) => setChecklistItems((items) => items.filter((item) => item.id !== id))
  const toggleNoteType = () => setCurrentNoteType((prev) => (prev === "text" ? "checklist" : "text"))

  const activeTheme = ALL_GRADIENT_THEMES[isDarkMode ? "dark" : "light"][themeIndex]

  return (
    <>
      <Modal visible={isVisible} animationType="slide" onRequestClose={onClose}>
        <LinearGradient colors={activeTheme} style={{ flex: 1 }}>
          <SafeAreaView style={getStyles(colors).editorSafeArea}>
            <View style={getStyles(colors).editorHeader}>
              <TouchableOpacity onPress={onClose} style={getStyles(colors).viewerButton}>
                <Text style={[getStyles(colors).editorHeaderText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[getStyles(colors).editorTitle, { color: colors.textPrimary }]}>
                {editingNote ? "Edit Note" : "Create Note"}
              </Text>
              <TouchableOpacity onPress={handleSave} disabled={!canSave} style={getStyles(colors).viewerButton}>
                <Text
                  style={[
                    getStyles(colors).editorHeaderText,
                    getStyles(colors).editorSaveButton,
                    !canSave && getStyles(colors).editorSaveButtonDisabled,
                    { color: colors.accentPrimaryDarker },
                  ]}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={getStyles(colors).editorContentContainer}>
              <TextInput
                placeholder="Title"
                value={title}
                onChangeText={setTitle}
                style={[getStyles(colors).editorTitleInput, { color: colors.textPrimary }]}
                placeholderTextColor={colors.textSecondary}
                multiline={true}
              />

              {images.length > 0 && (
                <ImageGallery
                  images={images}
                  isEditing={true}
                  onRemoveImage={removeImage}
                  onImagePress={handleImagePress}
                  colors={colors}
                />
              )}

              {currentNoteType === "checklist" ? (
                <View>
                  {checklistItems.map((item, index) => (
                    <ChecklistItem
                      key={item.id}
                      item={item}
                      isEditing={true}
                      onTextChange={(text) => handleChecklistTextChange(item.id, text)}
                      onAddItem={index === checklistItems.length - 1 ? handleAddChecklistItem : () => {}}
                      onDeleteItem={() => handleDeleteChecklistItem(item.id)}
                      colors={colors}
                    />
                  ))}
                  <TouchableOpacity onPress={handleAddChecklistItem} style={getStyles(colors).addChecklistItem}>
                    <Feather name="plus" size={16} color={colors.textSecondary} />
                    <Text style={[getStyles(colors).addChecklistItemText, { color: colors.textSecondary }]}>
                      Add Item
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TextInput
                  placeholder="Your thoughts here..."
                  value={content}
                  onChangeText={setContent}
                  multiline
                  style={[getStyles(colors).editorContentInput, { color: colors.textPrimary }]}
                  placeholderTextColor={colors.textSecondary}
                />
              )}
            </ScrollView>

            <View style={getStyles(colors).editorToolbar}>
              <View style={getStyles(colors).toolbarLeftActions}>
                <TouchableOpacity onPress={toggleNoteType} style={getStyles(colors).toolbarButton}>
                  <Feather
                    name={currentNoteType === "checklist" ? "type" : "check-square"}
                    size={22}
                    color={colors.textPrimary}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsPrivate(!isPrivate)} style={getStyles(colors).toolbarButton}>
                  <Feather
                    name={isPrivate ? "lock" : "unlock"}
                    size={22}
                    color={isPrivate ? colors.accentPrimaryDarker : colors.textPrimary}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={pickImage} disabled={isPickingImage} style={getStyles(colors).toolbarButton}>
                  {isPickingImage ? (
                    <ActivityIndicator size="small" color={colors.textPrimary} />
                  ) : (
                    <Feather name="image" size={22} color={colors.textPrimary} />
                  )}
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={getStyles(colors).themeSelector}
              >
                {ALL_GRADIENT_THEMES[isDarkMode ? "dark" : "light"].map((theme, index) => (
                  <TouchableOpacity key={index} onPress={() => setThemeIndex(index)}>
                    <LinearGradient
                      colors={theme}
                      style={[getStyles(colors).themeDot, themeIndex === index && getStyles(colors).themeDotActive]}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </Modal>

      <PermissionModal
        isVisible={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onGrant={handlePermissionGrant}
        onDeny={handlePermissionDeny}
      />
    </>
  )
}

// --- Custom Themed Modals ---
const PinModal = ({ isVisible, onClose, onSubmit, isSettingPin }) => {
  const { colors } = useTheme()
  const [pin, setPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [error, setError] = useState("")
  const title = isSettingPin ? "Set Your 4-Digit PIN" : "Enter PIN"

  const handleSubmit = () => {
    setError("")
    if (isSettingPin) {
      if (pin.length !== 4) {
        setError("Your PIN must be exactly 4 digits.")
        return
      }
      if (pin !== confirmPin) {
        setError("The PINs you entered do not match.")
        return
      }
    }
    onSubmit(pin)
    handleClose()
  }

  const handleClose = () => {
    setPin("")
    setConfirmPin("")
    setError("")
    onClose()
  }

  return (
    <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={handleClose}>
      <View style={getStyles(colors).modalOverlay}>
        <View style={getStyles(colors).alertContainer}>
          <Feather name="key" size={24} color={colors.accentSecondary} style={{ marginBottom: 10 }} />
          <Text style={getStyles(colors).alertTitle}>{title}</Text>
          <Text style={getStyles(colors).alertMessage}>
            {isSettingPin ? "This PIN will protect your locked notes." : "Please enter your PIN to continue."}
          </Text>
          <TextInput
            style={[getStyles(colors).pinInput, { backgroundColor: colors.borderColor, color: colors.textPrimary }]}
            placeholder="----"
            placeholderTextColor={colors.textSecondary + "80"}
            secureTextEntry
            value={pin}
            onChangeText={setPin}
            keyboardType="numeric"
            maxLength={4}
            textAlign="center"
            letterSpacing={20}
          />
          {isSettingPin && (
            <TextInput
              style={[getStyles(colors).pinInput, { backgroundColor: colors.borderColor, color: colors.textPrimary }]}
              placeholder="----"
              placeholderTextColor={colors.textSecondary + "80"}
              secureTextEntry
              value={confirmPin}
              onChangeText={setConfirmPin}
              keyboardType="numeric"
              maxLength={4}
              textAlign="center"
              letterSpacing={20}
            />
          )}
          {error ? <Text style={getStyles(colors).modalErrorText}>{error}</Text> : null}
          <View style={getStyles(colors).alertButtonContainer}>
            <TouchableOpacity
              style={[
                getStyles(colors).alertButton,
                getStyles(colors).alertButtonCancel,
                { backgroundColor: colors.borderColor },
              ]}
              onPress={handleClose}
            >
              <Text style={[getStyles(colors).alertButtonText, { color: colors.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[getStyles(colors).alertButton, { backgroundColor: colors.accentPrimary }]}
              onPress={handleSubmit}
            >
              <Text style={getStyles(colors).alertButtonTextWhite}>{isSettingPin ? "Set PIN" : "Unlock"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const InfoModal = ({ isVisible, onClose, title, message, iconName = "info", iconColor }) => {
  const { colors } = useTheme()
  const finalIconColor = iconColor || colors.info

  return (
    <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={getStyles(colors).modalOverlay}>
        <View style={getStyles(colors).alertContainer}>
          <Feather name={iconName} size={24} color={finalIconColor} style={{ marginBottom: 10 }} />
          <Text style={getStyles(colors).alertTitle}>{title}</Text>
          <Text style={getStyles(colors).alertMessage}>{message}</Text>
          <TouchableOpacity
            style={[getStyles(colors).singleAlertButton, { backgroundColor: colors.accentPrimary }]}
            onPress={onClose}
          >
            <Text style={getStyles(colors).alertButtonTextWhite}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const ActionSheetModal = ({ isVisible, onClose, title, options }) => {
  const { colors } = useTheme()

  return (
    <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={getStyles(colors).modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={getStyles(colors).actionSheetContainer}>
              <Text style={getStyles(colors).actionSheetTitle}>{title}</Text>
              {(options || []).map((opt, index) => (
                <TouchableOpacity
                  key={index}
                  style={getStyles(colors).actionSheetButton}
                  onPress={() => {
                    opt.onPress()
                    onClose()
                  }}
                >
                  <Feather name={opt.icon} size={20} color={opt.color || colors.textPrimary} />
                  <Text style={[getStyles(colors).actionSheetButtonText, { color: opt.color || colors.textPrimary }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[getStyles(colors).actionSheetButton, { borderTopWidth: 1, borderColor: colors.borderColor }]}
                onPress={onClose}
              >
                <Text style={[getStyles(colors).actionSheetButtonText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const CustomAlertModal = ({ isVisible, onClose, onConfirm, title, message, confirmText = "Delete", confirmColor }) => {
  const { colors } = useTheme()
  const finalConfirmColor = confirmColor || colors.danger

  return (
    <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={getStyles(colors).modalOverlay}>
        <View style={getStyles(colors).alertContainer}>
          <Feather name="alert-triangle" size={24} color={finalConfirmColor} style={{ marginBottom: 10 }} />
          <Text style={getStyles(colors).alertTitle}>{title}</Text>
          <Text style={getStyles(colors).alertMessage}>{message}</Text>
          <View style={getStyles(colors).alertButtonContainer}>
            <TouchableOpacity
              style={[
                getStyles(colors).alertButton,
                getStyles(colors).alertButtonCancel,
                { backgroundColor: colors.borderColor },
              ]}
              onPress={onClose}
            >
              <Text style={[getStyles(colors).alertButtonText, { color: colors.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[getStyles(colors).alertButton, { backgroundColor: finalConfirmColor }]}
              onPress={onConfirm}
            >
              <Text style={getStyles(colors).alertButtonTextWhite}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// --- Note Card Component ---
const NoteCard = React.memo(({ item, onOpen, onToggleFavorite, onToggleItem }) => {
  const { colors, isDarkMode } = useTheme()
  const cardBaseColor = ALL_GRADIENT_THEMES[isDarkMode ? "dark" : "light"][item.themeIndex || 0][0]
  const isTrashed = !!item.deletedAt

  const handleImagePress = (index) => {
    // When image is pressed in card, open the note viewer
    onOpen(item)
  }

  if (item.isPrivate && !isTrashed) {
    return (
      <TouchableOpacity style={getStyles(colors).noteCardContainer} onPress={() => onOpen(item)}>
        <View
          style={[
            getStyles(colors).noteCard,
            { backgroundColor: colors.bgCard, justifyContent: "space-between", minHeight: 150 },
          ]}
        >
          <View style={getStyles(colors).lockedCardContent}>
            <Feather name="lock" size={40} color={colors.textSecondary} style={{ opacity: 0.5 }} />
          </View>
          <View>
            <Text
              style={[getStyles(colors).noteTitle, { textAlign: "center", color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {item.title || "Locked Note"}
            </Text>
            <Text style={[getStyles(colors).noteDate, { textAlign: "center", color: colors.textSecondary }]}>
              {new Date(item.date).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity style={getStyles(colors).noteCardContainer} onPress={() => onOpen(item)}>
      <View style={[getStyles(colors).noteCard, { backgroundColor: cardBaseColor }]}>
        {!isTrashed && (
          <TouchableOpacity
            style={getStyles(colors).favoriteIcon}
            onPress={(e) => {
              e.stopPropagation()
              onToggleFavorite(item.id)
            }}
          >
            <Feather
              name="star"
              size={18}
              color={item.isFavorite ? colors.accentPrimaryDarker : colors.textSecondary}
              style={{ opacity: item.isFavorite ? 1 : 0.4 }}
            />
          </TouchableOpacity>
        )}

        <Text style={[getStyles(colors).noteTitle, { color: colors.textPrimary }]} numberOfLines={2}>
          {item.title || "Untitled Note"}
        </Text>

        {item.images && item.images.length > 0 && (
          <ImageGallery images={item.images} onImagePress={handleImagePress} colors={colors} />
        )}

        {item.type === "checklist" ? (
          <View>
            {(item.content || []).slice(0, 4).map((checkItem) => (
              <ChecklistItem
                key={checkItem.id}
                item={checkItem}
                isEditing={false}
                onToggle={(e) => {
                  e.stopPropagation()
                  onToggleItem(item.id, checkItem.id)
                }}
                colors={colors}
              />
            ))}
          </View>
        ) : (
          <Text style={[getStyles(colors).noteContent, { color: colors.textPrimary }]} numberOfLines={5}>
            {item.content}
          </Text>
        )}

        <Text style={[getStyles(colors).noteDate, { color: colors.textSecondary }]}>
          {isTrashed
            ? `Deleted: ${new Date(item.deletedAt).toLocaleDateString()}`
            : new Date(item.date).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
        </Text>
      </View>
    </TouchableOpacity>
  )
})

// --- Main Notepad Screen ---
function NotepadScreen() {
  const { isDarkMode, toggleDarkMode, colors } = useTheme()
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_600SemiBold,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  })

  const [notes, setNotes] = useState([])
  const [trashedNotes, setTrashedNotes] = useState([])
  const [appPin, setAppPin] = useState(null)
  const [currentView, setCurrentView] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isDataLoaded, setIsDataLoaded] = useState(false)

  const [isPinModalVisible, setPinModalVisible] = useState(false)
  const [isSettingPin, setIsSettingPin] = useState(false)
  const [noteToUnlock, setNoteToUnlock] = useState(null)
  const [isEditorVisible, setEditorVisible] = useState(false)
  const [isViewerVisible, setViewerVisible] = useState(false)
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState(null)
  const [infoModalConfig, setInfoModalConfig] = useState({ isVisible: false, title: "", message: "" })
  const [actionSheetConfig, setActionSheetConfig] = useState({ isVisible: false, title: "", options: [] })
  const [isBackupModalVisible, setBackupModalVisible] = useState(false)

  const [editingData, setEditingData] = useState(null)
  const [viewingData, setViewingData] = useState(null)

  const NOTES_STORAGE_KEY = "@AminaAura:notes_v15"
  const TRASH_STORAGE_KEY = "@AminaAura:notes_trash_v15"
  const PIN_STORAGE_KEY = "@AminaAura:pin_v15"

  useEffect(() => {
    const loadAllData = async () => {
      try {
        await Promise.all([loadNotes(), loadTrashedNotes(), loadPin()])
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setIsDataLoaded(true)
      }
    }
    loadAllData()
  }, [])

  const showInfoModal = (title, message, iconName, iconColor) =>
    setInfoModalConfig({ isVisible: true, title, message, iconName, iconColor })

  const loadNotes = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(NOTES_STORAGE_KEY)
      if (jsonValue !== null) {
        const loadedNotes = JSON.parse(jsonValue)
        setNotes(loadedNotes)
      }
    } catch (e) {
      console.error("Failed to load notes.", e)
    }
  }

  const saveNotes = async (newNotes) => {
    try {
      await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(newNotes))
      setNotes(newNotes)
    } catch (e) {
      console.error("Failed to save notes.", e)
    }
  }

  const loadTrashedNotes = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(TRASH_STORAGE_KEY)
      const loadedTrash = jsonValue !== null ? JSON.parse(jsonValue) : []
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
      const validTrash = loadedTrash.filter((note) => new Date(note.deletedAt).getTime() > thirtyDaysAgo)
      if (validTrash.length !== loadedTrash.length) {
        await saveTrashedNotes(validTrash)
      } else {
        setTrashedNotes(validTrash)
      }
    } catch (e) {
      console.error("Failed to load trashed notes.", e)
    }
  }

  const saveTrashedNotes = async (newTrash) => {
    try {
      await AsyncStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(newTrash))
      setTrashedNotes(newTrash)
    } catch (e) {
      console.error("Failed to save trashed notes.", e)
    }
  }

  const loadPin = async () => {
    try {
      const pin = await AsyncStorage.getItem(PIN_STORAGE_KEY)
      setAppPin(pin)
    } catch (e) {
      console.error("Failed to load PIN.", e)
    }
  }

  const savePin = async (pin) => {
    try {
      await AsyncStorage.setItem(PIN_STORAGE_KEY, pin)
      setAppPin(pin)
    } catch (e) {
      console.error("Failed to save PIN.", e)
    }
  }

  const handleSaveNote = (title, content, type, isPrivate, themeIndex, images = []) => {
    if (isPrivate && !appPin) {
      setIsSettingPin(true)
      setPinModalVisible(true)
      return
    }

    let newNotes
    const noteData = { title, content, type, isPrivate, themeIndex, images, date: new Date().toISOString() }

    if (editingData?.note) {
      newNotes = notes.map((note) => (note.id === editingData.note.id ? { ...note, ...noteData } : note))
    } else {
      newNotes = [{ id: Date.now().toString(), ...noteData, isFavorite: false }, ...notes]
    }

    saveNotes(newNotes)
    setEditingData(null)
  }

  const confirmDeleteNote = (id) => {
    setNoteToDelete(id)
    setViewerVisible(false)
    setDeleteModalVisible(true)
  }

  const moveToTrash = () => {
    const noteToMove = notes.find((note) => note.id === noteToDelete)
    if (noteToMove) {
      const newTrashedNote = { ...noteToMove, deletedAt: new Date().toISOString() }
      saveTrashedNotes([newTrashedNote, ...trashedNotes])
      saveNotes(notes.filter((note) => note.id !== noteToDelete))
    }
    setDeleteModalVisible(false)
    setNoteToDelete(null)
  }

  const handleRestoreNote = (noteId) => {
    const noteToRestore = trashedNotes.find((note) => note.id === noteId)
    if (noteToRestore) {
      delete noteToRestore.deletedAt
      saveNotes([noteToRestore, ...notes])
      saveTrashedNotes(trashedNotes.filter((note) => note.id !== noteId))
      showInfoModal("Note Restored", "The note has been moved back to your main list.", "rotate-ccw", colors.success)
    }
  }

  const handlePermanentDelete = (noteId) => {
    saveTrashedNotes(trashedNotes.filter((note) => note.id !== noteId))
    showInfoModal("Deleted", "The note has been permanently deleted.", "trash-2", colors.danger)
  }

  const handleToggleFavorite = (id) => {
    const newNotes = notes.map((note) => (note.id === id ? { ...note, isFavorite: !note.isFavorite } : note))
    saveNotes(newNotes)
    if (viewingData?.note.id === id) {
      setViewingData((prev) => ({ ...prev, note: { ...prev.note, isFavorite: !prev.note.isFavorite } }))
    }
  }

  const handleTogglePrivate = (id) => {
    if (!appPin) {
      setIsSettingPin(true)
      setPinModalVisible(true)
      return
    }
    const newNotes = notes.map((note) => (note.id === id ? { ...note, isPrivate: !note.isPrivate } : note))
    saveNotes(newNotes)
    if (viewingData?.note.id === id) {
      setViewingData((prev) => ({ ...prev, note: { ...prev.note, isPrivate: !prev.note.isPrivate } }))
    }
  }

  const handlePinSubmit = (pin) => {
    if (isSettingPin) {
      savePin(pin)
      showInfoModal("PIN Set!", "Your PIN has been set successfully.", "check-circle", colors.success)
    } else {
      if (pin === appPin) {
        if (noteToUnlock) {
          setViewingData({ note: noteToUnlock })
          setViewerVisible(true)
          setNoteToUnlock(null)
        }
      } else {
        showInfoModal(
          "Incorrect PIN",
          "The PIN you entered is incorrect. Please try again.",
          "alert-triangle",
          colors.danger,
        )
      }
    }
  }

  const handleOpenEditor = (note = null) => {
    setEditingData({ note })
    setViewerVisible(false)
    setEditorVisible(true)
  }

  // Modified FAB handler - directly create text note
  const handleCreateNote = () => {
    handleOpenEditor(null)
  }

  const handleOpenViewer = (note) => {
    if (currentView === "trash") {
      setActionSheetConfig({
        isVisible: true,
        title: note.title,
        options: [
          {
            label: "Restore Note",
            icon: "rotate-ccw",
            color: colors.success,
            onPress: () => handleRestoreNote(note.id),
          },
          {
            label: "Delete Permanently",
            icon: "trash-2",
            color: colors.danger,
            onPress: () => handlePermanentDelete(note.id),
          },
        ],
      })
      return
    }

    if (note.isPrivate) {
      if (!appPin) {
        showInfoModal("PIN Not Set", "A PIN is required to view this note, but none has been set for the app.")
        return
      }
      setNoteToUnlock(note)
      setIsSettingPin(false)
      setPinModalVisible(true)
    } else {
      setViewingData({ note })
      setViewerVisible(true)
    }
  }

  const handleToggleChecklistItem = (noteId, itemId) => {
    const newNotes = notes.map((note) => {
      if (note.id === noteId && note.type === "checklist") {
        const newContent = (note.content || []).map((item) =>
          item.id === itemId ? { ...item, isChecked: !item.isChecked } : item,
        )
        return { ...note, content: newContent, date: new Date().toISOString() }
      }
      return note
    })
    saveNotes(newNotes)

    if (viewingData?.note.id === noteId) {
      const updatedNote = newNotes.find((note) => note.id === noteId)
      if (updatedNote) {
        setViewingData((prev) => ({ ...prev, note: updatedNote }))
      }
    }
  }

  // Handle import completion
  const handleImportComplete = async (importedNotes) => {
    try {
      console.log("handleImportComplete called with", importedNotes.length, "notes")

      // Merge imported notes with existing notes
      const mergedNotes = [...importedNotes, ...notes]
      console.log(
        "Merging notes: imported =",
        importedNotes.length,
        "existing =",
        notes.length,
        "total =",
        mergedNotes.length,
      )

      await saveNotes(mergedNotes)
      setBackupModalVisible(false)

      console.log("Import completed successfully")
    } catch (error) {
      console.error("Error completing import:", error)
      throw error
    }
  }

  const notesToDisplay = useMemo(() => {
    const sourceNotes = currentView === "trash" ? trashedNotes : notes
    let filteredNotes = sourceNotes

    if (currentView === "favorites") {
      filteredNotes = filteredNotes.filter((n) => n.isFavorite)
    }

    if (searchQuery.trim() !== "") {
      const lowercasedQuery = searchQuery.toLowerCase()
      filteredNotes = filteredNotes.filter(
        (n) =>
          n.title.toLowerCase().includes(lowercasedQuery) ||
          (typeof n.content === "string" && n.content.toLowerCase().includes(lowercasedQuery)),
      )
    }

    return filteredNotes
  }, [notes, trashedNotes, currentView, searchQuery])

  if (!fontsLoaded || !isDataLoaded) {
    return (
      <View style={getStyles(colors).fullScreenLoader}>
        <ActivityIndicator size="large" color={colors.accentPrimary} />
        <Text style={[getStyles(colors).loadingText, { color: colors.textSecondary }]}>Loading...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={getStyles(colors).container}>
      <View style={getStyles(colors).header}>
        <TouchableOpacity onPress={() => setBackupModalVisible(true)} style={{ padding: 5 }}>
          <Feather name="cloud" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={getStyles(colors).headerTitle}>Amina's Note</Text>
        <TouchableOpacity onPress={toggleDarkMode} style={{ padding: 5 }}>
          <Feather name={isDarkMode ? "moon" : "sun"} size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={getStyles(colors).controlsContainer}>
        <View
          style={[
            getStyles(colors).searchContainer,
            { backgroundColor: colors.bgCard, borderColor: colors.borderColor },
          ]}
        >
          <Feather name="search" size={16} color={colors.textSecondary} style={getStyles(colors).searchIcon} />
          <TextInput
            placeholder="Search notes..."
            placeholderTextColor={colors.textSecondary}
            style={[getStyles(colors).searchInput, { color: colors.textPrimary }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={getStyles(colors).filterContainer}>
          <TouchableOpacity
            onPress={() => setCurrentView("all")}
            style={[
              getStyles(colors).filterButton,
              { backgroundColor: colors.bgCard, borderColor: colors.borderColor },
              currentView === "all" && getStyles(colors).filterButtonActive,
            ]}
          >
            <Text
              style={[
                getStyles(colors).filterButtonText,
                { color: colors.textSecondary },
                currentView === "all" && getStyles(colors).filterButtonTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCurrentView("favorites")}
            style={[
              getStyles(colors).filterButton,
              { backgroundColor: colors.bgCard, borderColor: colors.borderColor },
              currentView === "favorites" && getStyles(colors).filterButtonActive,
            ]}
          >
            <Text
              style={[
                getStyles(colors).filterButtonText,
                { color: colors.textSecondary },
                currentView === "favorites" && getStyles(colors).filterButtonTextActive,
              ]}
            >
              Favorites
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCurrentView("trash")}
            style={[
              getStyles(colors).filterButton,
              { backgroundColor: colors.bgCard, borderColor: colors.borderColor },
              currentView === "trash" && getStyles(colors).filterButtonActive,
            ]}
          >
            <Text
              style={[
                getStyles(colors).filterButtonText,
                { color: colors.textSecondary },
                currentView === "trash" && getStyles(colors).filterButtonTextActive,
              ]}
            >
              Trash
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {notesToDisplay.length > 0 ? (
          <ScrollView contentContainerStyle={getStyles(colors).notesGrid}>
            <View style={getStyles(colors).column}>
              {notesToDisplay
                .filter((_, i) => i % 2 === 0)
                .map((item) => (
                  <NoteCard
                    key={item.id}
                    item={item}
                    onOpen={handleOpenViewer}
                    onToggleFavorite={handleToggleFavorite}
                    onToggleItem={handleToggleChecklistItem}
                  />
                ))}
            </View>
            <View style={getStyles(colors).column}>
              {notesToDisplay
                .filter((_, i) => i % 2 !== 0)
                .map((item) => (
                  <NoteCard
                    key={item.id}
                    item={item}
                    onOpen={handleOpenViewer}
                    onToggleFavorite={handleToggleFavorite}
                    onToggleItem={handleToggleChecklistItem}
                  />
                ))}
            </View>
          </ScrollView>
        ) : (
          <View style={getStyles(colors).emptyListContainer}>
            <Feather
              name={currentView === "trash" ? "trash-2" : "file-text"}
              size={48}
              color={colors.accentSecondary}
            />
            <Text style={getStyles(colors).emptyListText}>
              {searchQuery
                ? "No notes match your search."
                : currentView === "favorites"
                  ? "You have no favorite notes."
                  : currentView === "trash"
                    ? "Trash is empty."
                    : "Create your first note!"}
            </Text>
          </View>
        )}
      </View>

      {/* Simplified FAB - Single Action */}
      {currentView !== "trash" && (
        <TouchableOpacity style={getStyles(colors).createButton} onPress={handleCreateNote}>
          <LinearGradient
            colors={[colors.accentSecondary, colors.accentPrimary]}
            style={getStyles(colors).createButtonGradient}
          >
            <Feather name="plus" size={24} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <NoteEditorModal
        isVisible={isEditorVisible}
        onClose={() => setEditorVisible(false)}
        onSave={handleSaveNote}
        editingData={editingData}
      />

      <NoteViewerModal
        isVisible={isViewerVisible}
        note={viewingData?.note}
        onClose={() => setViewerVisible(false)}
        onEdit={() => handleOpenEditor(viewingData?.note)}
        onDelete={confirmDeleteNote}
        onToggleFavorite={handleToggleFavorite}
        onTogglePrivate={handleTogglePrivate}
        onToggleItem={handleToggleChecklistItem}
      />

      <CustomAlertModal
        isVisible={isDeleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={moveToTrash}
        title="Move to Trash"
        message="This note will be moved to the trash and deleted permanently after 30 days."
        confirmText="Move"
        confirmColor={colors.accentPrimaryDarker}
      />

      <PinModal
        isVisible={isPinModalVisible}
        onClose={() => setPinModalVisible(false)}
        onSubmit={handlePinSubmit}
        isSettingPin={isSettingPin}
      />

      <InfoModal
        isVisible={infoModalConfig.isVisible}
        onClose={() => setInfoModalConfig({ isVisible: false })}
        title={infoModalConfig.title}
        message={infoModalConfig.message}
        iconName={infoModalConfig.iconName}
        iconColor={infoModalConfig.iconColor}
      />

      <ActionSheetModal
        isVisible={actionSheetConfig.isVisible}
        onClose={() => setActionSheetConfig({ isVisible: false, title: "", options: [] })}
        title={actionSheetConfig.title}
        options={actionSheetConfig.options}
      />

      <BackupRestoreModal
        isVisible={isBackupModalVisible}
        onClose={() => setBackupModalVisible(false)}
        notes={notes}
        onImportComplete={handleImportComplete}
      />
    </SafeAreaView>
  )
}

// --- Stylesheet ---
const getStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgMain,
      paddingTop: Platform.OS === "android" ? 35 : 0,
    },
    fullScreenLoader: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.bgMain,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      fontFamily: FONT_FAMILY.poppins,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 15,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderColor,
    },
    headerTitle: {
      fontFamily: FONT_FAMILY.playfair,
      fontSize: 24,
      color: colors.textPrimary,
    },
    controlsContainer: {
      paddingHorizontal: 20,
      paddingTop: 15,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 12,
      paddingHorizontal: 15,
      borderWidth: 1,
      borderColor: colors.borderColor,
    },
    searchIcon: {
      marginRight: 10,
    },
    searchInput: {
      flex: 1,
      fontFamily: FONT_FAMILY.poppins,
      fontSize: 15,
      height: 48,
    },
    filterContainer: {
      flexDirection: "row",
      justifyContent: "center",
      marginVertical: 15,
    },
    filterButton: {
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 20,
      marginHorizontal: 5,
      borderWidth: 1,
    },
    filterButtonActive: {
      backgroundColor: colors.accentPrimary,
      borderColor: colors.accentPrimary,
    },
    filterButtonText: {
      fontFamily: FONT_FAMILY.poppinsMedium,
      fontSize: 14,
    },
    filterButtonTextActive: {
      color: colors.textOnAccent,
    },
    notesGrid: {
      flexDirection: "row",
      paddingHorizontal: 10,
      paddingTop: 0,
      paddingBottom: 100,
    },
    column: {
      flex: 1,
      paddingHorizontal: 5,
    },
    noteCardContainer: {
      marginBottom: 10,
    },
    noteCard: {
      borderRadius: 18,
      padding: 15,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
      overflow: "hidden",
    },
    favoriteIcon: {
      position: "absolute",
      top: 10,
      right: 10,
      padding: 5,
      zIndex: 1,
    },
    noteTitle: {
      fontFamily: FONT_FAMILY.poppinsBold,
      fontSize: 16,
      marginBottom: 5,
      paddingRight: 25,
    },
    noteContent: {
      fontFamily: FONT_FAMILY.poppins,
      fontSize: 14,
      lineHeight: 21,
    },
    lockedCardContent: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingBottom: 20,
    },
    noteDate: {
      fontFamily: FONT_FAMILY.poppins,
      fontSize: 12,
      marginTop: 10,
      opacity: 0.9,
    },
    emptyListContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
      opacity: 0.7,
    },
    emptyListText: {
      fontFamily: FONT_FAMILY.poppins,
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 15,
      textAlign: "center",
    },
    createButton: {
      position: "absolute",
      bottom: 80,
      right: 30,
      width: 60,
      height: 60,
      borderRadius: 30,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 8,
      zIndex: 9,
    },
    createButtonGradient: {
      flex: 1,
      borderRadius: 30,
      justifyContent: "center",
      alignItems: "center",
    },
    editorSafeArea: {
      flex: 1,
      backgroundColor: "transparent",
    },
    editorHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 15,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderColor,
    },
    editorTitle: {
      fontFamily: FONT_FAMILY.poppinsBold,
      fontSize: 18,
    },
    editorHeaderText: {
      fontFamily: FONT_FAMILY.poppinsMedium,
      fontSize: 16,
      padding: 5,
    },
    editorSaveButton: {
      fontWeight: "bold",
    },
    editorSaveButtonDisabled: {
      opacity: 0.5,
    },
    editorContentContainer: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 10,
    },
    editorTitleInput: {
      fontFamily: FONT_FAMILY.playfair,
      fontSize: 28,
      paddingBottom: 15,
    },
    editorContentInput: {
      flex: 1,
      fontFamily: FONT_FAMILY.poppins,
      fontSize: 17,
      lineHeight: 26,
      textAlignVertical: "top",
    },
    editorToolbar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
      paddingLeft: 5,
      paddingRight: 15,
      borderTopWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: "transparent",
    },
    toolbarLeftActions: {
      flexDirection: "row",
    },
    toolbarButton: {
      padding: 10,
      marginHorizontal: 5,
    },
    themeSelector: {
      paddingVertical: 5,
    },
    themeDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      marginHorizontal: 5,
      borderWidth: 2,
      borderColor: "transparent",
    },
    themeDotActive: {
      borderColor: "white",
      transform: [{ scale: 1.1 }],
    },
    viewerSafeArea: {
      flex: 1,
      backgroundColor: "transparent",
    },
    viewerHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderColor,
    },
    viewerHeaderActions: {
      flexDirection: "row",
      alignItems: "center",
    },
    viewerButton: {
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    viewerContentContainer: {
      padding: 20,
      paddingBottom: 50,
    },
    viewerTitle: {
      fontFamily: FONT_FAMILY.playfair,
      fontSize: 32,
      marginBottom: 8,
    },
    viewerDate: {
      fontFamily: FONT_FAMILY.poppins,
      fontSize: 13,
      marginBottom: 20,
    },
    viewerContent: {
      fontFamily: FONT_FAMILY.poppins,
      fontSize: 17,
      lineHeight: 28,
    },
    viewerImagesContainer: {
      marginVertical: 15,
    },
    viewerImageContainer: {
      marginRight: 10,
      borderRadius: 12,
      overflow: "hidden",
    },
    viewerImage: {
      width: 120,
      height: 120,
      borderRadius: 12,
    },
    // Enhanced Image Styles
    enhancedImageContainer: {
      position: "relative",
    },
    imageLoadingContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.borderColor,
      borderRadius: 8,
    },
    imageErrorContainer: {
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.borderColor,
      borderRadius: 8,
    },
    imageErrorText: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.poppins,
      marginTop: 5,
      textAlign: "center",
    },
    zoomIndicator: {
      position: "absolute",
      top: 5,
      right: 5,
      borderRadius: 12,
      overflow: "hidden",
    },
    zoomIndicatorGradient: {
      paddingHorizontal: 6,
      paddingVertical: 4,
    },
    imageGallery: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginVertical: 10,
    },
    imageContainer: {
      marginRight: 8,
      marginBottom: 8,
      borderRadius: 8,
      overflow: "hidden",
      position: "relative",
    },
    noteImage: {
      borderRadius: 8,
    },
    removeImageButton: {
      position: "absolute",
      top: 4,
      right: 4,
      borderRadius: 12,
      overflow: "hidden",
    },
    removeImageButtonGradient: {
      width: 24,
      height: 24,
      justifyContent: "center",
      alignItems: "center",
    },
    moreImagesContainer: {
      justifyContent: "center",
      alignItems: "center",
    },
    moreImagesGradient: {
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 8,
    },
    moreImagesText: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.poppinsMedium,
      marginTop: 2,
    },
    // Image Viewer Styles
    imageViewerContainer: {
      flex: 1,
    },
    imageViewerHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    imageViewerButton: {
      borderRadius: 22,
      overflow: "hidden",
    },
    imageViewerButtonGradient: {
      width: 44,
      height: 44,
      justifyContent: "center",
      alignItems: "center",
    },
    imageViewerInfo: {
      flex: 1,
      alignItems: "center",
    },
    imageViewerCounter: {
      color: "white",
      fontSize: 16,
      fontFamily: FONT_FAMILY.poppinsMedium,
    },
    fullScreenImageContainer: {
      width: screenWidth,
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
    },
    fullScreenImage: {
      width: screenWidth,
      height: "100%",
    },
    pageIndicatorContainer: {
      position: "absolute",
      bottom: 50,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    pageIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginHorizontal: 4,
    },
    // Permission Modal Styles
    permissionIconContainer: {
      marginBottom: 15,
      borderRadius: 30,
      overflow: "hidden",
    },
    permissionIconGradient: {
      width: 60,
      height: 60,
      justifyContent: "center",
      alignItems: "center",
    },
    permissionFeaturesList: {
      alignSelf: "stretch",
      marginVertical: 15,
    },
    permissionFeature: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 5,
    },
    permissionFeatureText: {
      fontSize: 14,
      fontFamily: FONT_FAMILY.poppins,
      marginLeft: 10,
      flex: 1,
    },
    // NEW: Fixed permission button styles
    permissionAllowButton: {
      backgroundColor: colors.accentPrimary,
      borderWidth: 2,
      borderColor: colors.accentPrimaryDarker,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    permissionAllowButtonText: {
      color: colors.textOnAccent,
      fontWeight: "bold",
      textShadowColor: "rgba(0,0,0,0.3)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    // Backup Modal Styles
    backupModalContainer: {
      width: "90%",
      maxWidth: 400,
      backgroundColor: colors.bgCard,
      borderRadius: 20,
      padding: 20,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.1,
      shadowRadius: 15,
      elevation: 10,
    },
    backupModalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    backupModalTitle: {
      fontSize: 20,
      fontFamily: FONT_FAMILY.poppinsBold,
      flex: 1,
      textAlign: "center",
      marginLeft: -24, // Offset for close button
    },
    backupModalCloseButton: {
      padding: 4,
    },
    backupModalContent: {
      gap: 15,
    },
    backupButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 15,
      paddingHorizontal: 20,
      borderRadius: 12,
      gap: 10,
    },
    backupButtonText: {
      color: "white",
      fontSize: 16,
      fontFamily: FONT_FAMILY.poppinsMedium,
    },
    backupModalNotice: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginTop: 15,
      padding: 12,
      backgroundColor: colors.borderColor,
      borderRadius: 8,
      gap: 8,
    },
    backupModalNoticeText: {
      fontSize: 12,
      fontFamily: FONT_FAMILY.poppins,
      lineHeight: 16,
      flex: 1,
    },
    checklistItem: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 8,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    checklistItemText: {
      fontFamily: FONT_FAMILY.poppins,
      fontSize: 16,
      flex: 1,
    },
    checklistItemTextChecked: {
      textDecorationLine: "line-through",
    },
    addChecklistItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
      marginTop: 5,
    },
    addChecklistItemText: {
      fontFamily: FONT_FAMILY.poppins,
      fontSize: 16,
      marginLeft: 10,
    },
    deleteItemButton: {
      padding: 5,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    alertContainer: {
      width: "100%",
      maxWidth: 400,
      backgroundColor: colors.bgCard,
      borderRadius: 24,
      padding: 25,
      alignItems: "center",
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.1,
      shadowRadius: 15,
      elevation: 10,
    },
    alertTitle: {
      fontFamily: FONT_FAMILY.poppinsBold,
      fontSize: 20,
      color: colors.textPrimary,
      marginBottom: 8,
    },
    alertMessage: {
      fontFamily: FONT_FAMILY.poppins,
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 25,
      lineHeight: 22,
    },
    alertButtonContainer: {
      flexDirection: "row",
      width: "100%",
    },
    alertButton: {
      flex: 1,
      borderRadius: 16,
      overflow: "hidden",
    },
    alertButtonCancel: {
      marginRight: 10,
    },
    alertButtonText: {
      fontFamily: FONT_FAMILY.poppinsBold,
      fontSize: 16,
      padding: 14,
      textAlign: "center",
    },
    alertButtonTextWhite: {
      fontFamily: FONT_FAMILY.poppinsBold,
      fontSize: 16,
      color: colors.textOnAccent,
      textAlign: "center",
      lineHeight: 20,
      paddingVertical: 14,
    },
    singleAlertButton: {
      paddingVertical: 14,
      paddingHorizontal: 40,
      borderRadius: 16,
      alignItems: "center",
    },
    pinInput: {
      width: "80%",
      height: 60,
      borderRadius: 16,
      fontFamily: FONT_FAMILY.poppinsBold,
      fontSize: 24,
      marginBottom: 15,
    },
    modalErrorText: {
      fontFamily: FONT_FAMILY.poppins,
      fontSize: 14,
      color: colors.danger,
      marginBottom: 15,
      textAlign: "center",
    },
    actionSheetContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 10,
      paddingBottom: Platform.OS === "ios" ? 30 : 10,
    },
    actionSheetTitle: {
      fontFamily: FONT_FAMILY.poppinsBold,
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      paddingVertical: 10,
    },
    actionSheetButton: {
      flexDirection: "row",
      alignItems: "center",
      padding: 15,
    },
    actionSheetButtonText: {
      fontFamily: FONT_FAMILY.poppinsMedium,
      fontSize: 18,
      marginLeft: 15,
    },
  })

// Main App component wrapper for ThemeProvider
export default function App() {
  return (
    <ThemeProvider>
      <NotepadScreen />
    </ThemeProvider>
  )
}
