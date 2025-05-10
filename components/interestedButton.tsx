"use client";

import React from "react";
import { toast } from "sonner"; // or your toast lib
import { handleInterest } from "@/lib/actions"; // your server action

type InterestedButtonProps = {
    postId: string;
    userId: string;
};

export const InterestedButton = ({ postId, userId }: InterestedButtonProps) => {
    const [isInterested, setIsInterested] = React.useState(false);

    const handleInterestedClick = async () => {
        try {
            if (userId) {
                await handleInterest(postId, userId);
                setIsInterested(true);
                toast.success("Yay, you are interested!", {
                    style: {
                        background: "#d4edda",
                        color: "#155724",
                    },
                });
            } else {
                console.error("User ID is undefined");
            }
        } catch (error) {
            console.error("Error handling interested click:", error);
        }
    };

    return (
        <button
            type="button"
            onClick={handleInterestedClick}
            disabled={isInterested}
            className={`relative px-6 py-3 font-semibold rounded-full transition-all duration-300 transform ${
            isInterested
                ? "bg-gradient-to-r from-green-400 to-green-600 text-white cursor-not-allowed scale-100"
                : "bg-gradient-to-r from-blue-400 to-blue-600 text-white hover:scale-105 hover:shadow-lg"
            }`}
        >
            <span
            className={`absolute inset-0 rounded-full blur-md ${
                isInterested
                ? "bg-green-500 opacity-50"
                : "bg-blue-500 opacity-50"
            }`}
            ></span>
            <span className="relative z-10">
            {isInterested ? "Interested ✔" : "Interested"}
            </span>
        </button>
    );
};
