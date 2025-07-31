const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

//Generate JWT Token
const generateToken = (userId) => {
	return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expireIn: "7d" });
};

//@desc    Register a new user
//@route    POST /api/auth/register
//@acces    Public
const registerUser = async (req, res) => {};

//@desc     Login user
//@route    POST /api/auth/login
//@acces    Public
const loginUser = async (req, res) => {};

//@desc     Get user profile
//@route    GET /api/auth/login
//@acces    Private (Requires JWT)
const getUserProfile = async (req, res) => {};

//@desc     Update user Profile
//@route    PUT /api/auth/profele
//@acces    Private (Requires JWT)
const updateUserProfile = async (req, res) => {};

module.exports = { registerUser, loginUser, getUserProfile, updateUserProfile };
