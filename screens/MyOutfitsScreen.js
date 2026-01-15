// File: screens/MyOutfitsScreen.js

import React, { useState, useEffect, memo } from "react";
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	Image,
	TouchableOpacity,
	ActivityIndicator,
} from "react-native";
import {
	collection,
	query,
	where,
	onSnapshot,
	getDocs,
	documentId,
	deleteDoc,
	doc,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { SafeAreaView } from "react-native-safe-area-context";
import { format } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// Import theme constants
import { COLORS, SIZES, FONTS } from "../constants/theme";

// A few predefined gradients for the cards to cycle through
const cardGradients = [
	["#E0EAFC", "#CFDEF3"], // Light Blue
	["#FFDAB9", "#FFC3A0"], // Peach
	["#F7F8F8", "#ACBB78"], // Sage
	["#FAD0C4", "#FFD1FF"], // Pink/Lilac
];

// --- The new, highly visual Outfit Preview Card ---
const OutfitPreviewCard = memo(({ outfitData, onPress, index }) => {
	const { processedItems, createdAt } = outfitData;

	if (!processedItems || Object.keys(processedItems).length === 0) {
		return null;
	}

	// Assign a gradient based on the item's index in the list
	const gradient = cardGradients[index % cardGradients.length];

	const renderItem = (category, customStyle) => {
		const uri = processedItems[category];
		if (!uri) return null;

		// The "Polaroid" effect wrapper
		return (
			<View style={[styles.itemImageWrapper, customStyle]}>
				<Image source={{ uri }} style={styles.cardImage} />
			</View>
		);
	};

	return (
		<TouchableOpacity style={styles.cardOuterContainer} onPress={onPress}>
			<LinearGradient colors={gradient} style={styles.cardGradient}>
				{/* We use absolute positioning to create a collage effect */}
				{renderItem("Tops", styles.topItem)}
				{renderItem("Bottoms", styles.bottomItem)}
				{renderItem("Shoes", styles.shoeItem)}
				{renderItem("Accessories", styles.accessoryItem)}

				<View style={styles.cardFooter}>
					<Text style={styles.cardDate}>
						{createdAt ? format(createdAt.toDate(), "MMM dd") : ""}
					</Text>
				</View>
			</LinearGradient>
		</TouchableOpacity>
	);
});

const MyOutfitsScreen = ({ navigation }) => {
	const [outfits, setOutfits] = useState([]);
	const [loading, setLoading] = useState(true);
	const userId = auth.currentUser?.uid;

	useEffect(() => {
		// The existing, robust data fetching logic remains unchanged
		if (!userId) {
			setLoading(false);
			return;
		}

		const outfitsRef = collection(db, "outfits");
		const userOutfitsQuery = query(
			outfitsRef,
			where("ownerId", "==", userId)
		);

		const unsubscribe = onSnapshot(userOutfitsQuery, async (snapshot) => {
			const fetchedOutfits = snapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));
			const validOutfits = [];
			const categories = ["Tops", "Bottoms", "Shoes", "Accessories"];

			for (const outfit of fetchedOutfits) {
				if (
					!outfit.items ||
					!Array.isArray(outfit.items) ||
					outfit.items.length === 0
				) {
					await deleteDoc(doc(db, "outfits", outfit.id));
					continue;
				}

				const itemIds = outfit.items.slice(0, 10); // Firestore 'in' query limit
				if (itemIds.length === 0) continue;

				const itemQuery = query(
					collection(db, "clothingItems"),
					where(documentId(), "in", itemIds)
				);
				try {
					const itemSnapshot = await getDocs(itemQuery);
					if (itemSnapshot.empty) {
						await deleteDoc(doc(db, "outfits", outfit.id));
						continue;
					}

					const processedItems = {};
					itemSnapshot.forEach((itemDoc) => {
						const data = itemDoc.data();
						if (
							categories.includes(data.category) &&
							data.imageUrl
						) {
							processedItems[data.category] = data.imageUrl;
						}
					});

					if (Object.keys(processedItems).length > 0) {
						validOutfits.push({ ...outfit, processedItems });
					} else {
						await deleteDoc(doc(db, "outfits", outfit.id));
					}
				} catch (err) {
					console.error(`Error processing outfit ${outfit.id}:`, err);
				}
			}

			setOutfits(validOutfits.sort((a, b) => b.createdAt - a.createdAt));
			setLoading(false);
		});

		return () => unsubscribe();
	}, [userId]);

	const renderEmptyState = () => (
		<View style={styles.emptyStateContainer}>
			<Ionicons
				name="albums-outline"
				size={80}
				color={COLORS.lightGray3}
			/>
			<Text style={styles.emptyStateTitle}>No Outfits Yet</Text>
			<Text style={styles.emptyStateSubtitle}>
				Head to the canvas to style and save your first look!
			</Text>
			<TouchableOpacity
				style={styles.emptyStateButton}
				onPress={() => navigation.navigate("OutfitCanvas")}
			>
				<LinearGradient
					colors={COLORS.primary}
					style={styles.emptyGradient}
				>
					<Text style={styles.emptyStateButtonText}>
						Create Outfit
					</Text>
				</LinearGradient>
			</TouchableOpacity>
		</View>
	);

	if (loading) {
		return (
			<ActivityIndicator
				style={styles.centered}
				size="large"
				color={COLORS.primary[0]}
			/>
		);
	}

	return (
		<SafeAreaView
			style={styles.container}
			edges={["left", "right", "bottom"]}
		>
			<View style={styles.header}>
				<Text style={styles.screenTitle}>My Outfits</Text>
				<Text style={styles.screenSubtitle}>
					Every style you've curated.
				</Text>
			</View>

			{outfits.length === 0 ? (
				renderEmptyState()
			) : (
				<FlatList
					data={outfits}
					keyExtractor={(item) => item.id}
					numColumns={2}
					contentContainerStyle={styles.listContainer}
					renderItem={({ item, index }) => (
						<OutfitPreviewCard
							outfitData={item}
							index={index}
							onPress={() =>
								navigation.navigate("OutfitDetail", {
									outfitId: item.id,
								})
							}
						/>
					)}
				/>
			)}
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
	container: { flex: 1, backgroundColor: COLORS.offWhite },
	header: {
		paddingHorizontal: SIZES.padding * 2,
		marginTop: SIZES.padding,
		marginBottom: SIZES.padding,
	},
	screenTitle: { ...FONTS.h1, color: COLORS.black },
	screenSubtitle: {
		...FONTS.body3,
		color: COLORS.subtext,
		marginTop: SIZES.base / 2,
	},
	listContainer: { paddingHorizontal: SIZES.padding },
	cardOuterContainer: {
		flex: 1 / 2,
		aspectRatio: 0.8,
		padding: SIZES.base,
	},
	cardGradient: {
		flex: 1,
		borderRadius: SIZES.radius * 1.25,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 5 },
		shadowOpacity: 0.1,
		shadowRadius: 15,
		elevation: 8,
	},
	cardFooter: {
		position: "absolute",
		bottom: 10,
		right: 12,
		backgroundColor: "rgba(255,255,255,0.7)",
		paddingHorizontal: SIZES.base,
		paddingVertical: 4,
		borderRadius: SIZES.radius,
	},
	cardDate: {
		...FONTS.body5,
		fontFamily: "Poppins-Bold",
		color: COLORS.darkgray,
	},
	itemImageWrapper: {
		position: "absolute",
		backgroundColor: COLORS.white,
		padding: 4,
		borderRadius: SIZES.radius / 2,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.15,
		shadowRadius: 3,
		elevation: 4,
	},
	cardImage: {
		width: "100%",
		height: "100%",
		resizeMode: "contain",
		borderRadius: SIZES.radius / 2 - 2,
	},
	// --- Absolute Positioning for Collage Effect ---
	topItem: { width: "80%", height: "55%", top: "10%", left: "10%" },
	bottomItem: {
		width: "65%",
		height: "45%",
		top: "50%",
		left: "18%",
		transform: [{ rotate: "2deg" }],
	},
	shoeItem: {
		width: "45%",
		height: "25%",
		bottom: "8%",
		left: "5%",
		transform: [{ rotate: "-5deg" }],
	},
	accessoryItem: {
		width: "35%",
		height: "35%",
		top: "8%",
		right: "5%",
		transform: [{ rotate: "8deg" }],
	},
	// --- Empty State Styles ---
	emptyStateContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: SIZES.padding * 2,
	},
	emptyStateTitle: {
		...FONTS.h2,
		marginTop: SIZES.padding * 2,
		marginBottom: SIZES.base,
	},
	emptyStateSubtitle: {
		...FONTS.body3,
		color: COLORS.subtext,
		textAlign: "center",
		maxWidth: "80%",
		marginBottom: SIZES.padding * 3,
	},
	emptyStateButton: {
		borderRadius: SIZES.radius,
		overflow: "hidden",
		width: "80%",
	},
	emptyStateButtonText: { ...FONTS.h4, color: COLORS.white },
	emptyGradient: {
		padding: SIZES.padding * 1.8,
		alignItems: "center",
		justifyContent: "center",
	},
});

export default MyOutfitsScreen;
