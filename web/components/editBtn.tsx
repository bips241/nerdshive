'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateProfile } from '@/lib/actions';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface EditProfileButtonProps {
  initialData?: {
    user_name?: string;
    bio?: string;
    gender?: string;
    website?: string;
    repo?: string;
  };
}

const EditProfileButton = ({ initialData }: EditProfileButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    user_name: initialData?.user_name || "",
    bio: initialData?.bio || "",
    gender: initialData?.gender || "",
    website: initialData?.website || "",
    repo: initialData?.repo || "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenderChange = (value: string) => {
    setFormData((prev) => ({ ...prev, gender: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await updateProfile(formData);

      if (res?.success) {
        toast.success(res.message || "Profile updated successfully!");
        setIsOpen(false);

        // If username was updated, redirect to new user profile URL
        if (res.user_name && res.user_name !== initialData?.user_name) {
          window.location.href = `/dashboard/user/${encodeURIComponent(res.user_name)}`;
        }
      } else {
        toast.error(res?.error || "Failed to update profile. Please try again.");
      }
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      toast.error(error.message || "Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="secondary"
        size="sm"
        className="font-semibold text-sm"
      >
        Edit Profile
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your public profile details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="user_name" className="block text-sm font-medium mb-1">
                Username
              </label>
              <Input
                id="user_name"
                name="user_name"
                type="text"
                placeholder="Your username"
                value={formData.user_name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium mb-1">
                Bio
              </label>
              <Input
                id="bio"
                name="bio"
                type="text"
                placeholder="Software Engineer • Open Source Enthusiast"
                value={formData.bio}
                onChange={handleInputChange}
                maxLength={150}
              />
            </div>

            <div>
              <label htmlFor="gender" className="block text-sm font-medium mb-1">
                Gender
              </label>
              <Select onValueChange={handleGenderChange} value={formData.gender}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="website" className="block text-sm font-medium mb-1">
                Website
              </label>
              <Input
                id="website"
                name="website"
                type="url"
                placeholder="https://yourportfolio.dev"
                value={formData.website}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label htmlFor="repo" className="block text-sm font-medium mb-1">
                GitHub Repository / Profile
              </label>
              <Input
                id="repo"
                name="repo"
                type="url"
                placeholder="https://github.com/yourhandle"
                value={formData.repo}
                onChange={handleInputChange}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditProfileButton;
