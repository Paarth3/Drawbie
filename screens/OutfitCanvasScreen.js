// File: screens/OutfitCanvasScreen.js

import React, { useState, useEffect, useCallback, memo } from "react";
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	Image,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
	Switch,
} from "react-native";
import {
	collection,
	query,
	where,
	onSnapshot,
	addDoc,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// Import theme constants
import { COLORS, SIZES, FONTS } from "../constants/theme";

// --- Child Components ---

const CanvasPlaceholder = memo(({ iconName, label }) => (
	<View style={styles.placeholderContainer}>
		<Ionicons name={iconName} size={40} color={COLORS.lightGray3} />
		<Text style={styles.placeholderText}>{label}</Text>
	</View>
));

const DraggableItem = memo(({ itemData, onRemove }) => {
	const translateX = useSharedValue(0);
	const translateY = useSharedValue(0);

	const panGesture = Gesture.Pan()
		.onStart((_, ctx) => {
			ctx.startX = translateX.value;
			ctx.startY = translateY.value;
		})
		.onUpdate((event, ctx) => {
			translateX.value = ctx.startX + event.translationX;
			translateY.value = ctx.startY + event.translationY;
		})
		.onEnd(() => {
			translateX.value = withSpring(0);
			translateY.value = withSpring(0);
		});

	const longPressGesture = Gesture.LongPress(500).onEnd(() => {
		runOnJS(onRemove)(itemData);
	});

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [
			{ translateX: translateX.value },
			{ translateY: translateY.value },
		],
	}));

	return (
		<GestureDetector
			gesture={Gesture.Simultaneous(panGesture, longPressGesture)}
		>
			<Animated.View
				style={[styles.draggableItemContainer, animatedStyle]}
			>
				<Image
					source={{ uri: itemData.imageUrl }}
					style={styles.canvasItemImage}
				/>
			</Animated.View>
		</GestureDetector>
	);
});

// --- Main Screen Component ---

