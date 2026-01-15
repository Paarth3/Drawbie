// File: App.js

import {
	Poppins_400Regular,
	Poppins_600SemiBold,
	Poppins_700Bold,
	Poppins_900Black,
	useFonts,
} from "@expo-google-fonts/poppins";
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { LinearGradient } from "expo-linear-gradient";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import "./firebaseConfig";
import { auth } from "./firebaseConfig";

// Import theme constants
import { COLORS, FONTS, SIZES } from "./constants/theme";

// --- Screen Imports ---
// Ensure these files exist in your 'screens' folder!
import AddItemScreen from "./screens/AddItemScreen";
import ClosetScreen from "./screens/ClosetScreen";
import FollowListScreen from "./screens/FollowListScreen";
import HomeScreen from "./screens/HomeScreen";
import LoginScreen from "./screens/LoginScreen";
import MyOutfitsScreen from "./screens/MyOutfitsScreen";
import OutfitCanvasScreen from "./screens/OutfitCanvasScreen";
import OutfitDetailScreen from "./screens/OutfitDetailScreen";
import ProfileScreen from "./screens/ProfileScreen";
import RequestsScreen from "./screens/RequestsScreen";
import SearchScreen from "./screens/SearchScreen";
import SignUpScreen from "./screens/SignUpScreen";

const AuthStack = createStackNavigator();
const MainStack = createStackNavigator();
const Tab = createBottomTabNavigator();

// --- Global Stack Navigator Options ---
const stackOptions = {
	headerStyle: {
		backgroundColor: COLORS.offWhite,
		shadowColor: "transparent",
		elevation: 0,
	},
	headerTitleStyle: { ...FONTS.h3 },
	headerTintColor: COLORS.black,
	headerBackTitleVisible: false,
};

// --- Authentication Flow ---
const AuthNavigator = () => (
	<AuthStack.Navigator screenOptions={{ headerShown: false }}>
		<AuthStack.Screen name="Login" component={LoginScreen} />
		<AuthStack.Screen
			name="SignUp"
			component={SignUpScreen}
			options={{
				headerShown: true,
				title: "Create Account",
				...stackOptions, // Apply themed header
			}}
		/>
	</AuthStack.Navigator>
);

// --- Styled Header Profile Icon ---
const ProfileHeaderIcon = () => {
	const navigation = useNavigation();
	return (
		<TouchableOpacity
			onPress={() => navigation.navigate("Profile")}
			style={styles.headerIconContainer}
		>
			<Ionicons name="person-outline" size={24} color={COLORS.black} />
		</TouchableOpacity>
	);
};

// --- Custom Floating Tab Bar Component ---
const CustomTabBar = ({ state, descriptors, navigation }) => {
	const insets = useSafeAreaInsets();
	const onAddPress = () => navigation.navigate("AddItem");

	return (
		<View
			style={[styles.tabBarContainer, { paddingBottom: insets.bottom }]}
		>
			<View style={styles.tabBar}>
				{state.routes.map((route, index) => {
					const { options } = descriptors[route.key];
					const isFocused = state.index === index;

					const onPress = () => {
						const event = navigation.emit({
							type: "tabPress",
							target: route.key,
							canPreventDefault: true,
						});
						if (!isFocused && !event.defaultPrevented) {
							navigation.navigate(route.name);
						}
					};

					const iconName = {
						HomeTab: "home",
						SearchTab: "search",
						ClosetTab: "albums",
						MyOutfitsTab: "shirt",
					}[route.name];

					return (
						<TouchableOpacity
							key={route.key}
							onPress={onPress}
							style={styles.tabItem}
						>
							<Ionicons
								name={
									isFocused ? iconName : `${iconName}-outline`
								}
								size={28}
								color={
									isFocused
										? COLORS.primary[0]
										: COLORS.subtext
								}
							/>
						</TouchableOpacity>
					);
				})}
			</View>

			{/* Central Add Button */}
			<TouchableOpacity
				onPress={onAddPress}
				style={[
					styles.addButtonContainer,
					{ bottom: insets.bottom + 20 },
				]}
			>
				<LinearGradient
					colors={COLORS.primary}
					style={styles.addButton}
				>
					<Ionicons name="add" size={32} color={COLORS.white} />
				</LinearGradient>
			</TouchableOpacity>
		</View>
	);
};

