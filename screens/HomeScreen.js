// File: screens/HomeScreen.js

import React from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ScrollView,
	StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { dailyPrompts } from "../utils/prompts"; // Assuming this path is correct
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// Import theme constants
import { COLORS, SIZES, FONTS } from "../constants/theme";

const HomeScreen = ({ navigation }) => {
	// --- Logic to select a daily prompt ---
	const getDayOfYear = () => {
		const now = new Date();
		const start = new Date(now.getFullYear(), 0, 0);
		const diff = now - start;
		const oneDay = 1000 * 60 * 60 * 24;
		return Math.floor(diff / oneDay);
	};

	const dayIndex = getDayOfYear() % dailyPrompts.length;
	const promptOfTheDay = dailyPrompts[dayIndex];

	// --- Dynamic Greeting ---
	const getGreeting = () => {
		const hour = new Date().getHours();
		if (hour < 12) return "Good Morning";
		if (hour < 18) return "Good Afternoon";
		return "Good Evening";
	};

	// --- Formatted Date ---
	const formattedDate = new Date().toLocaleDateString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar barStyle="dark-content" />
			<ScrollView showsVerticalScrollIndicator={false}>
				{/* --- Header --- */}
				<View style={styles.header}>
					<Text style={styles.greeting}>{getGreeting()}</Text>
					<Text style={styles.date}>{formattedDate}</Text>
				</View>

				{/* --- Daily Prompt Card --- */}
				<LinearGradient
					colors={["#A9C9FF", "#FFBBEC"]} // Soft lavender to pink gradient
					style={styles.promptCard}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
				>
					<View style={styles.cardHeader}>
						<Ionicons
							name="sparkles"
							size={28}
							color={COLORS.white}
						/>
						<Text style={styles.cardTitle}>
							Today's Inspiration
						</Text>
					</View>

					<Text style={styles.promptText}>"{promptOfTheDay}"</Text>

					<TouchableOpacity
						style={styles.promptButton}
						onPress={() => navigation.navigate("OutfitCanvas")} // Changed to MyCloset, adjust if needed
					>
						<Text style={styles.promptButtonText}>
							Style Your Look
						</Text>
					</TouchableOpacity>
				</LinearGradient>

				{/* You can add more sections here in the future */}
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.offWhite,
	},
	header: {
		paddingHorizontal: SIZES.padding * 2,
		marginTop: SIZES.padding,
		marginBottom: SIZES.padding * 2,
	},
	greeting: {
		...FONTS.h1,
		color: COLORS.black,
	},
	date: {
		...FONTS.body3,
		color: COLORS.subtext,
		marginTop: SIZES.base / 2,
	},
	promptCard: {
		marginHorizontal: SIZES.padding * 2,
		borderRadius: SIZES.radius * 1.5, // Even more rounded for a statement card
		padding: SIZES.padding * 3,
		alignItems: "center",
		// Shadow for depth
		shadowColor: "#A9C9FF",
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.3,
		shadowRadius: 20,
		elevation: 15,
	},
	cardHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: SIZES.padding * 2,
	},
	cardTitle: {
		...FONTS.h3,
		color: COLORS.white,
		marginLeft: SIZES.padding,
	},
	promptText: {
		...FONTS.h2,
		fontFamily: "Poppins-Regular",
		textAlign: "center",
		color: COLORS.white,
		marginBottom: SIZES.padding * 3,
		lineHeight: 32,
	},
	promptButton: {
		backgroundColor: COLORS.white,
		paddingVertical: SIZES.padding * 1.5,
		paddingHorizontal: SIZES.padding * 4,
		borderRadius: SIZES.radius,
		// Soft shadow for the button
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 10,
		elevation: 5,
	},
	promptButtonText: {
		...FONTS.h4,
		color: "#A9C9FF", // Using the start of the gradient color for a cohesive look
	},
});

export default HomeScreen;
