// File: screens/SignUpScreen.js

import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig"; // Adjust path if necessary

const SignUpScreen = ({ navigation }) => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	const handleSignUp = async () => {
		if (email !== "" && password !== "") {
			try {
				const userCredential = await createUserWithEmailAndPassword(
					auth,
					email,
					password
				);
				const user = userCredential.user;

				// Create a user document in Firestore
				await setDoc(doc(db, "users", user.uid), {
					uid: user.uid,
					email: user.email,
					username: user.email.split("@")[0], // Default username from email
					createdAt: new Date(),
				});
			} catch (error) {
				Alert.alert("Sign Up Error", error.message);
			}
		} else {
			Alert.alert(
				"Invalid Input",
				"Please enter a valid email and password."
			);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Create Account</Text>
			<TextInput
				style={styles.input}
				placeholder="Email"
				value={email}
				onChangeText={setEmail}
				autoCapitalize="none"
				keyboardType="email-address"
			/>
			<TextInput
				style={styles.input}
				placeholder="Password"
				value={password}
				onChangeText={setPassword}
				secureTextEntry
			/>
			<Button title="Sign Up" onPress={handleSignUp} />
		</View>
	);
};

// Use similar styles as LoginScreen
const styles = StyleSheet.create({
	container: { flex: 1, justifyContent: "center", padding: 20 },
	title: {
		fontSize: 24,
		fontWeight: "bold",
		marginBottom: 20,
		textAlign: "center",
	},
	input: {
		height: 40,
		borderColor: "gray",
		borderWidth: 1,
		marginBottom: 12,
		paddingHorizontal: 10,
	},
});

export default SignUpScreen;
