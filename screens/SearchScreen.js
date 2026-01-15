// File: screens/SearchScreen.js

import React, { useState } from "react";
import {
	View,
	Text,
	TextInput,
	FlatList,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

// Import theme constants
import { COLORS, SIZES, FONTS } from "../constants/theme";

const SearchScreen = ({ navigation }) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(false);
	const [hasSearched, setHasSearched] = useState(false);

	// Your search logic is solid and remains unchanged
	const handleSearch = async (text) => {
		setSearchQuery(text);
		if (text.trim().length === 0) {
			setUsers([]);
			setHasSearched(false);
			return;
		}

		setLoading(true);
		setHasSearched(true);
		try {
			const usersRef = collection(db, "users");
			const q = query(
				usersRef,
				where("username", ">=", text.toLowerCase()),
				where("username", "<=", text.toLowerCase() + "\uf8ff"),
				limit(10)
			);
			const querySnapshot = await getDocs(q);
			const results = querySnapshot.docs.map((doc) => ({
				uid: doc.id,
				...doc.data(),
			}));
			setUsers(results);
		} catch (error) {
			console.error("Error searching users:", error);
		} finally {
			setLoading(false);
		}
	};

	const renderUserItem = ({ item }) => (
		<TouchableOpacity
			style={styles.resultItem}
			onPress={() => navigation.navigate("Profile", { userId: item.uid })}
		>
			<Ionicons
				name="person-circle-outline"
				size={44}
				color={COLORS.tertiary[0]}
			/>
			<Text style={styles.username}>{item.username}</Text>
			<Ionicons
				name="chevron-forward"
				size={22}
				color={COLORS.lightGray3}
				style={styles.chevron}
			/>
		</TouchableOpacity>
	);

	// A richer empty/initial state component
	const renderEmptyState = () => {
		if (loading) {
			return (
				<ActivityIndicator
					style={{ marginTop: SIZES.padding * 2 }}
					color={COLORS.primary[0]}
				/>
			);
		}

		if (hasSearched) {
			return (
				<View style={styles.emptyContainer}>
					<Ionicons
						name="sad-outline"
						size={60}
						color={COLORS.lightGray3}
					/>
					<Text style={styles.emptyTitle}>No Results Found</Text>
					<Text style={styles.emptySubtitle}>
						No users found for "{searchQuery}". Try a different
						name.
					</Text>
				</View>
			);
		}

		return (
			<View style={styles.emptyContainer}>
				<Ionicons
					name="search-circle-outline"
					size={60}
					color={COLORS.lightGray3}
				/>
				<Text style={styles.emptyTitle}>Find Your Friends</Text>
				<Text style={styles.emptySubtitle}>
					Search for other users by their username to connect with
					them.
				</Text>
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.container}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={{ flex: 1 }}
			>
				<View style={styles.searchBarContainer}>
					<Ionicons
						name="search-outline"
						size={22}
						color={COLORS.subtext}
					/>
					<TextInput
						style={styles.searchInput}
						placeholder="Search users..."
						placeholderTextColor={COLORS.subtext}
						value={searchQuery}
						onChangeText={handleSearch}
						autoCapitalize="none"
						selectionColor={COLORS.primary[1]}
					/>
				</View>

				<FlatList
					data={users}
					keyExtractor={(item) => item.uid}
					renderItem={renderUserItem}
					contentContainerStyle={styles.listContainer}
					ListEmptyComponent={renderEmptyState}
				/>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COLORS.offWhite },
	searchBarContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: COLORS.white,
		borderRadius: SIZES.radius,
		margin: SIZES.padding,
		paddingHorizontal: SIZES.padding * 1.5,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.05,
		shadowRadius: 10,
		elevation: 5,
	},
	searchInput: {
		flex: 1,
		height: 50,
		...FONTS.body3,
		marginLeft: SIZES.base,
		color: COLORS.black,
	},
	listContainer: {
		paddingHorizontal: SIZES.padding,
		paddingTop: SIZES.base,
	},
	resultItem: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: COLORS.white,
		padding: SIZES.padding,
		borderRadius: SIZES.radius,
		marginBottom: SIZES.padding,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 5,
		elevation: 3,
	},
	username: {
		flex: 1,
		...FONTS.h4,
		marginLeft: SIZES.padding,
	},
	chevron: {
		opacity: 0.8,
	},
	emptyContainer: {
		flex: 1,
		marginTop: SIZES.height / 6,
		alignItems: "center",
		paddingHorizontal: SIZES.padding * 3,
	},
	emptyTitle: {
		...FONTS.h2,
		marginTop: SIZES.padding,
		marginBottom: SIZES.base,
		textAlign: "center",
	},
	emptySubtitle: {
		...FONTS.body3,
		color: COLORS.subtext,
		textAlign: "center",
	},
});

export default SearchScreen;
