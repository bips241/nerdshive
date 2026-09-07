'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateProfile } from '@/lib/actions';
import { uploadMediaFile } from '@/lib/uploader';
import { toast } from 'sonner';
import {
  Loader2,
  Camera,
  Upload,
  Sparkles,
  Trash2,
  Link as LinkIcon,
  User as UserIcon,
} from 'lucide-react';
import UserAvatar from './UserAvatar';

export interface EditProfileButtonProps {
  initialData?: {
    user_name?: string;
    bio?: string;
    gender?: string;
    website?: string;
    repo?: string;
    radarStatus?: string;
    techStack?: string[];
    image?: string;
  };
}

/**
 * Avatar with hover overlay trigger for profile owners
 */
export const ProfileAvatarWithEditTrigger: React.FC<{
  user: { image?: string; user_name?: string; email?: string };
  isOwnProfile?: boolean;
  className?: string;
}> = ({ user, isOwnProfile, className }) => {
  if (!isOwnProfile) {
    return <UserAvatar user={user} className={className} />;
  }

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('open-edit-profile'))}
      className="relative group rounded-full focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer text-left shrink-0"
      title="Click to change profile picture (DP)"
    >
      <UserAvatar
        user={user}
        className={`${className} group-hover:ring-2 group-hover:ring-primary/60 transition-all`}
      />
      <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-200 backdrop-blur-[2px]">
        <Camera className="w-5 h-5 text-white drop-shadow-md mb-0.5" />
        <span className="text-[10px] font-bold text-white tracking-wide">Change DP</span>
      </div>
    </button>
  );
};

