// File: screens/ClosetScreen.js

import React, { useState, useEffect, memo, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	Image,
	ActivityIndicator,
	ScrollView,
	TouchableOpacity,
	Modal,
	Alert,
} from "react-native";
import {
	collection,
	query,
	where,
	onSnapshot,
	deleteDoc,
	doc,
} from "firebase/firestore";
import {
	getStorage,
	ref,
	deleteObject,
	getMetadata, // ✅ use metadata to verify existence safely
} from "firebase/storage";
import { auth, db } from "../firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

// Import theme constants
import { COLORS, SIZES, FONTS } from "../constants/theme";

// --- Utilities (safe path parsing & existence check) ---

/** Parse a Firebase Storage download URL to its object path. Returns null if not parsable. */
const parseStoragePathFromDownloadUrl = (urlStr) => {
	try {
		const url = new URL(urlStr);
		// Firebase download URLs contain "/o/<path>"
		if (!url.pathname.includes("/o/")) return null;
		return decodeURIComponent(url.pathname.split("/o/")[1].split("?")[0]);
	} catch {
		return null;
	}
};

/**
 * Verify that a Storage object exists using getMetadata.
 * Returns:
 *   true  -> object exists
 *   false -> confirmed not found (safe to delete)
 *   null  -> unknown / transient error (do NOT delete)
 */
const verifyImageExists = async (imageUrl) => {
	try {
		const path = parseStoragePathFromDownloadUrl(imageUrl);
		// If not a Firebase Storage download URL, don't attempt deletion logic.
		if (!path) return true; // assume valid to avoid unsafe deletes
		const storage = getStorage();
		const storageRef = ref(storage, path);
		await getMetadata(storageRef); // throws if object missing or no permission
		return true;
	} catch (e) {
		// Only treat "object-not-found" as proof that the object is gone.
		if (e?.code === "storage/object-not-found") return false;
		// Unauthorized, network, rate limits, etc. -> treat as unknown; don't delete.
		console.warn(
			"verifyImageExists non-fatal:",
			e?.code || e?.message || e
		);
		return null;
	}
};

// --- Child Components ---

/**
 * ImageItem now supports a "bustToken" to force re-fetch on retry
 * and still calls onImageError(itemId) on real load failures.
 */
const ImageItem = memo(({ uri, style, itemId, onImageError, bustToken }) => {
	// Append a cache-busting param when we want to force a reload attempt
	const finalUri = React.useMemo(() => {
		if (!bustToken) return uri;
		const sep = uri.includes("?") ? "&" : "?";
		return `${uri}${sep}cb=${bustToken}`;
	}, [uri, bustToken]);

	return (
		<Image
			source={{ uri: finalUri }}
			style={[style, { resizeMode: "contain" }]}
			onError={() => onImageError(itemId)}
		/>
	);
});

const CategoryRow = memo(
	({
		category,
		items,
		onViewAll,
		onImagePress,
		onImageLongPress,
		onImageError,
		failedImageIds,
		cacheBust,
	}) => {
		const visibleItems = items.filter((item) => !failedImageIds[item.id]);

		if (visibleItems.length === 0) {
			return null;
		}

		const renderItemThumbnail = ({ item }) => (
			<TouchableOpacity
				style={styles.thumbnailContainer}
				onPress={() => onImagePress(item)}
				onLongPress={() => onImageLongPress(item)}
			>
				<ImageItem
					uri={item.imageUrl}
					style={styles.thumbnail}
					itemId={item.id}
					onImageError={onImageError}
					bustToken={cacheBust[item.id] || 0}
				/>
			</TouchableOpacity>
		);

		return (
			<View style={styles.categoryContainer}>
				<View style={styles.categoryHeader}>
					<Text style={styles.categoryTitle}>{category}</Text>
					<TouchableOpacity
						style={styles.viewAllButton}
						onPress={() => onViewAll(category)}
					>
						<Text style={styles.viewAllText}>View All</Text>
						<Ionicons
							name="chevron-forward"
							size={16}
							color={COLORS.primary[1]}
						/>
					</TouchableOpacity>
				</View>
				<FlatList
					horizontal
					data={visibleItems.slice(0, 7)}
					renderItem={renderItemThumbnail}
					keyExtractor={(item) => item.id}
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={{ paddingLeft: SIZES.padding * 2 }}
				/>
			</View>
		);
	}
);