// --- Main App Flow with Tabs ---
const TabNavigator = () => (
	<Tab.Navigator
		tabBar={(props) => <CustomTabBar {...props} />}
		screenOptions={{
			headerRight: () => <ProfileHeaderIcon />,
			...stackOptions,
			tabBarStyle: { height: 90 }, // ensures React Navigation knows tab bar height
		}}
	>
		<Tab.Screen
			name="HomeTab"
			component={HomeScreen}
			options={{ title: "Drawbie" }}
		/>
		<Tab.Screen
			name="SearchTab"
			component={SearchScreen}
			options={{ title: "Search Users" }}
		/>
		<Tab.Screen
			name="ClosetTab"
			component={ClosetScreen}
			options={{ title: "My Closet" }}
		/>
		<Tab.Screen
			name="MyOutfitsTab"
			component={MyOutfitsScreen}
			options={{ title: "My Outfits" }}
		/>
	</Tab.Navigator>
);

// --- Combining Navigators ---
const MainNavigator = () => (
	<MainStack.Navigator screenOptions={stackOptions}>
		<MainStack.Screen
			name="Back"
			component={TabNavigator}
			options={{ headerShown: false }}
		/>
		<MainStack.Screen
			name="AddItem"
			component={AddItemScreen}
			options={{ presentation: "modal", title: "Add New Item" }}
		/>
		<MainStack.Screen
			name="OutfitCanvas"
			component={OutfitCanvasScreen}
			options={{ title: "Create Outfit" }}
		/>
		<MainStack.Screen
			name="OutfitDetail"
			component={OutfitDetailScreen}
			options={{ title: "Outfit Details" }}
		/>
		<MainStack.Screen
			name="Profile"
			component={ProfileScreen}
			options={{ title: "" }}
		/>
		<MainStack.Screen
			name="Requests"
			component={RequestsScreen}
			options={{ title: "Follow Requests" }}
		/>
		<MainStack.Screen
			name="FollowList"
			component={FollowListScreen}
			options={({ route }) => ({
				title:
					route.params.type.charAt(0).toUpperCase() +
					route.params.type.slice(1),
			})}
		/>
	</MainStack.Navigator>
);

export default function App() {
	const [fontsLoaded] = useFonts({
		"Poppins-Regular": Poppins_400Regular,
		"Poppins-SemiBold": Poppins_600SemiBold,
		"Poppins-Bold": Poppins_700Bold,
		"Poppins-Black": Poppins_900Black,
	});
	const [user, setUser] = useState(null);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (currentUser) =>
			setUser(currentUser)
		);
		return () => unsubscribe();
	}, []);

	if (!fontsLoaded) {
		return <View style={{ flex: 1, backgroundColor: COLORS.offWhite }} />;
	}

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<NavigationContainer>
				{user ? <MainNavigator /> : <AuthNavigator />}
			</NavigationContainer>
		</GestureHandlerRootView>
	);
}

// --- Styles for Custom Components ---
const styles = StyleSheet.create({
	headerIconContainer: {
		marginRight: SIZES.padding,
		backgroundColor: COLORS.lightGray,
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
	},
	tabBarContainer: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		width: "100%", // <--- important
		height: 90,
		alignItems: "center",
		justifyContent: "center",
	},

	tabBar: {
		flexDirection: "row",
		width: "90%", // or '100%' to span full width
		height: 60,
		borderRadius: SIZES.radius * 1.5,
		backgroundColor: COLORS.white,
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 5 },
		shadowOpacity: 0.1,
		shadowRadius: 15,
		elevation: 10,
	},

	tabItem: {
		flex: 1,
		height: "100%",
		justifyContent: "center",
		alignItems: "center",
	},
	addButtonContainer: {
		top: -20, // Lifts the button up
		justifyContent: "center",
		alignItems: "center",
		width: 70,
		height: 70,
		borderRadius: 35,
		shadowColor: COLORS.primary[0],
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.3,
		shadowRadius: 10,
		elevation: 12,
	},
	addButton: {
		width: 64,
		height: 64,
		borderRadius: 32,
		justifyContent: "center",
		alignItems: "center",
	},
});
