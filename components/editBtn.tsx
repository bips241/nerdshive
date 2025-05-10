'use client';

import { UserRoundIcon } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Ensure this module exists or update the path

type userID = string;

const EditProfileButton = () => {
    const [isOpen, setIsOpen] = useState(false);

    const openDialog = () => setIsOpen(true);
    const closeDialog = () => setIsOpen(false);

    const EditProfileModal = () => {
        const [formData, setFormData] = useState({
            user_name: "",
            email: "",
            bio: "",
            gender: "",
            website: "",
            repo: "",
        });

                const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                    const { name, value } = e.target;
                    setFormData({ ...formData, [name]: value });
                };

                const handleGenderChange = (value: string) => {
                    setFormData({ ...formData, gender: value });
                };

                const handleSubmit = (e: React.FormEvent) => {
                    e.preventDefault();
                    // Add your form submission logic here
                    console.log("Form Data:", formData);
                };

                return (
                    <Dialog open={isOpen} onOpenChange={closeDialog}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Edit Profile</DialogTitle>
                                <DialogDescription>Update your profile details below.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label htmlFor="user_name" className="block text-sm font-medium">
                                        Username
                                    </label>
                                    <Input
                                        id="user_name"
                                        name="user_name"
                                        type="text"
                                        placeholder="Enter your username"
                                        value={formData.user_name}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium">
                                        Email
                                    </label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="Enter your email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="bio" className="block text-sm font-medium">
                                        Bio
                                    </label>
                                    <Input
                                        id="bio"
                                        name="bio"
                                        type="text"
                                        placeholder="Tell us about yourself"
                                        value={formData.bio}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="gender" className="block text-sm font-medium">
                                        Gender
                                    </label>
                                    <Select onValueChange={handleGenderChange} value={formData.gender}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select your gender" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="female">Female</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label htmlFor="website" className="block text-sm font-medium">
                                        Website
                                    </label>
                                    <Input
                                        id="website"
                                        name="website"
                                        type="url"
                                        placeholder="Enter your website URL"
                                        value={formData.website}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="repo" className="block text-sm font-medium">
                                        Repository
                                    </label>
                                    <Input
                                        id="repo"
                                        name="repo"
                                        type="url"
                                        placeholder="Enter your repository URL"
                                        value={formData.repo}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <DialogFooter>
                                    <Button type="submit" className="save-button">
                                        Save
                                    </Button>
                                    <Button type="button" variant="secondary" onClick={closeDialog}>
                                        Cancel
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                );
            };
            
        
    return (
        <>
            <button
                onClick={openDialog}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 text-sm transition"
            >
                Edit Profile
            </button>

            {isOpen && <EditProfileModal />}
        </>
    );
};

export default EditProfileButton;
