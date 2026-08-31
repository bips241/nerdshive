"use client";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import useMount from "@/hooks/useMount";
import { CreatePost } from "@/schemas/Post";
import { createPost, submitPollPost, submitGoalPost, submitProjectPost } from "@/lib/actions";
import { zodResolver } from "@hookform/resolvers/zod";
import { CloudUpload, Crosshair, Film, Loader2, Vote, Hammer, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import Cropper from "react-easy-crop";
import ReactPlayer, { ReactPlayerProps } from "react-player";
import getCroppedImg from "@/lib/cropImage";
import { uploadMediaFile } from "@/lib/uploader";
import { Card } from "@/components/ui/card";

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

function CreatePage() {
  const pathname = usePathname();
  const isCreatePage = pathname === "/dashboard/create";
  const router = useRouter();
  const mount = useMount();

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Media Post State
  const form = useForm<z.infer<typeof CreatePost>>({
    resolver: zodResolver(CreatePost),
    defaultValues: {
      caption: "",
      fileUrl: "",
    },
  });
  const fileUrl = form.watch("fileUrl");
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<CropArea | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });

  // Poll State
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);

  // Goal State
  const [goalText, setGoalText] = useState("");
  const [goalDate, setGoalDate] = useState("");

  // Project State
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectTechStack, setProjectTechStack] = useState("");
  const [projectRepoUrl, setProjectRepoUrl] = useState("");

  const handleVideoReady: ReactPlayerProps["onReady"] = (player) => {
    const internalPlayer = player.getInternalPlayer();
    const width = internalPlayer.videoWidth || 16;
    const height = internalPlayer.videoHeight || 9;
    setVideoDimensions({ width, height });
  };

  const onCropComplete = useCallback((_croppedAreaPercentage: any, croppedAreaPixels: CropArea) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  const showCroppedImage = useCallback(async () => {
    if (croppedArea && fileUrl) {
      try {
        const cropped = await getCroppedImg(fileUrl, croppedArea);
        setCroppedImage(cropped);
      } catch (e) {
        console.error("Crop error:", e);
        toast.error("Failed to crop image");
      }
    }
  }, [fileUrl, croppedArea]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.size > MAX_FILE_SIZE) {
        toast.error("File size exceeds maximum allowed size of 15MB");
        return;
      }
      const previewURL = URL.createObjectURL(file);
      form.setValue("fileUrl", previewURL);
      setIsVideo(file.type.startsWith("video"));
      setSelectedFile(file);
      setCroppedImage(null);
    }
  };

  const handleReselect = () => {
    form.setValue("fileUrl", "");
    setCroppedImage(null);
    setIsVideo(false);
    setSelectedFile(null);
  };

  const handleMediaSubmit = async (values: z.infer<typeof CreatePost>) => {
    setIsSubmitting(true);
    setUploadProgress(0);
    try {
      let fileToUpload: File | null = null;

      if (isVideo && selectedFile) {
        fileToUpload = selectedFile;
      } else if (croppedImage) {
        const blob = await fetch(croppedImage).then((res) => res.blob());
        fileToUpload = new File([blob], "image.jpg", { type: "image/jpeg" });
      } else if (selectedFile) {
        fileToUpload = selectedFile;
      }

      if (!fileToUpload) {
        toast.error("Please select a photo or video to upload");
        setIsSubmitting(false);
        setUploadProgress(null);
        return;
      }

      const uploadResult = await uploadMediaFile({
        file: fileToUpload,
        onProgress: (percent) => setUploadProgress(percent),
      });

      if (!uploadResult.success || !uploadResult.fileUrl) {
        toast.error(uploadResult.error || "Upload failed. Please check your network and try again.");
        setIsSubmitting(false);
        setUploadProgress(null);
        return;
      }

      values.fileUrl = uploadResult.fileUrl;
      const res = await createPost(values);

      if (res?.errors) {
        toast.error("Failed to create post. Please check required fields.");
      } else {
        toast.success("Post created successfully!");
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("An unexpected error occurred during upload");
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  // Poll Handling
  const handleAddPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, ""]);
    } else {
      toast.info("Maximum 6 options allowed per poll");
    }
  };

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const handlePollOptionChange = (index: number, val: string) => {
    const updated = [...pollOptions];
    updated[index] = val;
    setPollOptions(updated);
  };

  const handleCreatePoll = async () => {
    if (!pollQuestion.trim()) {
      toast.error("Poll question is required");
      return;
    }
    const cleanOptions = pollOptions.map((opt) => opt.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      toast.error("At least two non-empty options are required");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitPollPost({ question: pollQuestion.trim(), options: cleanOptions });
      toast.success("Poll posted successfully!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Poll submission error:", error);
      toast.error("Failed to create poll");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Goal Handling
  const handleCreateGoal = async () => {
    if (!goalText.trim()) {
      toast.error("Goal description cannot be empty");
      return;
    }
    if (!goalDate) {
      toast.error("Target date is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitGoalPost({ goal: goalText.trim(), goalTargetDate: new Date(goalDate) });
      toast.success("Goal shared successfully!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Goal submission error:", error);
      toast.error("Failed to post goal");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Project Handling
  const handleCreateProject = async () => {
    if (!projectTitle.trim() || !projectDescription.trim() || !projectTechStack.trim()) {
      toast.error("Title, description, and tech stack are required");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitProjectPost({
        title: projectTitle.trim(),
        description: projectDescription.trim(),
        techStack: projectTechStack.trim(),
        repoUrl: projectRepoUrl.trim() || null,
      });
      toast.success("Project posted successfully!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Project submission error:", error);
      toast.error("Failed to create project post");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mount) return null;

  return (
    <div>
      <Dialog open={isCreatePage} onOpenChange={(open) => !open && router.back()}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader className="top-3">
            <DialogTitle className="flex justify-center text-lg font-bold">
              {selectedOption ? "Create Post" : "Create new post"}
            </DialogTitle>
          </DialogHeader>

          {!selectedOption && (
            <div className="flex flex-col space-y-3 py-4">
              <Button
                variant="outline"
                className="justify-start gap-3 h-12 text-base font-medium"
                onClick={() => setSelectedOption("uploadImage")}
              >
                <Film className="h-5 w-5 text-blue-500" />
                Upload Image / Video
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-3 h-12 text-base font-medium"
                onClick={() => setSelectedOption("polling")}
              >
                <Vote className="h-5 w-5 text-purple-500" />
                Create Community Poll
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-3 h-12 text-base font-medium"
                onClick={() => setSelectedOption("createGoal")}
              >
                <Crosshair className="h-5 w-5 text-emerald-500" />
                Share Learning Goal
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-3 h-12 text-base font-medium"
                onClick={() => setSelectedOption("createProject")}
              >
                <Hammer className="h-5 w-5 text-amber-500" />
                Start / Showcase Project
              </Button>
            </div>
          )}

          {selectedOption === "uploadImage" && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleMediaSubmit)} className="space-y-4">
                {!!fileUrl && (
                  <div>
                    {isVideo ? (
                      <Card className="relative max-h-[380px] overflow-hidden mb-4">
                        <AspectRatio
                          ratio={videoDimensions.width && videoDimensions.height ? videoDimensions.width / videoDimensions.height : 16 / 9}
                          className="h-auto rounded-lg w-full"
                        >
                          <ReactPlayer
                            url={fileUrl}
                            controls={true}
                            width="100%"
                            height="100%"
                            className="rounded-lg"
                            onReady={handleVideoReady}
                          />
                        </AspectRatio>
                      </Card>
                    ) : !croppedImage ? (
                      <div className="h-80 md:h-[380px] overflow-hidden rounded-md relative">
                        <Cropper
                          image={fileUrl}
                          crop={crop}
                          zoom={zoom}
                          aspect={1}
                          onCropChange={setCrop}
                          onZoomChange={setZoom}
                          onCropComplete={onCropComplete}
                        />
                      </div>
                    ) : (
                      <div className="h-80 md:h-[380px] overflow-hidden rounded-md">
                        <AspectRatio ratio={1 / 1} className="relative h-full">
                          <Image
                            src={croppedImage}
                            alt="Post preview"
                            fill
                            className="rounded-md object-cover"
                          />
                        </AspectRatio>
                      </div>
                    )}
                    <div className="flex gap-2 mt-3">
                      {!isVideo && !croppedImage && (
                        <Button type="button" onClick={showCroppedImage} size="sm">
                          Crop Image
                        </Button>
                      )}
                      <Button type="button" variant="secondary" onClick={handleReselect} size="sm">
                        Reselect File
                      </Button>
                    </div>
                  </div>
                )}

                {!fileUrl && (
                  <FormField
                    control={form.control}
                    name="fileUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="picture">Picture / Video</FormLabel>
                        <FormControl>
                          <Button variant="outline" className="relative flex w-full h-28 border-dashed border-2 flex-col gap-2">
                            <CloudUpload className="h-8 w-8 text-muted-foreground" />
                            <span className="text-sm font-medium">Click to select image or video (Max 15MB)</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,video/mp4,video/quicktime"
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              onChange={handleFileChange}
                            />
                          </Button>
                        </FormControl>
                        {field.value && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            Selected file: {field.value}
                          </div>
                        )}
                        <FormDescription>Supports JPEG, PNG, MP4, and MOV formats.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {!!fileUrl && (
                  <FormField
                    control={form.control}
                    name="caption"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="caption">Caption</FormLabel>
                        <FormControl>
                          <Input id="caption" placeholder="Write a caption..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {isSubmitting && uploadProgress !== null && (
                  <div className="space-y-1.5 w-full pt-1">
                    <div className="flex justify-between text-xs text-muted-foreground font-medium">
                      <span>Uploading to secure storage...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300 rounded-full"
                        style={{ width: `${Math.max(5, uploadProgress)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting || !fileUrl || (!isVideo && !croppedImage)}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {uploadProgress !== null ? `Uploading (${uploadProgress}%)...` : "Processing, please wait..."}
                      </>
                    ) : (
                      "Create Post"
                    )}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setSelectedOption(null)}>
                    Back
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {selectedOption === "polling" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Poll Question</label>
                <Input
                  type="text"
                  placeholder="What's your favorite frontend framework in 2026?"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Options</label>
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      type="text"
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                    />
                    {pollOptions.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemovePollOption(idx)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}

                {pollOptions.length < 6 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-primary text-sm gap-1 px-0"
                    onClick={handleAddPollOption}
                  >
                    <Plus className="h-4 w-4" /> Add option
                  </Button>
                )}
              </div>

              <div className="flex justify-between items-center pt-3">
                <Button onClick={handleCreatePoll} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Post Poll"}
                </Button>
                <Button variant="ghost" onClick={() => setSelectedOption(null)}>
                  Back
                </Button>
              </div>
            </div>
          )}

          {selectedOption === "createGoal" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Your Learning Goal / Target</label>
                <textarea
                  placeholder="e.g. Master Rust async programming and build a high-performance proxy by Q4..."
                  rows={4}
                  value={goalText}
                  onChange={(e) => setGoalText(e.target.value)}
                  className="w-full border rounded-md p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Target Completion Date</label>
                <Input
                  type="date"
                  value={goalDate}
                  onChange={(e) => setGoalDate(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="flex justify-between items-center pt-3">
                <Button onClick={handleCreateGoal} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Post Goal"}
                </Button>
                <Button variant="ghost" onClick={() => setSelectedOption(null)}>
                  Back
                </Button>
              </div>
            </div>
          )}

          {selectedOption === "createProject" && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Project Title</label>
                <Input
                  type="text"
                  placeholder="e.g. AI-Powered Code Reviewer"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  placeholder="Describe your project, roadmap, and what roles you are looking for..."
                  rows={3}
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="w-full border rounded-md p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tech Stack (comma-separated)</label>
                <Input
                  type="text"
                  placeholder="Next.js, TypeScript, PostgreSQL, Tailwind"
                  value={projectTechStack}
                  onChange={(e) => setProjectTechStack(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">GitHub Repo URL (optional)</label>
                <Input
                  type="text"
                  placeholder="github.com/username/project"
                  value={projectRepoUrl}
                  onChange={(e) => setProjectRepoUrl(e.target.value)}
                />
              </div>

              <div className="flex justify-between items-center pt-3">
                <Button onClick={handleCreateProject} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Post Project"}
                </Button>
                <Button variant="ghost" onClick={() => setSelectedOption(null)}>
                  Back
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CreatePage;
