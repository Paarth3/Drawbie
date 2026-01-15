// File: screens/EmailVerificationScreen.js

import React, { useState } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Alert,
	ActivityIndicator,
} from "react-native";
import { sendEmailVerification, reload } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

const EmailVerificationScreen = ({ navigation, route }) => {
	const [isResending, setIsResending] = useState(false);
	const [isCheckingVerification, setIsCheckingVerification] = useState(false);
	const { email } = route.params;

	const handleResendEmail = async () => {
		setIsResending(true);
		try {
			const user = auth.currentUser;
			if (user) {
				await sendEmailVerification(user);
				Alert.alert(
					"Email Sent",
					"Verification email has been sent again. Please check your inbox."
				);
			}
		} catch (error) {
			Alert.alert(
				"Error",
				"Failed to resend verification email. Please try again."
			);
		} finally {
			setIsResending(false);
		}
	};

	const checkEmailVerification = async () => {
		setIsCheckingVerification(true);
		try {
			const user = auth.currentUser;
			if (user) {
				// Reload user to get updated verification status
				await reload(user);

				if (user.emailVerified) {
					// Update Firestore document to mark email as verified
					await updateDoc(doc(db, "users", user.uid), {
						emailVerified: true,
					});

					Alert.alert(
						"Email Verified!",
						"Your email has been successfully verified.",
						[
							{
								text: "Continue",
								onPress: () => navigation.navigate("Login"),
							},
						]
					);
				} else {
					Alert.alert(
						"Not Verified Yet",
						"Your email is not verified yet. Please check your inbox and click the verification link."
					);
				}
			}
		} catch (error) {
			Alert.alert(
				"Error",
				"Failed to check verification status. Please try again."
			);
		} finally {
			setIsCheckingVerification(false);
		}
	};

	const changeEmail = () => {
		Alert.alert(
			"Change Email",
			"To change your email address, you'll need to create a new account. Your current account will remain unverified.",
			[
				{
					text: "Cancel",
					style: "cancel",
				},
				{
					text: "Create New Account",
					onPress: () => navigation.navigate("SignUp"),
				},
			]
		);
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Verify Your Email</Text>

			<Text style={styles.subtitle}>
				We've sent a verification link to:
			</Text>

			<Text style={styles.email}>{email}</Text>

			<Text style={styles.instructions}>
				Please check your inbox and click the verification link to
				activate your account.
			</Text>

			<TouchableOpacity
				style={styles.primaryButton}
				onPress={checkEmailVerification}
				disabled={isCheckingVerification}
			>
				{isCheckingVerification ? (
					<ActivityIndicator color="#fff" />
				) : (
					<Text style={styles.primaryButtonText}>
						I've Verified My Email
					</Text>
				)}
			</TouchableOpacity>

			<TouchableOpacity
				style={styles.secondaryButton}
				onPress={handleResendEmail}
				disabled={isResending}
			>
				{isResending ? (
					<ActivityIndicator color="#007AFF" />
				) : (
					<Text style={styles.secondaryButtonText}>
						Resend Verification Email
					</Text>
				)}
			</TouchableOpacity>

			<TouchableOpacity style={styles.linkButton} onPress={changeEmail}>
				<Text style={styles.linkText}>Wrong email? Change it</Text>
			</TouchableOpacity>

			<TouchableOpacity
				style={styles.linkButton}
				onPress={() => navigation.navigate("Login")}
			>
				<Text style={styles.linkText}>Back to Login</Text>
			</TouchableOpacity>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		padding: 20,
		backgroundColor: "#f5f5f5",
	},
	title: {
		fontSize: 28,
		fontWeight: "bold",
		marginBottom: 20,
		textAlign: "center",
		color: "#333",
	},
	subtitle: {
		fontSize: 16,
		textAlign: "center",
		marginBottom: 10,
		color: "#666",
	},
	email: {
		fontSize: 18,
		fontWeight: "bold",
		textAlign: "center",
		marginBottom: 20,
		color: "#007AFF",
	},
	instructions: {
		fontSize: 16,
		textAlign: "center",
		marginBottom: 30,
		color: "#666",
		lineHeight: 22,
	},
	primaryButton: {
		backgroundColor: "#007AFF",
		padding: 15,
		borderRadius: 8,
		marginBottom: 15,
		alignItems: "center",
	},
	primaryButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "bold",
	},
	secondaryButton: {
		backgroundColor: "#fff",
		padding: 15,
		borderRadius: 8,
		marginBottom: 15,
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#007AFF",
	},
	secondaryButtonText: {
		color: "#007AFF",
		fontSize: 16,
		fontWeight: "bold",
	},
	linkButton: {
		padding: 10,
		alignItems: "center",
	},
	linkText: {
		color: "#007AFF",
		fontSize: 16,
	},
});

export default EmailVerificationScreen;
