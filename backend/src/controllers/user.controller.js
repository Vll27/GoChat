import User from "../models/User.js";

export const getUserLastSeen = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select("lastSeen lastSeenStatus fullName");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.status(200).json({
      userId: user._id,
      lastSeen: user.lastSeen,
      status: user.lastSeenStatus,
      fullName: user.fullName
    });
  } catch (error) {
    console.error("Error getting lastSeen:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateUserLastSeen = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const user = await User.findByIdAndUpdate(
      userId,
      {
        lastSeen: new Date(),
        lastSeenStatus: req.body.status || "online"
      },
      { new: true }
    ).select("lastSeen lastSeenStatus");
    
    res.status(200).json(user);
  } catch (error) {
    console.error("Error updating lastSeen:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};