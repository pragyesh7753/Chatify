import User from "../models/User.js";
import jwt from "jsonwebtoken";

export async function signup(req, res) {
    const { email, password, fullName } = req.body

    try {
        if (!email || !password || !fullName) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters long" });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists, please use a different one" });
        }

        const idx = Math.floor(Math.random() * 100) + 1  //Generate a  random number between 1 and 100
        const randomAvatar = `https://avatar.iran.liara.run/public/${idx}.png`

        const newUser = await User.create({
            email,
            fullName,
            password,
            profilePic: randomAvatar
        });

        // TODO:  CREATE THE USER IN STREAM AS WELL

        const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET_KEY, { expiresIn: '7d' });

        res.cookie("jwt", token, {
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            httpOnly: true, // Prevent XSS attacks
            sameSite: 'strict', // Prevent CSRF attacks
            secure: process.env.NODE_ENV === 'production' // Use secure cookies in production
        })

        res.status(201).json({ success: true, user: newUser })
    } catch (error) {
        console.log("Error in signup controller:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function login(req, res) {
    res.send("Login route");
}

export function logout(req, res) {
    res.send("Logout route");
}