// --- Main Screen Component ---

const ClosetScreen = () => {
	const navigation = useNavigation();
	const [loading, setLoading] = useState(true);
	const [groupedItems, setGroupedItems] = useState({});
	const [isModalVisible, setModalVisible] = useState(false);
	const [selectedCategory, setSelectedCategory] = useState(null);
	const [failedImageIds, setFailedImageIds] = useState({});
	const [cacheBust, setCacheBust] = useState({}); // used to force re-fetch on retry

	// Throttle background cleanup so it doesn't run too frequently
	const lastCleanupRef = useRef(0);
	const CLEANUP_MIN_INTERVAL_MS = 60_000; // run at most once per minute

	const userId = auth.currentUser?.uid;
	const categories = [
		"Tops",
		"Bottoms",
		"Dresses",
		"Outerwear",
		"Shoes",
		"Accessories",
	];

	const handleItemDelete = async (item) => {
		Alert.alert(
			"Delete Item",
			"Are you sure you want to permanently delete this item?",
			[
				{
					text: "Cancel",
					style: "cancel",
				},
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						try {
							// 1. Delete the document from Firestore
							await deleteDoc(doc(db, "clothingItems", item.id));

							// 2. Delete the image from Firebase Storage
							const imagePath = parseStoragePathFromDownloadUrl(
								item.imageUrl
							);
							if (imagePath) {
								const storage = getStorage();
								const imageRef = ref(storage, imagePath);
								await deleteObject(imageRef);
							}

							// Optional: Show a success message (toast)
							// For now, the UI will just update automatically.
						} catch (error) {
							console.error("Error deleting item:", error);
							Alert.alert(
								"Error",
								"Could not delete the item. Please try again."
							);
						}
					},
				},
			]
		);
	};

	// --- Background cleanup: deletes only confirmed-missing images (safe) ---
	const runBackgroundCleanup = async (itemsByCat) => {
		// throttle
		const now = Date.now();
		if (now - lastCleanupRef.current < CLEANUP_MIN_INTERVAL_MS) {
			return;
		}
		lastCleanupRef.current = now;

		try {
			const allItems = Object.values(itemsByCat).flat();

			for (const item of allItems) {
				try {
					const exists = await verifyImageExists(item.imageUrl);

					// delete ONLY when Storage confirms object is missing
					if (exists === false) {
						console.log(
							`[Cleanup] Image missing for ${item.id}, deleting...`
						);

						// Delete Firestore doc
						try {
							await deleteDoc(doc(db, "clothingItems", item.id));
						} catch (e) {
							console.warn(
								`[Cleanup] Firestore delete failed for ${item.id}:`,
								e
							);
						}

						// Delete from Storage (best-effort)
						try {
							const path = parseStoragePathFromDownloadUrl(
								item.imageUrl
							);
							if (path) {
								const storage = getStorage();
								const storageRef = ref(storage, path);
								await deleteObject(storageRef);
							}
						} catch (e) {
							console.warn(
								`[Cleanup] Storage delete failed for ${item.id}:`,
								e
							);
						}
					}
					// exists === true -> do nothing
					// exists === null -> unknown transient error; do nothing
				} catch (err) {
					console.warn(`[Cleanup] verify failed:`, err);
				}
			}
		} catch (err) {
			console.error("Background cleanup error:", err);
		}
	};

	// Fetch items and run background cleanup automatically (throttled)
	useEffect(() => {
		if (!userId) {
			setLoading(false);
			return;
		}
		const q = query(
			collection(db, "clothingItems"),
			where("ownerId", "==", userId)
		);
		const unsubscribe = onSnapshot(
			q,
			(querySnapshot) => {
				const itemsByCat = {};
				categories.forEach((cat) => (itemsByCat[cat] = []));
				querySnapshot.forEach((docSnap) => {
					const item = { id: docSnap.id, ...docSnap.data() };
					if (item.category && itemsByCat[item.category]) {
						itemsByCat[item.category].push(item);
					}
				});
				setGroupedItems(itemsByCat);
				setLoading(false);

				// 🔹 Safe automatic cleanup (does not delete on transient errors)
				runBackgroundCleanup(itemsByCat);
			},
			(error) => {
				console.error("Error fetching closet items: ", error);
				setLoading(false);
			}
		);
		return () => unsubscribe();
	}, [userId]);

	// --- Safer broken image handling from the UI render path ---
	const handleImageLoadError = async (itemId) => {
		// Hide for this render pass to avoid blank containers
		setFailedImageIds((prev) => ({ ...prev, [itemId]: true }));

		// Find the item for URL
		const allItems = Object.values(groupedItems).flat();
		const item = allItems.find((i) => i.id === itemId);
		if (!item) return;

		// Double-check Storage before any destructive action
		const exists = await verifyImageExists(item.imageUrl);

		if (exists === false) {
			// Confirmed missing: safe to delete
			try {
				await deleteDoc(doc(db, "clothingItems", itemId));
				console.log(`[UI] Deleted Firestore doc for item ${itemId}`);
			} catch (error) {
				console.warn("[UI] Error deleting Firestore doc:", error);
			}
			try {
				const path = parseStoragePathFromDownloadUrl(item.imageUrl);
				if (path) {
					const storage = getStorage();
					const storageRef = ref(storage, path);
					await deleteObject(storageRef);
					console.log(`[UI] Deleted image from Storage: ${path}`);
				}
			} catch (error) {
				console.warn("[UI] Error deleting image from Storage:", error);
			}
			return;
		}

		if (exists === true) {
			// Image is real; likely a transient fetch/render issue.
			// Force a re-fetch and unhide the tile.
			setCacheBust((prev) => ({ ...prev, [itemId]: Date.now() }));
			setFailedImageIds((prev) => {
				const { [itemId]: _remove, ...rest } = prev;
				return rest;
			});
			return;
		}

		// exists === null (unknown/transient) -> try a single delayed retry
		setTimeout(() => {
			setCacheBust((prev) => ({ ...prev, [itemId]: Date.now() }));
			setFailedImageIds((prev) => {
				const { [itemId]: _remove, ...rest } = prev;
				return rest;
			});
		}, 1500);
	};

	const handleViewAll = (category) => {
		setSelectedCategory(category);
		setModalVisible(true);
	};

	const closeModal = () => {
		setModalVisible(false);
		setSelectedCategory(null);
	};

	const handleImagePress = (item) => {
		console.log("Pressed item:", item.id);
	};

	// Empty State
	const renderEmptyState = () => (
		<View style={styles.emptyStateContainer}>
			<Ionicons
				name="shirt-outline"
				size={80}
				color={COLORS.lightGray3}
			/>
			<Text style={styles.emptyStateTitle}>Your Closet is Empty</Text>
			<Text style={styles.emptyStateSubtitle}>
				Tap the button below to add your first clothing item.
			</Text>
			<TouchableOpacity
				style={styles.emptyStateButton}
				onPress={() => navigation.navigate("AddItem")}
			>
				<LinearGradient
					colors={COLORS.primary}
					style={styles.gradient}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
				>
					<Text style={styles.emptyStateButtonText}>
						Add First Item
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

	const isEmpty = Object.values(groupedItems).every(
		(arr) => arr.length === 0
	);

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: COLORS.offWhite }}>
			<BlurView
				intensity={isModalVisible ? 10 : 0}
				style={StyleSheet.absoluteFill}
			>
				<ScrollView
					style={styles.container}
					contentContainerStyle={{ paddingBottom: 120 }}
				>
					<View style={styles.header}>
						<Text style={styles.screenTitle}>My Closet</Text>
						<Text style={styles.screenSubtitle}>
							Your personal collection
						</Text>
					</View>

					{isEmpty
						? renderEmptyState()
						: categories.map((category) => (
								<CategoryRow
									key={category}
									category={category}
									items={groupedItems[category] || []}
									onViewAll={handleViewAll}
									onImagePress={handleImagePress}
									onImageLongPress={handleItemDelete}
									onImageError={handleImageLoadError}
									failedImageIds={failedImageIds}
									cacheBust={cacheBust}
								/>
						  ))}
				</ScrollView>
			</BlurView>

			{!isEmpty && (
				<TouchableOpacity
					style={styles.fab}
					onPress={() => navigation.navigate("OutfitCanvas")}
				>
					<LinearGradient
						colors={COLORS.primary}
						style={styles.fabGradient}
					>
						<Ionicons
							name="shirt-outline"
							size={22}
							color={COLORS.white}
						/>
						<Text style={styles.fabText}>Create Outfit</Text>
					</LinearGradient>
				</TouchableOpacity>
			)}

			{/* Modal */}
			<Modal
				animationType="slide"
				transparent={true}
				visible={isModalVisible}
				onRequestClose={closeModal}
			>
				<View style={styles.modalContainer}>
					<TouchableOpacity
						style={styles.modalBackdrop}
						onPress={closeModal}
					/>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>
								{selectedCategory}
							</Text>
							<TouchableOpacity
								style={styles.closeButton}
								onPress={closeModal}
							>
								<Ionicons
									name="close"
									size={28}
									color={COLORS.subtext}
								/>
							</TouchableOpacity>
						</View>
						<FlatList
							data={
								selectedCategory
									? (
											groupedItems[selectedCategory] || []
									  ).filter(
											(item) => !failedImageIds[item.id]
									  )
									: []
							}
							renderItem={({ item }) => (
								<View style={styles.modalGridItem}>
									<ImageItem
										uri={item.imageUrl}
										style={styles.modalImage}
										itemId={item.id}
										onImageError={handleImageLoadError}
										bustToken={cacheBust[item.id] || 0}
									/>
								</View>
							)}
							keyExtractor={(item) => item.id}
							numColumns={2}
							showsVerticalScrollIndicator={false}
						/>
					</View>
				</View>
			</Modal>
		</SafeAreaView>
	);
};

