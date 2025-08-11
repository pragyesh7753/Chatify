import FriendRequest from "../models/FriendRequest.js";
import User from "../models/User.js";

export async function getRecommendedUsers(req, res) {
    try {
        const currentUserId = req.user.id;
        const currentUser = req.user;

        // Fetch users who are not the current user, not already friends, and are onboarded
        const recommendedUsers = await User.find({
            $and: [
                { _id: { $ne: currentUserId } }, // (_id is not equal to current User iD) => Exclude current user
                { $id: { $nin: currentUser.friends } }, // Exclude users who are already friends
                { isOnboarded: true } // Only include users who are onboarded
            ]
        })
        res.status(200).json({ recommendedUsers });
    } catch (error) {
        console.error("Error in getRecommendedUsers controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function getMyFriends(req, res) {
    try {
        const user = await User.findById(req.user.id).select("friends")
            .populate("friends", "fullName profilePicture nativeLanguage learningLanguage");

        res.status(200).json(user.friends);
    } catch (error) {
        console.error("Error in getMyFriends controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function sendFriendRequest(req, res) {
    try {
        const myId = req.user.id;
        const { id: recipientId } = req.params;

        // Prevent sending request to yourself
        if (myId === recipientId) {
            return res.status(400).json({ message: "You can't send a friend request to yourself." });
        }

        // Check if the recipient exists
        const recipient = await User.findById(recipientId);
        if (!recipient) {
            return res.status(404).json({ message: "Recipient not found." });
        }

        // Check if the recipient is already a friend
        if (recipient.friends.includes(myId)) {
            return res.status(400).json({ message: "You are already friends with this user." });
        }

        // Check if a request already exists
        const existingRequest = await FriendRequest.findOne({
            $or: [
                { sender: myId, recipient: recipientId },
                { sender: recipientId, recipient: myId }
            ]
        });

        if (existingRequest) {
            return res.status(400).json({ message: "A friend request already exists between you and this user." });
        }

        // If all checks are done, Create a new friend request
        const friendRequest = await FriendRequest.create({
            sender: myId,
            recipient: recipientId
        })

        res.status(201).json({
            message: "Friend request sent successfully.",
            friendRequest
        });
    } catch (error) {
        console.error("Error in sendFriendRequest controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}