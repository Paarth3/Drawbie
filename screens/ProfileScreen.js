// File: screens/ProfileScreen.js

import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
	FlatList,
	Image,
	ScrollView,
} from "react-native";
import {
	doc,
	getDoc,
	setDoc,
	deleteDoc,
	collection,
	query,
	where,
	getCountFromServer,
	onSnapshot,
	serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

// Import theme constants
import { COLORS, SIZES, FONTS } from "../constants/theme";

// --- Reusable Stat Component ---
const StatBox = ({ count, label, onPress }) => (
	<TouchableOpacity
		style={styles.statBox}
		disabled={!onPress}
		onPress={onPress}
	>
		<Text style={styles.statCount}>{count}</Text>
		<Text style={styles.statLabel}>{label}</Text>
	</TouchableOpacity>
);

// --- Main Profile Screen Component ---
const ProfileScreen = ({ route }) => {
	const navigation = useNavigation();
	const [loading, setLoading] = useState(true);
	const [profileData, setProfileData] = useState(null);
	const [publicItems, setPublicItems] = useState([]);
	const [contentLoading, setContentLoading] = useState(true);
	const [followStatus, setFollowStatus] = useState("loading");
	const [requestCount, setRequestCount] = useState(0);

	const currentUser = auth.currentUser;
	const displayedUserId = route.params?.userId || currentUser.uid;
	const isOwnProfile = displayedUserId === currentUser.uid;

	// --- All useEffect hooks for data fetching are preserved from your original code ---
	// --- This complex logic remains unchanged ---
	useEffect(() => {
		const fetchBaseData = async () => {
			setLoading(true);
			try {
				const userDocRef = doc(db, "users", displayedUserId);
				const itemsQuery = query(
					collection(db, "clothingItems"),
					where("ownerId", "==", displayedUserId)
				);
				const outfitsQuery = query(
					collection(db, "outfits"),
					where("ownerId", "==", displayedUserId)
				);
				const followersQuery = query(
					collection(db, "users", displayedUserId, "followers")
				);
				const followingQuery = query(
					collection(db, "users", displayedUserId, "following")
				);

				const [
					userDocSnap,
					itemsSnapshot,
					outfitsSnapshot,
					followersSnapshot,
					followingSnapshot,
				] = await Promise.all([
					getDoc(userDocRef),
					getCountFromServer(itemsQuery),
					getCountFromServer(outfitsQuery),
					getCountFromServer(followersQuery),
					getCountFromServer(followingQuery),
				]);

				if (!userDocSnap.exists()) {
					Alert.alert("Error", "User not found.");
					return;
				}

				setProfileData({
					...userDocSnap.data(),
					itemCount: itemsSnapshot.data().count,
					outfitCount: outfitsSnapshot.data().count,
					followerCount: followersSnapshot.data().count,
					followingCount: followingSnapshot.data().count,
				});

				if (isOwnProfile) {
					setFollowStatus("own_profile");
				} else {
					const followingRef = doc(
						db,
						"users",
						currentUser.uid,
						"following",
						displayedUserId
					);
					const requestRef = doc(
						db,
						"users",
						displayedUserId,
						"followRequests",
						currentUser.uid
					);
					const [followingSnap, requestSnap] = await Promise.all([
						getDoc(followingRef),
						getDoc(requestRef),
					]);
					if (followingSnap.exists()) setFollowStatus("following");
					else if (requestSnap.exists()) setFollowStatus("requested");
					else setFollowStatus("not_following");
				}
			} catch (error) {
				console.error("Error fetching profile base data:", error);
			} finally {
				setLoading(false);
			}
		};
		fetchBaseData();
	}, [displayedUserId, currentUser.uid]);

	useEffect(() => {
		if (followStatus === "following" || isOwnProfile) {
			setContentLoading(true);
			const q = query(
				collection(db, "clothingItems"),
				where("ownerId", "==", displayedUserId),
				where("isPublic", "==", true)
			);
			const unsubscribe = onSnapshot(q, (snapshot) => {
				const items = snapshot.docs.map((doc) => ({
					id: doc.id,
					...doc.data(),
				}));
				setPublicItems(items);
				setContentLoading(false);
			});
			return () => unsubscribe();
		} else {
			setPublicItems([]);
			setContentLoading(false);
		}

		if (isOwnProfile) {
			const requestsRef = collection(
				db,
				"users",
				currentUser.uid,
				"followRequests"
			);
			const unsubscribeRequests = onSnapshot(requestsRef, (snapshot) =>
				setRequestCount(snapshot.size)
			);
			return () => unsubscribeRequests();
		}
	}, [followStatus, isOwnProfile, displayedUserId]);

	// --- All action handler functions are also preserved ---
	const handleFollow = async () => {
		setFollowStatus("requested");
		const requestRef = doc(
			db,
			"users",
			displayedUserId,
			"followRequests",
			currentUser.uid
		);
		await setDoc(requestRef, { requestedAt: serverTimestamp() });
	};

	const handleUnfollow = async () => {
		Alert.alert(
			"Unfollow",
			`Are you sure you want to unfollow ${profileData.username}?`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Unfollow",
					style: "destructive",
					onPress: async () => {
						setFollowStatus("not_following");
						const followingRef = doc(
							db,
							"users",
							currentUser.uid,
							"following",
							displayedUserId
						);
						const followerRef = doc(
							db,
							"users",
							displayedUserId,
							"followers",
							currentUser.uid
						);
						await deleteDoc(followingRef);
						await deleteDoc(followerRef);
					},
				},
			]
		);
	};

	// --- Render Logic ---
	const renderActionButtons = () => {
		if (isOwnProfile) {
			return (
				<View style={styles.buttonRow}>
					<TouchableOpacity
						style={styles.secondaryButton}
						onPress={() => navigation.navigate("Requests")}
					>
						<Text style={styles.secondaryButtonText}>
							Follow Requests
						</Text>
						{requestCount > 0 && (
							<View style={styles.requestCountBadge}>
								<Text style={styles.requestCountText}>
									{requestCount}
								</Text>
							</View>
						)}
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.logoutButton}
						onPress={() => auth.signOut()}
					>
						<Text style={styles.primaryButtonText}>Log Out</Text>
					</TouchableOpacity>
				</View>
			);
		}
		switch (followStatus) {
			case "following":
				return (
					<TouchableOpacity
						style={styles.secondaryButton}
						onPress={handleUnfollow}
					>
						<Text style={styles.secondaryButtonText}>
							Following
						</Text>
					</TouchableOpacity>
				);
			case "requested":
				return (
					<TouchableOpacity style={styles.secondaryButton} disabled>
						<Text style={styles.secondaryButtonText}>
							Requested
						</Text>
					</TouchableOpacity>
				);
			case "not_following":
				return (
					<TouchableOpacity onPress={handleFollow}>
						<LinearGradient
							colors={COLORS.secondary || ["#FFDAB9", "#FFA07A"]}
							style={styles.primaryButton}
						>
							<Text style={styles.primaryButtonText}>Follow</Text>
						</LinearGradient>
					</TouchableOpacity>
				);
			default:
				return <ActivityIndicator color={COLORS.primary[0]} />;
		}
	};

	if (loading || !profileData) {
		return (
			<ActivityIndicator
				style={styles.centered}
				size="large"
				color={COLORS.primary[0]}
			/>
		);
	}

	const renderContent = () => {
		if (contentLoading) {
			return (
				<ActivityIndicator
					style={{ marginTop: SIZES.padding * 2 }}
					color={COLORS.primary[0]}
				/>
			);
		}
		if (isOwnProfile || followStatus === "following") {
			return (
				<FlatList
					data={publicItems}
					keyExtractor={(item) => item.id}
					numColumns={3}
					scrollEnabled={false} // The parent ScrollView handles scrolling
					ListEmptyComponent={
						<Text style={styles.privateText}>
							No public items yet.
						</Text>
					}
					renderItem={({ item }) => (
						<View style={styles.itemContainer}>
							<Image
								source={{ uri: item.imageUrl }}
								style={styles.itemImage}
							/>
						</View>
					)}
				/>
			);
		}
		return (
			<View style={styles.privateContainer}>
				<Ionicons
					name="lock-closed-outline"
					size={40}
					color={COLORS.lightGray3}
				/>
				<Text style={styles.privateTitle}>This Closet is Private</Text>
				<Text style={styles.privateText}>
					Follow this user to see their public items.
				</Text>
			</View>
		);
	};

	return (
		<SafeAreaView
			style={styles.container}
			edges={["left", "right", "bottom"]}
		>
			<ScrollView showsVerticalScrollIndicator={false}>
				<View style={styles.profileCard}>
					<View style={styles.avatarContainer}>
						<Ionicons
							name="person-circle"
							size={90}
							color={COLORS.lightGray3}
						/>
					</View>
					<Text style={styles.username}>{profileData.username}</Text>

					<View style={styles.statsContainer}>
						<StatBox count={profileData.itemCount} label="Items" />
						<StatBox
							count={profileData.outfitCount}
							label="Outfits"
						/>
						<StatBox
							count={profileData.followerCount}
							label="Followers"
							onPress={
								isOwnProfile
									? () =>
											navigation.navigate("FollowList", {
												userId: displayedUserId,
												type: "followers",
											})
									: null
							}
						/>
						<StatBox
							count={profileData.followingCount}
							label="Following"
							onPress={
								isOwnProfile
									? () =>
											navigation.navigate("FollowList", {
												userId: displayedUserId,
												type: "following",
											})
									: null
							}
						/>
					</View>

					<View style={styles.buttonContainer}>
						{renderActionButtons()}
					</View>
				</View>

				{renderContent()}
			</ScrollView>
		</SafeAreaView>
	);
};