const OutfitCanvasScreen = ({ navigation }) => {
	const [loading, setLoading] = useState(true);
	const [allItems, setAllItems] = useState({});
	const [activeCategory, setActiveCategory] = useState("Tops");
	const [canvasItems, setCanvasItems] = useState({
		Tops: null,
		Bottoms: null,
		Shoes: null,
		Accessories: [],
	});
	const [isPublic, setIsPublic] = useState(false);
	const userId = auth.currentUser?.uid;
	const categories = ["Tops", "Bottoms", "Shoes", "Accessories"];

	const handleRemoveItem = useCallback((item) => {
		Alert.alert(
			"Remove Item",
			"Are you sure you want to remove this item from the canvas?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Remove",
					style: "destructive",
					onPress: () => {
						setCanvasItems((prev) => {
							return { ...prev, [item.category]: null };
						});
					},
				},
			]
		);
	}, []);

	const handleClearCanvas = () => {
		Alert.alert(
			"Clear Canvas",
			"Are you sure you want to remove all items?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Clear",
					style: "destructive",
					onPress: () =>
						setCanvasItems({
							Tops: null,
							Bottoms: null,
							Shoes: null,
							Accessories: null,
						}),
				},
			]
		);
	};

	const handleSaveOutfit = async () => {
		const itemIds = [
			canvasItems.Tops?.id,
			canvasItems.Bottoms?.id,
			canvasItems.Shoes?.id,
			canvasItems.Accessories?.id,
		].filter(Boolean);

		if (itemIds.length < 2) {
			Alert.alert(
				"Incomplete Outfit",
				"Please add at least two items to save an outfit."
			);
			return;
		}
		try {
			await addDoc(collection(db, "outfits"), {
				ownerId: userId,
				items: itemIds,
				createdAt: new Date(),
				isPublic: isPublic,
			});
			Alert.alert("Success!", "Outfit saved to your collection.", [
				{ text: "OK", onPress: () => navigation.goBack() },
			]);
		} catch (error) {
			Alert.alert("Error", "Could not save the outfit.");
		}
	};

	// Set header buttons
	useEffect(() => {
		navigation.setOptions({
			headerRight: () => (
				<View style={{ flexDirection: "row", alignItems: "center" }}>
					<TouchableOpacity
						onPress={handleClearCanvas}
						style={styles.headerButton}
					>
						<Ionicons
							name="trash-outline"
							size={24}
							color={COLORS.subtext}
						/>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={handleSaveOutfit}
						style={styles.headerButton}
					>
						<Ionicons
							name="save-outline"
							size={24}
							color={COLORS.subtext}
						/>
					</TouchableOpacity>
				</View>
			),
		});
	}, [navigation, canvasItems]);

	// Fetch all user's items
	useEffect(() => {
		if (!userId) {
			setLoading(false);
			return;
		}
		const q = query(
			collection(db, "clothingItems"),
			where("ownerId", "==", userId)
		);
		const unsubscribe = onSnapshot(q, (querySnapshot) => {
			const itemsByCat = {};
			categories.forEach((cat) => (itemsByCat[cat] = []));
			querySnapshot.forEach((doc) => {
				const item = { id: doc.id, ...doc.data() };
				if (item.category && itemsByCat[item.category]) {
					itemsByCat[item.category].push(item);
				}
			});
			setAllItems(itemsByCat);
			setLoading(false);
		});
		return () => unsubscribe();
	}, [userId]);

	const handleAddItem = (item) => {
		const isAlreadyOnCanvas =
			canvasItems.Tops?.id === item.id ||
			canvasItems.Bottoms?.id === item.id ||
			canvasItems.Shoes?.id === item.id ||
			canvasItems.Accessories?.id === item.id;
		if (isAlreadyOnCanvas) {
			return;
		}

		setCanvasItems((prev) => {
			return { ...prev, [item.category]: item };
		});
	};

	if (loading)
		return (
			<ActivityIndicator
				style={styles.centered}
				size="large"
				color={COLORS.secondary[1]}
			/>
		);

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.canvasArea}>
				<View style={styles.mainGarmentArea}>
					<View style={styles.canvasZone}>
						{canvasItems.Tops ? (
							<DraggableItem
								itemData={canvasItems.Tops}
								onRemove={handleRemoveItem}
							/>
						) : (
							<CanvasPlaceholder
								iconName="shirt-outline"
								label="Top"
							/>
						)}
					</View>
					<View style={styles.canvasZone}>
						{canvasItems.Bottoms ? (
							<DraggableItem
								itemData={canvasItems.Bottoms}
								onRemove={handleRemoveItem}
							/>
						) : (
							<CanvasPlaceholder
								iconName="remove-outline"
								label="Bottom"
							/>
						)}
					</View>
					<View style={styles.canvasZone}>
						{canvasItems.Shoes ? (
							<DraggableItem
								itemData={canvasItems.Shoes}
								onRemove={handleRemoveItem}
							/>
						) : (
							<CanvasPlaceholder
								iconName="footsteps-outline"
								label="Shoes"
							/>
						)}
					</View>
				</View>
				<View style={styles.accessoryZone}>
					{canvasItems.Accessories ? (
						<DraggableItem
							itemData={canvasItems.Accessories}
							onRemove={handleRemoveItem}
						/>
					) : (
						<CanvasPlaceholder
							iconName="watch-outline"
							label="Accessories"
						/>
					)}
				</View>
			</View>

			<View style={styles.toggleContainer}>
				<Text style={styles.label}>Make Outfit Public</Text>
				<Switch
					trackColor={{
						false: COLORS.lightGray3,
						true: COLORS.secondary[1],
					}}
					thumbColor={COLORS.white}
					ios_backgroundColor={COLORS.lightGray3}
					onValueChange={setIsPublic}
					value={isPublic}
				/>
			</View>

			<View style={styles.trayContainer}>
				<View style={styles.categoryTabs}>
					{categories.map((cat) => (
						<TouchableOpacity
							key={cat}
							onPress={() => setActiveCategory(cat)}
						>
							<LinearGradient
								colors={
									activeCategory === cat
										? COLORS.secondary || [
												"#FFDAB9",
												"#FFA07A",
										  ]
										: [COLORS.white, COLORS.white]
								}
								style={[
									styles.tab,
									activeCategory !== cat &&
										styles.inactiveTab,
								]}
							>
								<Text
									style={[
										styles.tabText,
										activeCategory === cat
											? styles.activeTabText
											: styles.inactiveTabText,
									]}
								>
									{cat}
								</Text>
							</LinearGradient>
						</TouchableOpacity>
					))}
				</View>
				<FlatList
					horizontal
					data={allItems[activeCategory] || []}
					keyExtractor={(item) => item.id}
					renderItem={({ item }) => (
						<TouchableOpacity
							style={styles.trayItemWrapper}
							onPress={() => handleAddItem(item)}
						>
							<Image
								source={{ uri: item.imageUrl }}
								style={styles.trayItemImage}
							/>
						</TouchableOpacity>
					)}
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={{ paddingHorizontal: SIZES.padding }}
				/>
			</View>
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
	headerButton: {
		marginHorizontal: SIZES.base,
		padding: SIZES.base,
		backgroundColor: COLORS.lightGray,
		borderRadius: 20,
	},
	canvasArea: {
		flex: 1,
		flexDirection: "row",
		padding: SIZES.base,
	},
	mainGarmentArea: { flex: 2.5, justifyContent: "space-around" },
	accessoryZone: {
		flex: 1.5,
		justifyContent: "center",
		alignItems: "center",
		marginLeft: SIZES.base,
		backgroundColor: COLORS.white,
		borderRadius: SIZES.radius,
	},
	canvasZone: {
		flex: 1,
		marginVertical: SIZES.base,
		backgroundColor: COLORS.white,
		borderRadius: SIZES.radius,
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
	},
	placeholderContainer: { alignItems: "center", justifyContent: "center" },
	placeholderText: {
		...FONTS.body5,
		color: COLORS.lightGray3,
		marginTop: SIZES.base,
	},
	draggableItemContainer: {
		width: "100%",
		height: "100%",
		alignItems: "center",
		justifyContent: "center",
	},
	canvasItemImage: { width: "95%", height: "95%", resizeMode: "contain" },
	toggleContainer: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		backgroundColor: COLORS.white,
		marginHorizontal: SIZES.padding * 2,
		marginVertical: SIZES.padding,
		paddingHorizontal: SIZES.padding * 2,
		paddingVertical: SIZES.padding,
		borderRadius: SIZES.radius,
	},
	label: { ...FONTS.h4, color: COLORS.black },
	trayContainer: {
		height: 180,
		backgroundColor: COLORS.white,
		borderTopLeftRadius: SIZES.radius * 1.5,
		borderTopRightRadius: SIZES.radius * 1.5,
		paddingTop: SIZES.padding,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -5 },
		shadowOpacity: 0.05,
		shadowRadius: 10,
		elevation: 10,
	},
	categoryTabs: {
		flexDirection: "row",
		justifyContent: "space-around",
		paddingBottom: SIZES.padding,
		paddingHorizontal: SIZES.padding,
	},
	tab: {
		paddingVertical: SIZES.base,
		paddingHorizontal: SIZES.padding,
		borderRadius: 20,
	},
	inactiveTab: { borderWidth: 1, borderColor: COLORS.lightGray3 },
	tabText: { ...FONTS.body4, fontFamily: "Poppins-SemiBold" },
	activeTabText: { color: COLORS.white },
	inactiveTabText: { color: COLORS.subtext },
	trayItemWrapper: {
		width: 80,
		height: 100,
		marginHorizontal: SIZES.base / 2,
		backgroundColor: COLORS.white,
		borderRadius: SIZES.radius,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 5,
		elevation: 3,
	},
	trayItemImage: {
		width: "100%",
		height: "100%",
		borderRadius: SIZES.radius,
		resizeMode: "contain",
	},
});

export default OutfitCanvasScreen;
