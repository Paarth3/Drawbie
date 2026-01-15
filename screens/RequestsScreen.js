// File: screens/RequestsScreen.js

import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	Alert,
} from "react-native";
import {
	collection,
	query,
	onSnapshot,
	getDocs,
	where,
	documentId,
	writeBatch,
	doc,
	deleteDoc,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { Ionicons } from "@expo/vector-icons";

const RequestsScreen = () => {
	const [loading, setLoading] = useState(true);
	const [requests, setRequests] = useState([]);
	const currentUser = auth.currentUser;

	useEffect(() => {
		if (!currentUser) return;

		// Listen for real-time updates to the followRequests subcollection
		const requestsRef = collection(
			db,
			"users",
			currentUser.uid,
			"followRequests"
		);
		const unsubscribe = onSnapshot(requestsRef, async (snapshot) => {
			const requestIds = snapshot.docs.map((doc) => doc.id);

			if (requestIds.length > 0) {
				// Fetch the user details for each requester ID
				const usersRef = collection(db, "users");
				const usersQuery = query(
					usersRef,
					where(documentId(), "in", requestIds)
				);
				const userDocs = await getDocs(usersQuery);

				const requestsData = userDocs.docs.map((doc) => ({
					uid: doc.id,
					...doc.data(),
				}));
				setRequests(requestsData);
			} else {
				setRequests([]); // No requests
			}
			setLoading(false);
		});

		return () => unsubscribe(); // Cleanup listener on unmount
	}, [currentUser]);

	const handleAccept = async (requesterId) => {
		try {
			// Use a batched write for atomicity
			const batch = writeBatch(db);

			// 1. Add to current user's 'followers'
			const followerRef = doc(
				db,
				"users",
				currentUser.uid,
				"followers",
				requesterId
			);
			batch.set(followerRef, { followedAt: new Date() });

			// 2. Add to requester's 'following'
			const followingRef = doc(
				db,
				"users",
				requesterId,
				"following",
				currentUser.uid
			);
			batch.set(followingRef, { followingSince: new Date() });

			// 3. Delete the follow request
			const requestRef = doc(
				db,
				"users",
				currentUser.uid,
				"followRequests",
				requesterId
			);
			batch.delete(requestRef);

			// Commit the batch
			await batch.commit();
		} catch (error) {
			console.error("Error accepting request: ", error);
			Alert.alert("Error", "Could not process the request.");
		}
	};

	const handleDecline = async (requesterId) => {
		try {
			const batch = writeBatch(db);

			const requestRef = doc(
				db,
				"users",
				currentUser.uid,
				"followRequests",
				requesterId
			);

			batch.delete(requestRef);

			await batch.commit();
		} catch (error) {
			console.error("Error declining request: ", error);
			Alert.alert("Error", "Could not decline the request.");
		}
	};

	if (loading) {
		return <ActivityIndicator style={styles.centered} size="large" />;
	}

	return (
		<FlatList
			data={requests}
			keyExtractor={(item) => item.uid}
			ListEmptyComponent={() => (
				<View style={styles.centered}>
					<Text style={styles.emptyText}>No follow requests</Text>
				</View>
			)}
			renderItem={({ item }) => (
				<View style={styles.requestItem}>
					<Ionicons
						name="person-circle-outline"
						size={40}
						color="#555"
					/>
					<Text style={styles.username}>{item.username}</Text>
					<View style={styles.buttonContainer}>
						<TouchableOpacity
							style={[styles.button, styles.acceptButton]}
							onPress={() => handleAccept(item.uid)}
						>
							<Text style={styles.buttonText}>Accept</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.button, styles.declineButton]}
							onPress={() => handleDecline(item.uid)}
						>
							<Text style={styles.buttonText}>Decline</Text>
						</TouchableOpacity>
					</View>
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
	requestItem: {
		flexDirection: "row",
		alignItems: "center",
		padding: 15,
		borderBottomWidth: 1,
		borderBottomColor: "#eee",
	},
	username: {
		flex: 1,
		marginLeft: 10,
		fontSize: 16,
		fontWeight: "bold",
	},
	buttonContainer: {
		flexDirection: "row",
	},
	button: {
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 5,
		marginLeft: 10,
	},
	buttonText: {
		color: "white",
		fontWeight: "bold",
		fontSize: 14,
	},
	acceptButton: { backgroundColor: "#007AFF" },
	declineButton: { backgroundColor: "#FF3B30" },
});

export default RequestsScreen;
