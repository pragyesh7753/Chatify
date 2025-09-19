import { axiosInstance } from "./axios";

export const signup = async (signupData) => {
  const response = await axiosInstance.post("/auth/signup", signupData);
  return response.data;
};

export const verifyEmail = async (token) => {
  try {
    const response = await axiosInstance.get(`/auth/verify-email/${token}`);
    console.log("Verify email response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Verify email API error:", error.response?.data || error.message);
    throw error;
  }
};

export const resendVerificationEmail = async (email) => {
  const response = await axiosInstance.post("/auth/resend-verification", { email });
  return response.data;
};

export const login = async (loginData) => {
  try {
    const response = await axiosInstance.post("/auth/login", loginData);
    return response.data;
  } catch (error) {
    console.error("Login error:", error.response?.data || error.message);
    throw error;
  }
};
export const logout = async () => {
  const response = await axiosInstance.post("/auth/logout");
  return response.data;
};

export const getAuthUser = async () => {
  try {
    const res = await axiosInstance.get("/auth/me");
    return res.data;
  } catch (error) {
    console.log("Error in getAuthUser:", error);
    return null;
  }
};

export const completeOnboarding = async (userData) => {
  const formData = new FormData();
  
  // Add all form fields to FormData
  Object.keys(userData).forEach(key => {
    if (userData[key] !== null && userData[key] !== undefined) {
      formData.append(key, userData[key]);
    }
  });
  
  const response = await axiosInstance.post("/auth/onboarding", formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export async function getUserFriends() {
  const response = await axiosInstance.get("/users/friends");
  return response.data;
}

export async function getRecommendedUsers() {
  const response = await axiosInstance.get("/users");
  return response.data;
}

export async function getOutgoingFriendReqs() {
  const response = await axiosInstance.get("/users/outgoing-friend-requests");
  return response.data;
}

export async function sendFriendRequest(userId) {
  const response = await axiosInstance.post(`/users/friend-request/${userId}`);
  return response.data;
}

export async function getFriendRequests() {
  const response = await axiosInstance.get("/users/friend-requests");
  return response.data;
}

export async function acceptFriendRequest(requestId) {
  const response = await axiosInstance.put(`/users/friend-request/${requestId}/accept`);
  return response.data;
}

export async function getStreamToken() {
  const response = await axiosInstance.get("/chat/token");
  return response.data;
}

export async function getUserProfile() {
  const response = await axiosInstance.get("/users/profile");
  return response.data;
}

export async function updateUserProfile(profileData) {
  const formData = new FormData();
  
  // Add all form fields to FormData
  Object.keys(profileData).forEach(key => {
    if (profileData[key] !== null && profileData[key] !== undefined) {
      formData.append(key, profileData[key]);
    }
  });
  
  const response = await axiosInstance.put("/users/profile", formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export async function requestEmailChange(newEmail) {
  const response = await axiosInstance.post("/users/change-email", { newEmail });
  return response.data;
}

export async function verifyEmailChange(token) {
  try {
    const response = await axiosInstance.get(`/auth/verify-email-change/${token}`);
    return response.data;
  } catch (error) {
    console.error("Verify email change API error:", error.response?.data || error.message);
    throw error;
  }
}

export async function resendEmailVerification() {
  const response = await axiosInstance.post("/users/verify-email");
  return response.data;
}

export const forgotPassword = async (email) => {
  const response = await axiosInstance.post("/auth/forgot-password", { email });
  return response.data;
};

export const resetPassword = async (token, password) => {
  const response = await axiosInstance.post(`/auth/reset-password/${token}`, { password });
  return response.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await axiosInstance.post("/auth/change-password", { currentPassword, newPassword });
  return response.data;
};