// --- Styles ---
const styles = StyleSheet.create({
	centered: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: COLORS.offWhite,
	},
	container: { flex: 1 },
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
	categoryContainer: { marginBottom: SIZES.padding * 2.5 },
	categoryHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: SIZES.padding * 2,
		marginBottom: SIZES.padding * 1.5,
	},
	categoryTitle: { ...FONTS.h3, color: COLORS.black },
	viewAllButton: { flexDirection: "row", alignItems: "center" },
	viewAllText: {
		...FONTS.body4,
		fontFamily: "Poppins-SemiBold",
		color: COLORS.primary[1],
		marginRight: 4,
	},
	thumbnailContainer: {
		width: 120,
		height: 160,
		borderRadius: SIZES.radius,
		backgroundColor: COLORS.white,
		marginRight: SIZES.padding * 1.5,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.08,
		shadowRadius: 10,
		elevation: 5,
	},
	thumbnail: { width: "100%", height: "100%", borderRadius: SIZES.radius },
	modalContainer: { flex: 1, justifyContent: "flex-end" },
	modalBackdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0,0,0,0.3)",
	},
	modalContent: {
		height: "80%",
		backgroundColor: COLORS.offWhite,
		borderTopLeftRadius: SIZES.radius * 1.5,
		borderTopRightRadius: SIZES.radius * 1.5,
		paddingHorizontal: SIZES.padding * 2,
		paddingTop: SIZES.padding * 2,
	},
	modalHeader: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: SIZES.padding * 2,
	},
	modalTitle: { ...FONTS.h2, textAlign: "center", flex: 1 },
	closeButton: { position: "absolute", right: 0, padding: 5 },
	modalGridItem: {
		flex: 1 / 2,
		aspectRatio: 3 / 4,
		margin: SIZES.base,
		backgroundColor: COLORS.white,
		borderRadius: SIZES.radius,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 5,
		elevation: 2,
	},
	modalImage: { width: "100%", height: "100%", borderRadius: SIZES.radius },
	emptyStateContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: SIZES.padding * 2,
		marginTop: SIZES.height / 8,
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
	gradient: {
		padding: SIZES.padding * 1.8,
		alignItems: "center",
		justifyContent: "center",
	},

	// FAB
	fab: {
		position: "absolute",
		bottom: 145,
		alignSelf: "center",
		shadowColor: COLORS.primary[0],
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.3,
		shadowRadius: 15,
		elevation: 10,
	},
	fabGradient: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: SIZES.padding * 1.5,
		paddingHorizontal: SIZES.padding * 2.5,
		borderRadius: 30,
		gap: SIZES.base,
	},
	fabText: {
		...FONTS.h4,
		color: COLORS.white,
	},
});

export default ClosetScreen;
