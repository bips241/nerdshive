'use client'
import React, { useState, useEffect } from "react";
import { toast } from "sonner"; // Import toast from sonner

interface FollowButtonProps {
    name: string;
    followerId: string;
}

const FollowButton: React.FC<FollowButtonProps> = ({ name, followerId }) => {
    const [isFollowing, setIsFollowing] = useState(false); // State to track follow status
    const [loading, setLoading] = useState(true); // State to track loading status

    useEffect(() => {
        const fetchFollowStatus = async () => {
            try {
                const response = await fetch(`/api/follow/status/${name}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ followerId }),
                });
                if (response.ok) {
                    const data = await response.json();
                    setIsFollowing(data.isFollowing); // Set initial follow status
                } else {
                    toast.error("Failed to fetch follow status");
                }
            } catch (error) {
                toast.error("Error fetching follow status");
                console.error("Error fetching follow status:", error);
            } finally {
                setLoading(false); // Stop loading
            }
        };

        fetchFollowStatus();
    }, [name]);

    const handleFollow = async () => {
        try {
            const response = await fetch(`/api/follow/${name}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ followerId }),
            });
            if (response.ok) {
                setIsFollowing(true); // Update state to reflect following status
                toast.success("You are now following!"); // Show success notification
            } else {
                toast.error("Failed to send follow request"); // Show error notification
            }
        } catch (error) {
            toast.error("Error sending follow request"); // Show error notification
            console.error("Error sending follow request:", error);
        }
    };

    if (loading) {
        return <button className="px-4 py-2 bg-gray-300 text-white rounded-md" disabled>Loading...</button>;
    }

    return (
        <button
            onClick={handleFollow}
            disabled={isFollowing} // Disable button if already following
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
                isFollowing
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={isFollowing ? "M5 13l4 4L19 7" : "M12 4v16m8-8H4"}
                />
            </svg>
            <span>{isFollowing ? "Following" : "Follow"}</span>
        </button>
    );
};

export default FollowButton;