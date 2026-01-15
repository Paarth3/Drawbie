// File: constants/theme.js

import { Dimensions } from "react-native";
const { width, height } = Dimensions.get("window");

export const COLORS = {
	// base colors
	primary: ["#66D5C4", "#309281"], // A soft mint-to-teal gradient
	secondary: ["#FFDAB9", "#FFA07A"],
	tertiary: ["#A9C9FF", "#FFBBEC"],

	// colors
	black: "#333333", // A dark charcoal, not pure black
	white: "#FFFFFF",
	offWhite: "#F7F7F7", // A very light grey for backgrounds

	lightGray: "#F5F5F6",
	lightGray2: "#F6F6F7",
	lightGray3: "#EFEFF1",
	lightGray4: "#F8F8F9",
	transparent: "transparent",
	darkgray: "#898C95",
	subtext: "#808080",
};

export const SIZES = {
	// global sizes
	base: 8,
	font: 14,
	radius: 24, // Generously rounded corners
	padding: 10,
	padding2: 12,

	// font sizes
	largeTitle: 50,
	h1: 30,
	h2: 22,
	h3: 20,
	h4: 18,
	body1: 30,
	body2: 20,
	body3: 16,
	body4: 14,
	body5: 12,

	// app dimensions
	width,
	height,
};

export const FONTS = {
	largeTitle: {
		fontFamily: "Poppins-Black",
		fontSize: SIZES.largeTitle,
		lineHeight: 55,
	},
	h1: {
		fontFamily: "Poppins-Bold",
		fontSize: SIZES.h1,
		lineHeight: 36,
		color: COLORS.black,
	},
	h2: {
		fontFamily: "Poppins-Bold",
		fontSize: SIZES.h2,
		lineHeight: 30,
		color: COLORS.black,
	},
	h3: {
		fontFamily: "Poppins-SemiBold",
		fontSize: SIZES.h3,
		lineHeight: 22,
		color: COLORS.black,
	},
	h4: {
		fontFamily: "Poppins-SemiBold",
		fontSize: SIZES.h4,
		lineHeight: 22,
		color: COLORS.black,
	},
	body1: {
		fontFamily: "Poppins-Regular",
		fontSize: SIZES.body1,
		lineHeight: 36,
		color: COLORS.black,
	},
	body2: {
		fontFamily: "Poppins-Regular",
		fontSize: SIZES.body2,
		lineHeight: 30,
		color: COLORS.black,
	},
	body3: {
		fontFamily: "Poppins-Regular",
		fontSize: SIZES.body3,
		lineHeight: 22,
		color: COLORS.black,
	},
	body4: {
		fontFamily: "Poppins-Regular",
		fontSize: SIZES.body4,
		lineHeight: 22,
		color: COLORS.black,
	},
	body5: {
		fontFamily: "Poppins-Regular",
		fontSize: SIZES.body5,
		lineHeight: 22,
		color: COLORS.black,
	},
};

const appTheme = { COLORS, SIZES, FONTS };

export default appTheme;
