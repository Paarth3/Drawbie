// File: screens/AddItemScreen.js

import React, { useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Image,
	ScrollView,
	Alert,
	ActivityIndicator,
	Switch,
	Modal,
	Pressable,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons, Feather } from "@expo/vector-icons"; // Added Feather
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

// Import theme constants
import { COLORS, SIZES, FONTS } from "../constants/theme";

const CATEGORIES = ["Tops", "Bottoms", "Shoes", "Accessories"];

const AddItemScreen = () => {
	const [image, setImage] = useState(null);
	const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
	const [uploading, setUploading] = useState(false);
	const [isPublic, setIsPublic] = useState(false);
	const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);

	const userId = auth.currentUser?.uid;

	useFocusEffect(
		React.useCallback(() => {
			// Request permissions on focus, in case user changes them in settings
			(async () => {
				const { status } =
					await ImagePicker.requestMediaLibraryPermissionsAsync();
				if (status !== "granted") {
					Alert.alert(
						"Permission Denied",
						"Sorry, we need camera roll permissions to make this work!"
					);
				}
			})();

			// Reset state
			setImage(null);
			setSelectedCategory(CATEGORIES[0]);
			setUploading(false);
			setIsPublic(false);
		}, [])
	);

	const pickImage = async () => {
		let result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: false, // disable built-in cropper
			quality: 1, // highest quality so no data loss
		});

		if (!result.canceled) {
			setImage(result.assets[0].uri);
		}
	};

	const uploadItem = async () => {
		if (!image) {
			Alert.alert("No Image", "Please select an image to upload.");
			return;
		}
		if (!userId) {
			Alert.alert(
				"Not Logged In",
				"You must be logged in to upload items."
			);
			return;
		}

		setUploading(true);
		const storage = getStorage();
		const imageName = `${Date.now()}_${image.split("/").pop()}`;
		const imageRef = ref(
			storage,
			`clothing_items/${userId}/${selectedCategory}/${imageName}`
		);

		try {
			const response = await fetch(image);
			const blob = await response.blob();
			await uploadBytes(imageRef, blob);
			const downloadURL = await getDownloadURL(imageRef);

			await addDoc(collection(db, "clothingItems"), {
				ownerId: userId,
				imageUrl: downloadURL,
				category: selectedCategory,
				timestamp: new Date(),
				isPublic: isPublic,
			});

			Alert.alert("Success!", "Your item has been added to your closet.");
			// Reset form after success
			setImage(null);
			setSelectedCategory(CATEGORIES[0]);
			setIsPublic(false);
		} catch (error) {
			console.error("Error uploading item:", error);
			Alert.alert(
				"Upload Failed",
				"There was an error uploading your item. Please try again."
			);
		} finally {
			setUploading(false);
		}
	};

	const renderCategoryModal = () => (
		<Modal
			animationType="fade"
			transparent={true}
			visible={isCategoryModalVisible}
			onRequestClose={() => setCategoryModalVisible(false)}
		>
			<Pressable
				style={styles.modalBackdrop}
				onPress={() => setCategoryModalVisible(false)}
			>
				<View style={styles.modalContent}>
					<Text style={styles.modalTitle}>Select a Category</Text>
					{CATEGORIES.map((category) => (
						<TouchableOpacity
							key={category}
							style={styles.modalItem}
							onPress={() => {
								setSelectedCategory(category);
								setCategoryModalVisible(false);
							}}
						>
							<Text style={styles.modalItemText}>{category}</Text>
						</TouchableOpacity>
					))}
				</View>
			</Pressable>
		</Modal>
	);

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView showsVerticalScrollIndicator={false}>
				<View style={styles.header}>
					<Text style={styles.title}>Add to Your Closet</Text>
					<Text style={styles.subtitle}>
						Digitize your favorite pieces.
					</Text>
				</View>

				<TouchableOpacity
					style={styles.imagePicker}
					onPress={pickImage}
				>
					{image ? (
						<Image
							source={{ uri: image }}
							style={styles.imagePreview}
						/>
					) : (
						<View style={styles.imagePlaceholder}>
							<Feather
								name="upload-cloud"
								size={40}
								color={COLORS.primary[0]}
							/>
							<Text style={styles.imagePickerText}>
								Tap to select an image
							</Text>
						</View>
					)}
				</TouchableOpacity>

				{/* --- Custom Category Picker --- */}
				<Text style={styles.label}>Category</Text>
				<TouchableOpacity
					style={styles.pickerButton}
					onPress={() => setCategoryModalVisible(true)}
				>
					<Text style={styles.pickerButtonText}>
						{selectedCategory}
					</Text>
					<Ionicons
						name="chevron-down"
						size={22}
						color={COLORS.subtext}
					/>
				</TouchableOpacity>

				{/* --- Public Toggle --- */}
				<View style={styles.toggleContainer}>
					<View>
						<Text style={styles.label}>Make Public</Text>
						<Text style={styles.toggleSubtitle}>
							Visible to friends and followers.
						</Text>
					</View>
					<Switch
						trackColor={{
							false: COLORS.lightGray3,
							true: COLORS.primary[0],
						}}
						thumbColor={COLORS.white}
						ios_backgroundColor={COLORS.lightGray3}
						onValueChange={setIsPublic}
						value={isPublic}
					/>
				</View>

				{/* --- Upload Button --- */}
				<TouchableOpacity
					style={styles.uploadButton}
					onPress={uploadItem}
					disabled={uploading || !image}
				>
					<LinearGradient
						colors={
							!image
								? [COLORS.lightGray, COLORS.lightGray2]
								: COLORS.primary
						}
						style={styles.gradient}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
					>
						{uploading ? (
							<ActivityIndicator
								size="small"
								color={COLORS.white}
							/>
						) : (
							<Text style={styles.uploadButtonText}>
								Add Item to Closet
							</Text>
						)}
					</LinearGradient>
				</TouchableOpacity>
			</ScrollView>
			{renderCategoryModal()}
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.offWhite,
	},
	header: {
		paddingHorizontal: SIZES.padding * 2,
		marginTop: SIZES.padding,
		marginBottom: SIZES.padding * 2,
	},
	title: {
		...FONTS.h1,
		color: COLORS.black,
	},
	subtitle: {
		...FONTS.body3,
		color: COLORS.subtext,
		marginTop: SIZES.base / 2,
	},
	imagePicker: {
		marginHorizontal: SIZES.padding * 2,
		height: 300,
		justifyContent: "center",
		alignItems: "center",
		borderRadius: SIZES.radius,
		borderWidth: 2,
		borderColor: COLORS.lightGray3,
		borderStyle: "dashed",
		backgroundColor: COLORS.white,
		marginBottom: SIZES.padding * 3,
		overflow: "hidden",
	},
	imagePreview: {
		width: "100%",
		height: "100%",
		resizeMode: "contain", // show whole image
		backgroundColor: COLORS.white, // optional, so background is clean
	},

	imagePlaceholder: {
		alignItems: "center",
	},
	imagePickerText: {
		...FONTS.body4,
		color: COLORS.subtext,
		marginTop: SIZES.base,
	},
	label: {
		...FONTS.h4,
		color: COLORS.black,
		marginHorizontal: SIZES.padding * 2,
		marginBottom: SIZES.base,
	},
	pickerButton: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		backgroundColor: COLORS.white,
		marginHorizontal: SIZES.padding * 2,
		padding: SIZES.padding * 2,
		borderRadius: SIZES.radius,
		...FONTS.body3,
		marginBottom: SIZES.padding * 3,
	},
	pickerButtonText: {
		...FONTS.body3,
		color: COLORS.black,
	},
	toggleContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		backgroundColor: COLORS.white,
		marginHorizontal: SIZES.padding * 2,
		padding: SIZES.padding * 2,
		borderRadius: SIZES.radius,
		marginBottom: SIZES.padding * 4,
	},
	toggleSubtitle: {
		...FONTS.body5,
		color: COLORS.subtext,
		marginTop: 2,
	},
	uploadButton: {
		marginHorizontal: SIZES.padding * 2,
		borderRadius: SIZES.radius,
		overflow: "hidden",
		marginBottom: SIZES.padding * 2,
	},
	gradient: {
		padding: SIZES.padding * 1.8,
		alignItems: "center",
		justifyContent: "center",
	},
	uploadButtonText: {
		...FONTS.h4,
		color: COLORS.white,
	},
	// --- Modal Styles ---
	modalBackdrop: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.4)",
		justifyContent: "center",
		alignItems: "center",
	},
	modalContent: {
		backgroundColor: COLORS.white,
		width: "80%",
		borderRadius: SIZES.radius,
		padding: SIZES.padding * 2,
	},
	modalTitle: {
		...FONTS.h3,
		marginBottom: SIZES.padding * 2,
		textAlign: "center",
	},
	modalItem: {
		paddingVertical: SIZES.padding * 1.5,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.lightGray3,
	},
	modalItemText: {
		...FONTS.body3,
		textAlign: "center",
	},
});

export default AddItemScreen;