const EditProfileButton: React.FC<EditProfileButtonProps> = ({ initialData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    user_name: initialData?.user_name || '',
    bio: initialData?.bio || '',
    gender: initialData?.gender || '',
    website: initialData?.website || '',
    repo: initialData?.repo || '',
    radarStatus: initialData?.radarStatus || 'none',
    techStack: initialData?.techStack || [],
    image: initialData?.image || '',
  });

  const [techStackInput, setTechStackInput] = useState((initialData?.techStack || []).join(', '));

  // Sync state if initialData changes or modal re-opens
  useEffect(() => {
    if (initialData) {
      setFormData({
        user_name: initialData.user_name || '',
        bio: initialData.bio || '',
        gender: initialData.gender || '',
        website: initialData.website || '',
        repo: initialData.repo || '',
        radarStatus: initialData.radarStatus || 'none',
        techStack: initialData.techStack || [],
        image: initialData.image || '',
      });
      setTechStackInput((initialData.techStack || []).join(', '));
    }
  }, [initialData, isOpen]);

  // Listen for custom event from avatar click
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-edit-profile', handleOpen);
    return () => window.removeEventListener('open-edit-profile', handleOpen);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRadarChange = (value: string) => {
    setFormData((prev) => ({ ...prev, radarStatus: value }));
  };

  const handleGenderChange = (value: string) => {
    setFormData((prev) => ({ ...prev, gender: value }));
  };

  // 1. Photo File Selection & Upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, WebP, GIF).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File exceeds 10MB limit. Please choose a smaller image.');
      return;
    }

    // Instant local preview
    const localPreview = URL.createObjectURL(file);
    setFormData((prev) => ({ ...prev, image: localPreview }));

    setIsUploadingImage(true);
    setUploadProgress(15);

    try {
      const result = await uploadMediaFile({
        file,
        onProgress: (p) => setUploadProgress(p),
      });

      if (result.success && result.fileUrl) {
        setFormData((prev) => ({ ...prev, image: result.fileUrl! }));
        toast.success('Display picture uploaded!');
      } else {
        // Fallback to data URL if S3 is unavailable so the user is never blocked
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Url = reader.result as string;
          setFormData((prev) => ({ ...prev, image: base64Url }));
          toast.success('Display picture ready!');
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.warn('Upload failed, falling back to data URL:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Url = reader.result as string;
        setFormData((prev) => ({ ...prev, image: base64Url }));
        toast.success('Display picture ready!');
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingImage(false);
      setUploadProgress(null);
    }
  };

  // 2. Generate Random Dev Avatar
  const handleGenerateDevAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(2, 9);
    const devAvatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${randomSeed}`;
    setFormData((prev) => ({ ...prev, image: devAvatarUrl }));
    toast.success('Generated developer avatar!');
  };

  // 3. Remove Photo
  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, image: '' }));
    toast.info('Display picture removed. Default avatar will be used.');
  };

  // 4. Submit Profile Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploadingImage) {
      toast.error('Please wait for photo upload to finish.');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedTech = techStackInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await updateProfile({
        ...formData,
        techStack: parsedTech,
      });

      if (res?.success) {
        toast.success(res.message || 'Profile updated successfully!');
        setIsOpen(false);

        // If username was updated, redirect to new user profile URL, otherwise refresh current page
        if (res.user_name && res.user_name !== initialData?.user_name) {
          window.location.href = `/dashboard/user/${encodeURIComponent(res.user_name)}`;
        } else {
          window.location.reload();
        }
      } else {
        toast.error(res?.error || 'Failed to update profile. Please try again.');
      }
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      toast.error(error.message || 'Failed to update profile. Please try again.');
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
        <DialogContent className="w-[95vw] sm:w-full max-w-md max-h-[88vh] overflow-y-auto bg-card border-border text-foreground rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Profile</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update your public profile details, display picture, and matchmaking radar.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {/* Display Picture (DP) Section */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-xl bg-secondary/30 border border-border">
              {/* Circular Avatar Preview */}
              <div className="relative group shrink-0">
                <div className="relative h-20 w-20 rounded-full overflow-hidden ring-2 ring-primary/40 bg-background flex items-center justify-center shadow-md">
                  {formData.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={formData.image}
                      alt="Profile preview"
                      className="h-full w-full object-cover"
                      onError={() => {
                        setFormData((prev) => ({ ...prev, image: '' }));
                      }}
                    />
                  ) : (
                    <UserIcon className="h-10 w-10 text-muted-foreground" />
                  )}

                  {/* Uploading Overlay Indicator */}
                  {isUploadingImage && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center gap-1 z-10">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-[10px] font-mono text-white font-bold">
                        {uploadProgress || 0}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Floating Quick-Upload Camera Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-110 active:scale-95 transition-all"
                  title="Upload new photo"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* DP Controls */}
              <div className="flex-1 w-full space-y-2 text-center sm:text-left">
                <div>
                  <p className="text-xs font-bold text-foreground">Display Picture</p>
                  <p className="text-[11px] text-muted-foreground">
                    Upload a custom photo, roll a dev avatar, or use an image URL.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="h-7 text-xs font-medium gap-1 px-2.5 bg-background border-border hover:bg-secondary"
                  >
                    <Upload className="h-3 w-3 text-primary" />
                    {isUploadingImage ? `Uploading (${uploadProgress}%)` : 'Upload Photo'}
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleGenerateDevAvatar}
                    disabled={isUploadingImage}
                    className="h-7 text-xs font-medium gap-1 px-2 text-muted-foreground hover:text-foreground"
                    title="Generate random developer avatar"
                  >
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    Randomize
                  </Button>

                  {formData.image && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleRemovePhoto}
                      disabled={isUploadingImage}
                      className="h-7 text-xs font-medium gap-1 px-2 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </Button>
                  )}
                </div>

                {/* Direct Image URL Toggle */}
                {showUrlInput ? (
                  <div className="flex gap-1.5 pt-1">
                    <Input
                      type="url"
                      placeholder="https://avatars.githubusercontent.com/..."
                      value={formData.image}
                      onChange={(e) => setFormData((prev) => ({ ...prev, image: e.target.value }))}
                      className="h-7 text-[11px] bg-background border-border text-foreground"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowUrlInput(false)}
                      className="h-7 px-2 text-xs"
                    >
                      Done
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(true)}
                    className="text-[11px] text-primary hover:underline block pt-0.5 font-medium"
                  >
                    <LinkIcon className="h-3 w-3 inline mr-1" />
                    Or paste image URL
                  </button>
                )}
              </div>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="user_name" className="block text-sm font-medium mb-1 text-foreground">
                Username
              </label>
              <Input
                id="user_name"
                name="user_name"
                type="text"
                placeholder="Your username"
                value={formData.user_name}
                onChange={handleInputChange}
                className="bg-secondary/30 border-border text-foreground"
                required
              />
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium mb-1 text-foreground">
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
                className="bg-secondary/30 border-border text-foreground"
              />
            </div>

            {/* Teammate Radar */}
            <div>
              <label htmlFor="radarStatus" className="block text-sm font-medium mb-1 text-foreground">
                Teammate Radar Status (Live Beacon)
              </label>
              <Select onValueChange={handleRadarChange} value={formData.radarStatus}>
                <SelectTrigger className="bg-secondary/30 border-border text-foreground">
                  <SelectValue placeholder="Select radar status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="none">Off (No Beacon)</SelectItem>
                  <SelectItem value="open_for_hackathons">🎯 Open for Hackathons</SelectItem>
                  <SelectItem value="seeking_cofounder">🚀 Seeking Co-Founder</SelectItem>
                  <SelectItem value="open_for_collab">🤝 Open for Collab</SelectItem>
                  <SelectItem value="open_for_work">💼 Open for Work</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tech Stack */}
            <div>
              <label htmlFor="techStack" className="block text-sm font-medium mb-1 text-foreground">
                Tech Stack (Comma-separated)
              </label>
              <Input
                id="techStack"
                name="techStack"
                type="text"
                placeholder="TypeScript, Next.js, Python, Rust"
                value={techStackInput}
                onChange={(e) => setTechStackInput(e.target.value)}
                className="bg-secondary/30 border-border text-foreground"
              />
            </div>

            {/* Gender */}
            <div>
              <label htmlFor="gender" className="block text-sm font-medium mb-1 text-foreground">
                Gender
              </label>
              <Select onValueChange={handleGenderChange} value={formData.gender}>
                <SelectTrigger className="bg-secondary/30 border-border text-foreground">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Website */}
            <div>
              <label htmlFor="website" className="block text-sm font-medium mb-1 text-foreground">
                Website
              </label>
              <Input
                id="website"
                name="website"
                type="url"
                placeholder="https://yourportfolio.dev"
                value={formData.website}
                onChange={handleInputChange}
                className="bg-secondary/30 border-border text-foreground"
              />
            </div>

            {/* GitHub Repo */}
            <div>
              <label htmlFor="repo" className="block text-sm font-medium mb-1 text-foreground">
                GitHub Profile or Repository URL
              </label>
              <Input
                id="repo"
                name="repo"
                type="url"
                placeholder="https://github.com/yourusername"
                value={formData.repo}
                onChange={handleInputChange}
                className="bg-secondary/30 border-border text-foreground"
              />
            </div>

            <DialogFooter className="pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="border-border text-foreground"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isUploadingImage}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  'Save Changes'
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
