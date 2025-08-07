export async function signup(req, res) {
    const { email, password, fullName } = req.body

    try {
        if(!email || !password || !fullName) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 6 characters long" });
        }

        
    } catch (error) {
        
    }
}

export async function login(req, res) {
    res.send("Login route");
}

export function logout(req, res) {
    res.send("Logout route");
}