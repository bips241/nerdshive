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
            className={`px-4 py-2 font-semibold rounded transition ${
                isInterested
                    ? "bg-green-400 dark:bg-green-600 text-neutral-50 dark:text-neutral-200 cursor-not-allowed"
                    : "bg-blue-400 dark:bg-blue-600 text-neutral-50 dark:text-neutral-200 hover:bg-blue-500 dark:hover:bg-blue-700"
            }`}
        >
            {isInterested ? "Interested ✔" : "Interested"}
        </button>
    );
};
