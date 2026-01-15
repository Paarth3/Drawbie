// File: screens/FollowListScreen.js

import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
} from "react-native";
import {
	collection,
	query,
	getDocs,
	where,
	documentId,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

const FollowListScreen = ({ route }) => {
	const { userId, type } = route.params; // type will be 'followers' or 'following'
	const [loading, setLoading] = useState(true);
	const [usersList, setUsersList] = useState([]);
	const navigation = useNavigation();

	useEffect(() => {
		const fetchUsers = async () => {
			try {
				// 1. Fetch the list of user IDs from the subcollection (followers or following)
				const listRef = collection(db, "users", userId, type);
				const listSnapshot = await getDocs(listRef);
				const userIds = listSnapshot.docs.map((doc) => doc.id);

				if (userIds.length > 0) {
					// 2. Fetch the full user documents for those IDs
					const usersRef = collection(db, "users");
					const usersQuery = query(
						usersRef,
						where(documentId(), "in", userIds)
					);
					const usersSnapshot = await getDocs(usersQuery);

					const fetchedUsers = usersSnapshot.docs.map((doc) => ({
						uid: doc.id,
						...doc.data(),
					}));
					setUsersList(fetchedUsers);
				}
			} catch (error) {
				console.error(`Error fetching ${type}:`, error);
			} finally {
				setLoading(false);
			}
		};

		fetchUsers();
	}, [userId, type]);

	if (loading) {
		return <ActivityIndicator style={styles.centered} size="large" />;
	}

	const renderUserItem = ({ item }) => (
		<TouchableOpacity
			style={styles.userItem}
			// Navigate to the profile of the user in the list
			onPress={() => navigation.push("Profile", { userId: item.uid })}
		>
			<Ionicons name="person-circle-outline" size={40} color="#555" />
			<Text style={styles.username}>{item.username}</Text>
		</TouchableOpacity>
	);

	return (
		<FlatList
			data={usersList}
			keyExtractor={(item) => item.uid}
			renderItem={renderUserItem}
			ListEmptyComponent={() => (
				<View style={styles.centered}>
					<Text style={styles.emptyText}>No users to display.</Text>
				</View>
			)}
		/>
	);
};

const styles = StyleSheet.create({
	centered: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingTop: 50,
	},
	emptyText: { fontSize: 16, color: "gray" },
	userItem: {
		flexDirection: "row",
		alignItems: "center",
		padding: 15,
		borderBottomWidth: 1,
		borderBottomColor: "#eee",
	},
	username: {
		marginLeft: 10,
		fontSize: 16,
		fontWeight: "bold",
	},
});

export default FollowListScreen;
