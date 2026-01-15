// File: screens/OutfitDetailScreen.js

import React, { useEffect, useRef, useState, memo } from "react";
import {
	View,
	Text,
	StyleSheet,
	Image,
	TouchableOpacity,
	Alert,
	Modal,
	Pressable,
	ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import {
	doc,
	getDoc,
	deleteDoc,
	collection,
	query,
	where,
	getDocs,
	documentId,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { format } from "date-fns";
import { Ionicons } from "@expo/vector-icons";

// Import theme constants
import { COLORS, SIZES, FONTS } from "../constants/theme";

// --- A styled component for each clothing item "Polaroid" ---
const PolaroidItem = memo(({ uri, category, containerStyle }) => (
	<View style={[styles.polaroidContainer, containerStyle]}>
		<Image source={{ uri }} style={styles.polaroidImage} />
		<Text style={styles.polaroidCaption}>{category}</Text>
	</View>
));

const OutfitDetailScreen = ({ route }) => {
	const navigation = useNavigation();
	const { outfitId } = route.params;
	const [outfitData, setOutfitData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [confirmVisible, setConfirmVisible] = useState(false);
	const viewShotRef = useRef();

	useEffect(() => {
		const fetchOutfit = async () => {
			if (!outfitId) {
				setLoading(false);
				return;
			}
			try {
				const docRef = doc(db, "outfits", outfitId);
				const docSnap = await getDoc(docRef);

				if (docSnap.exists()) {
					const rawData = { id: docSnap.id, ...docSnap.data() };
					const itemIds = rawData.items?.slice(0, 10) || [];

					if (itemIds.length > 0) {
						const itemQuery = query(
							collection(db, "clothingItems"),
							where(documentId(), "in", itemIds)
						);
						const itemSnapshot = await getDocs(itemQuery);
						const processedItems = {};
						itemSnapshot.forEach((itemDoc) => {
							const data = itemDoc.data();
							if (data.category && data.imageUrl) {
								// For accessories, we'll just take the first one for this view
								if (
									data.category === "Accessories" &&
									!processedItems.Accessories
								) {
									processedItems.Accessories = {
										uri: data.imageUrl,
									};
								} else if (data.category !== "Accessories") {
									processedItems[data.category] = {
										uri: data.imageUrl,
									};
								}
							}
						});
						setOutfitData({ ...rawData, processedItems });
					}
				} else {
					console.warn("No outfit found for ID:", outfitId);
				}
			} catch (error) {
				console.error("Error fetching outfit:", error);
			} finally {
				setLoading(false);
			}
		};
		fetchOutfit();
	}, [outfitId]);

	const handleShare = async () => {
		try {
			const uri = await viewShotRef.current.capture();
			await Sharing.shareAsync(uri, {
				mimeType: "image/png",
				dialogTitle: "Check out my outfit!",
			});
		} catch (error) {
			Alert.alert("Error", "Could not share outfit.");
		}
	};

	const handleDelete = async () => {
		try {
			await deleteDoc(doc(db, "outfits", outfitId));
			setConfirmVisible(false);
			navigation.goBack();
		} catch (error) {
			Alert.alert("Error", "Could not delete outfit.");
		}
	};

	if (loading) {
		return (
			<ActivityIndicator
				style={styles.centered}
				size="large"
				color={COLORS.primary[0]}
			/>
		);
	}

	if (!outfitData || !outfitData.processedItems) {
		return (
			<SafeAreaView style={styles.centered}>
				<Text style={styles.errorText}>Oops! Outfit not found.</Text>
			</SafeAreaView>
		);
	}

	const { processedItems, createdAt } = outfitData;

	return (
		<SafeAreaView style={styles.container}>
			{/* The "Scrapbook Page" that will be captured */}
			<ViewShot
				ref={viewShotRef}
				style={styles.captureContainer}
				options={{ format: "png", quality: 0.9 }}
			>
				<LinearGradient
					colors={["#F6D5F7", "#FDEBFF"]}
					style={styles.pageGradient}
				>
					<Text style={styles.pageTitle}>
						Styled on{" "}
						{createdAt
							? format(createdAt.toDate(), "MMMM do")
							: "a lovely day"}
					</Text>

					{/* Absolutely positioned Polaroids for a dynamic layout */}
					{processedItems.Tops && (
						<PolaroidItem
							uri={processedItems.Tops.uri}
							category="Top"
							containerStyle={styles.topItem}
						/>
					)}
					{processedItems.Bottoms && (
						<PolaroidItem
							uri={processedItems.Bottoms.uri}
							category="Bottom"
							containerStyle={styles.bottomItem}
						/>
					)}
					{processedItems.Shoes && (
						<PolaroidItem
							uri={processedItems.Shoes.uri}
							category="Shoes"
							containerStyle={styles.shoeItem}
						/>
					)}
					{processedItems.Accessories && (
						<PolaroidItem
							uri={processedItems.Accessories.uri}
							category="Accessory"
							containerStyle={styles.accessoryItem}
						/>
					)}

					<Text style={styles.brandWatermark}>
						Styled with DRAWBIE
					</Text>
				</LinearGradient>
			</ViewShot>

			{/* Floating Action Buttons (Not part of the capture) */}
			<View style={styles.actionButtonsContainer}>
				<TouchableOpacity
					style={styles.deleteButton}
					onPress={() => setConfirmVisible(true)}
				>
					<Ionicons
						name="trash-outline"
						size={24}
						color={COLORS.subtext}
					/>
				</TouchableOpacity>

				<TouchableOpacity onPress={handleShare}>
					<LinearGradient
						colors={COLORS.primary}
						style={styles.shareButton}
					>
						<Ionicons
							name="share-social-outline"
							size={24}
							color={COLORS.white}
						/>
						<Text style={styles.shareButtonText}>Share Look</Text>
					</LinearGradient>
				</TouchableOpacity>
			</View>

			{/* Confirmation Modal */}
			<Modal
				transparent
				visible={confirmVisible}
				animationType="fade"
				onRequestClose={() => setConfirmVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Delete Outfit?</Text>
						<Text style={styles.modalSubtitle}>
							This action cannot be undone.
						</Text>
						<View style={styles.modalButtons}>
							<TouchableOpacity
								style={[
									styles.modalButton,
									styles.cancelButton,
								]}
								onPress={() => setConfirmVisible(false)}
							>
								<Text
									style={[
										styles.modalButtonText,
										{ color: COLORS.black },
									]}
								>
									Cancel
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.modalButton,
									styles.confirmButton,
								]}
								onPress={handleDelete}
							>
								<Text style={styles.modalButtonText}>
									Delete
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	centered: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: COLORS.offWhite,
	},
	container: {
		flex: 1,
		backgroundColor: COLORS.offWhite,
		padding: SIZES.padding * 2,
	},
	errorText: { ...FONTS.h3, color: COLORS.subtext },

	// The Shareable Page
	captureContainer: {
		flex: 1,
		borderRadius: SIZES.radius * 1.5,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.1,
		shadowRadius: 20,
		elevation: 15,
		overflow: "hidden", // Ensures gradient corners are rounded
	},
	pageGradient: { flex: 1, padding: SIZES.padding * 2 },
	pageTitle: {
		...FONTS.h2,
		color: COLORS.black,
		textAlign: "center",
		marginBottom: SIZES.padding,
	},
	brandWatermark: {
		position: "absolute",
		bottom: SIZES.padding,
		left: SIZES.padding * 2,
		...FONTS.body5,
		color: COLORS.subtext,
		opacity: 0.7,
	},

	// Polaroid Styles
	polaroidContainer: {
		position: "absolute",
		backgroundColor: COLORS.white,
		padding: SIZES.base,
		paddingBottom: SIZES.padding * 2.5,
		borderRadius: SIZES.radius * 0.75,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 8,
		alignItems: "center",
	},
	polaroidImage: {
		width: "100%",
		height: "100%",
		borderRadius: SIZES.radius / 2,
		resizeMode: "contain",
	},
	polaroidCaption: {
		position: "absolute",
		bottom: SIZES.base,
		...FONTS.body5,
		fontFamily: "Poppins-SemiBold",
		color: COLORS.black,
	},

	// Absolute Positioning for the Scrapbook Layout
	topItem: {
		width: "65%",
		height: "40%",
		top: "15%",
		left: "5%",
		transform: [{ rotate: "-4deg" }],
	},
	bottomItem: {
		width: "55%",
		height: "35%",
		top: "50%",
		right: "8%",
		transform: [{ rotate: "3deg" }],
	},
	shoeItem: {
		width: "40%",
		height: "20%",
		bottom: "15%",
		left: "10%",
		transform: [{ rotate: "5deg" }],
	},
	accessoryItem: {
		width: "30%",
		height: "25%",
		top: "20%",
		right: "10%",
		transform: [{ rotate: "10deg" }],
	},

	// Floating Action Buttons
	actionButtonsContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingTop: SIZES.padding * 2,
		gap: SIZES.padding,
	},
	deleteButton: {
		width: 56,
		height: 56,
		backgroundColor: COLORS.white,
		borderRadius: 28,
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 5,
		elevation: 5,
	},
	shareButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: SIZES.padding * 1.5,
		paddingHorizontal: SIZES.padding * 3,
		borderRadius: 30,
	},
	shareButtonText: {
		...FONTS.h4,
		color: COLORS.white,
		marginLeft: SIZES.base,
	},

	// Modal Styles
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.5)",
		justifyContent: "center",
		alignItems: "center",
		padding: SIZES.padding * 2,
	},
	modalContent: {
		width: "100%",
		backgroundColor: COLORS.white,
		borderRadius: SIZES.radius * 1.5,
		padding: SIZES.padding * 2.5,
		alignItems: "center",
	},
	modalTitle: { ...FONTS.h2, marginBottom: SIZES.base / 2 },
	modalSubtitle: {
		...FONTS.body4,
		color: COLORS.subtext,
		marginBottom: SIZES.padding * 2,
		textAlign: "center",
	},
	modalButtons: { flexDirection: "row", width: "100%", gap: SIZES.padding },
	modalButton: {
		flex: 1,
		padding: SIZES.padding * 1.5,
		borderRadius: SIZES.radius,
		alignItems: "center",
	},
	cancelButton: { backgroundColor: COLORS.lightGray },
	confirmButton: { backgroundColor: "#FF6B6B" },
	modalButtonText: { ...FONTS.h4, color: COLORS.white },
});

export default OutfitDetailScreen;