// --- Styles ---
const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COLORS.offWhite },
	centered: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: COLORS.offWhite,
	},
	profileCard: {
		backgroundColor: COLORS.white,
		borderRadius: SIZES.radius * 1.5,
		margin: SIZES.padding,
		padding: SIZES.padding * 2,
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 5 },
		shadowOpacity: 0.08,
		shadowRadius: 15,
		elevation: 10,
	},
	avatarContainer: {
		width: 100,
		height: 100,
		borderRadius: 50,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: SIZES.base,
	},
	username: { ...FONTS.h2, marginBottom: SIZES.padding },
	statsContainer: {
		flexDirection: "row",
		justifyContent: "space-around",
		width: "100%",
		marginBottom: SIZES.padding * 2,
	},
	statBox: { alignItems: "center" },
	statCount: { ...FONTS.h3 },
	statLabel: { ...FONTS.body5, color: COLORS.subtext },
	buttonContainer: { width: "100%" },
	buttonRow: { flexDirection: "row", gap: SIZES.base, width: "100%" },
	primaryButton: {
		flex: 1,
		paddingVertical: SIZES.padding * 1.2,
		borderRadius: SIZES.radius,
		alignItems: "center",
		justifyContent: "center",
	},
	primaryButtonText: { ...FONTS.h4, color: COLORS.white },
	secondaryButton: {
		flex: 1,
		flexDirection: "row",
		paddingVertical: SIZES.padding * 1.2,
		borderRadius: SIZES.radius,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: COLORS.lightGray,
	},
	secondaryButtonText: { ...FONTS.h4, color: COLORS.black },
	logoutButton: {
		flex: 1,
		paddingVertical: SIZES.padding * 1.2,
		borderRadius: SIZES.radius,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#FF6B6B",
	},
	requestCountBadge: {
		backgroundColor: COLORS.primary[0],
		borderRadius: 10,
		width: 20,
		height: 20,
		justifyContent: "center",
		alignItems: "center",
		marginLeft: SIZES.base,
	},
	requestCountText: {
		...FONTS.body5,
		color: "white",
		fontFamily: "Poppins-Bold",
	},
	itemContainer: {
		flex: 1 / 3,
		aspectRatio: 1,
		padding: SIZES.base / 2,
	},
	itemImage: {
		width: "100%",
		height: "100%",
		resizeMode: "contain",
		backgroundColor: COLORS.white,
		borderRadius: SIZES.radius,
	},
	privateContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		margin: SIZES.padding,
		paddingVertical: SIZES.padding * 4,
		borderRadius: SIZES.radius * 1.5,
		borderWidth: 2,
		borderColor: COLORS.lightGray3,
		borderStyle: "dashed",
	},
	privateTitle: { ...FONTS.h3, marginTop: SIZES.padding },
	privateText: {
		...FONTS.body4,
		color: "gray",
		marginTop: SIZES.base,
		textAlign: "center",
	},
});

export default ProfileScreen;
