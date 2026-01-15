// File: screens/LoginScreen.js

import React, { useState } from "react";
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	TouchableOpacity,
	Alert,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseConfig"; // Adjust the path if necessary
import { LinearGradient } from "expo-linear-gradient";

// Import theme constants
import { COLORS, SIZES, FONTS } from "../constants/theme";

const LoginScreen = ({ navigation }) => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleLogin = () => {
		if (email !== "" && password !== "") {
			setIsLoading(true);
			signInWithEmailAndPassword(auth, email, password)
				.catch((error) => {
					Alert.alert(
						"Login Error",
						getFriendlyErrorMessage(error.code)
					);
				})
				.finally(() => {
					setIsLoading(false);
				});
		} else {
			Alert.alert(
				"Missing Information",
				"Please enter both email and password."
			);
		}
	};

	// Helper to make Firebase errors more user-friendly
	const getFriendlyErrorMessage = (code) => {
		switch (code) {
			case "auth/user-not-found":
			case "auth/wrong-password":
				return "Invalid email or password. Please try again.";
			case "auth/invalid-email":
				return "Please enter a valid email address.";
			default:
				return "An unexpected error occurred. Please try again.";
		}
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			style={styles.container}
		>
			<View style={styles.header}>
				<Text style={styles.title}>Welcome Back</Text>
				<Text style={styles.subtitle}>
					Log in to your virtual closet.
				</Text>
			</View>

			<View style={styles.formContainer}>
				<View style={styles.inputContainer}>
					<TextInput
						style={styles.input}
						placeholder="Email"
						placeholderTextColor={COLORS.subtext}
						value={email}
						onChangeText={setEmail}
						autoCapitalize="none"
						keyboardType="email-address"
						selectionColor={COLORS.primary[1]}
					/>
				</View>

				<View style={styles.inputContainer}>
					<TextInput
						style={styles.input}
						placeholder="Password"
						placeholderTextColor={COLORS.subtext}
						value={password}
						onChangeText={setPassword}
						secureTextEntry
						selectionColor={COLORS.primary[1]}
					/>
				</View>

				<TouchableOpacity
					style={styles.loginButton}
					onPress={handleLogin}
					disabled={isLoading}
				>
					<LinearGradient
						colors={COLORS.primary}
						style={styles.gradient}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
					>
						{isLoading ? (
							<ActivityIndicator
								size="small"
								color={COLORS.white}
							/>
						) : (
							<Text style={styles.buttonText}>Log In</Text>
						)}
					</LinearGradient>
				</TouchableOpacity>
			</View>

			<TouchableOpacity
				style={styles.footerButton}
				onPress={() => navigation.navigate("SignUp")}
			>
				<Text style={styles.footerText}>
					Don't have an account?{" "}
					<Text style={{ fontFamily: "Poppins-Bold" }}>Sign Up</Text>
				</Text>
			</TouchableOpacity>
		</KeyboardAvoidingView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.offWhite,
		justifyContent: "center",
		paddingHorizontal: SIZES.padding * 2,
	},
	header: {
		alignItems: "center",
		marginBottom: SIZES.padding * 4,
	},
	title: {
		...FONTS.h1,
		color: COLORS.black,
	},
	subtitle: {
		...FONTS.body3,
		color: COLORS.subtext,
		marginTop: SIZES.base,
	},
	formContainer: {
		width: "100%",
	},
	inputContainer: {
		backgroundColor: COLORS.white,
		borderRadius: SIZES.radius,
		marginBottom: SIZES.padding * 2,
		// Subtle shadow for iOS
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 4,
		},
		shadowOpacity: 0.05,
		shadowRadius: 10,
		// Subtle shadow for Android
		elevation: 5,
	},
	input: {
		...FONTS.body3,
		color: COLORS.black,
		padding: SIZES.padding * 2,
	},
	loginButton: {
		width: "100%",
		borderRadius: SIZES.radius,
		overflow: "hidden", // Important for LinearGradient border radius
		marginTop: SIZES.base,
	},
	gradient: {
		padding: SIZES.padding * 1.8,
		alignItems: "center",
		justifyContent: "center",
	},
	buttonText: {
		...FONTS.h4,
		color: COLORS.white,
	},
	footerButton: {
		marginTop: SIZES.padding * 3,
		alignItems: "center",
	},
	footerText: {
		...FONTS.body4,
		color: COLORS.subtext,
	},
});

export default LoginScreen;
