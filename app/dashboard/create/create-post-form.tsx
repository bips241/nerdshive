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
import { createPost, submitPollPost, submitGoalPost, submitProjectPost} from "@/lib/actions";
import { zodResolver } from '@hookform/resolvers/zod';
import { CloudUpload, Crosshair, Film, Loader2, Vote, Hammer } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import Cropper from 'react-easy-crop';
import ReactPlayer, { ReactPlayerProps } from 'react-player';
import getCroppedImg from '@/lib/cropImage';
import { getSignedURL } from "./actions";
import { Card } from "@/components/ui/card";

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

function CreatePage() {
  const pathname = usePathname();
  const isCreatePage = pathname === "/dashboard/create";
  const router = useRouter();
  const mount = useMount();
  const form = useForm<z.infer<typeof CreatePost>>({
    resolver: zodResolver(CreatePost),
    defaultValues: {
      caption: "",
      fileUrl: "",
    },
  });
  const fileUrl = form.watch("fileUrl");

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<CropArea | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });

  const handleVideoReady: ReactPlayerProps['onReady'] = (player) => {
    const internalPlayer = player.getInternalPlayer();
    const width = internalPlayer.videoWidth;
    const height = internalPlayer.videoHeight;
    setVideoDimensions({ width, height });
  };
  

  const onCropComplete = useCallback((croppedAreaPercentage: any, croppedAreaPixels: CropArea) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  const showCroppedImage = useCallback(async () => {
    if (croppedArea && fileUrl) {
      try {
        const croppedImage = await getCroppedImg(fileUrl, croppedArea);
        setCroppedImage(croppedImage);
      } catch (e) {
        console.error(e);
      }
    }
  }, [fileUrl, croppedArea]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if(file.size>10485760){
        console.error('File size is exceeding 15MB');
        router.push("/dashboard");
        toast.error('Failed,File size is exceeding 15MB');
      };
      const fileURL = URL.createObjectURL(file);
      form.setValue("fileUrl", fileURL);
      setIsVideo(file.type.startsWith("video"));
      setSelectedFile(file);
    }
  };

  const handleReselect = () => {
    form.setValue("fileUrl", "");
    setCroppedImage(null);
    setIsVideo(false);
    setSelectedFile(null);
  };

  const computeSHA256 = async (file: File) => {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
    return hashHex
  }

  const UploadToS3 = async (file: File) => {
    try {
      const checksum = await computeSHA256(file);
      const signedURLResult = await getSignedURL({
        fileSize: file.size,
        fileType: file.type,
        checksum,
      });
  
      console.log('Signed URL Result:', signedURLResult);
  
      if (signedURLResult.failure !== undefined) {
        console.error('Failed to get signed URL:', signedURLResult.failure);
        toast.error('Failed to get signed URL');
        return;
      }
  
      if (signedURLResult.success !== undefined) {
        const { url } = signedURLResult.success;
        console.log('Uploading to:', url);
  
        const response = await fetch(url, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });
  
        if (!response.ok) {
          console.error('Upload failed with status:', response.status);
          toast.error('Upload failed');
          return;
        }
  
        const fileUrl = url.split("?")[0];
        return fileUrl;
      }
  
      console.error('Unexpected result format');
      toast.error('Unexpected result format');
    } catch (error) {
      console.error('Error in UploadToS3:', error);
      toast.error('An unexpected error occurred during upload');
    }
  };

  const handleCreatePoll = () => {
    const questionInput = document.querySelector<HTMLInputElement>('input[placeholder="Poll Question..."]');
    const optionInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[placeholder^="Option"]'));
  
    if (!questionInput || !optionInputs.length) {
      toast.error("Poll fields missing");
      return;
    }
  
    const question = questionInput.value.trim();
    const options = optionInputs.map(opt => opt.value.trim()).filter(Boolean);
  
    if (!question) {
      toast.error("Poll question is required");
      return;
    }
  
    if (options.length < 2) {
      toast.error("At least two options are required");
      return;
    }
  
    submitPollPost({ question, options });
  };
  
  
  // for Goal
  const handleCreateGoal = () => {
    const textarea = document.querySelector<HTMLTextAreaElement>('textarea[placeholder="Write your goal or idea..."]');
    const targetDateInput = document.querySelector<HTMLInputElement>('input[type="date"]');
  
    if (!textarea) {
      toast.error("Goal text missing");
      return;
    }
  
    const goalText = textarea.value.trim();
  
    if (!goalText) {
      toast.error("Goal cannot be empty");
      return;
    }
    if (!targetDateInput) {
      toast.error("Target date missing");
      return;
    }
  
    submitGoalPost({ goal: goalText, goalTargetDate: new Date(targetDateInput.value) });
  };
  
  
  // for Project
  const handleCreateProject = () => {
    const titleInput = document.querySelector<HTMLInputElement>('input[placeholder="Project Title"]');
    const descTextarea = document.querySelector<HTMLTextAreaElement>('textarea[placeholder="Project Description"]');
    const techStackInput = document.querySelector<HTMLInputElement>('input[placeholder="Tech Stack (e.g. Next.js, Tailwind)"]');
    const repoUrlInput = document.querySelector<HTMLInputElement>('input[placeholder="GitHub Repo URL (optional)"]');
  
    if (!titleInput || !descTextarea || !techStackInput) {
      toast.error("Project fields missing");
      return;
    }
  
    const title = titleInput.value.trim();
    const description = descTextarea.value.trim();
    const techStack = techStackInput.value.trim();
    const repoUrl = repoUrlInput?.value.trim() || null;
  
    if (!title || !description || !techStack) {
      toast.error("All fields except GitHub URL are required");
      return;
    }
  
    submitProjectPost({ title, description, techStack, repoUrl });
  };
  
  

  if (!mount) return null;

  return (
    <div>
      <Dialog
        open={isCreatePage}
        onOpenChange={(open) => !open && router.back()}
      >
        <DialogContent>
          <DialogHeader className="top-3">
            <DialogTitle className="flex flex-auto justify-center ">Create new post</DialogTitle>
          </DialogHeader>

          {!selectedOption && (
            <div className="flex flex-col md:flex-col md:space-y-4 space-y-4 md:space-x-0 justify-between">
              <Button variant="ghost"
                onClick={() => setSelectedOption("uploadImage")}
              >
                <Film className="h-5 w-5" />
                <p className="text-sm md:text-base">Upload Image/Video</p>
              </Button>
              <Button variant="ghost"
                onClick={() => setSelectedOption("polling")}
              >
                <Vote className="h-5 w-5" />
                <span className="text-sm md:text-base">Polling</span>
              </Button>
              <Button variant="ghost"
                onClick={() => setSelectedOption("createGoal")}
              >
                <Crosshair className="h-5 w-5" />
                <span className="text-sm md:text-base">Create Goal</span>
              </Button>
              <Button variant="ghost" onClick={() => setSelectedOption("createProject")}>
                 <Hammer className="h-5 w-5" />
                 <span className="text-sm md:text-base">Create Project</span>
              </Button>

            </div>
          )}

          {selectedOption === "uploadImage" && (
            <Form {...form}>
              <form 
                onSubmit={form.handleSubmit(async (values) => {
                  setIsSubmitting(true);
                  try {
                    let uploadedUrl: string | undefined;
              
                    if (isVideo && selectedFile) {
                      uploadedUrl = await UploadToS3(selectedFile);
                    } else if (croppedImage) {
                      const file = await fetch(croppedImage).then(res => res.blob()).then(blob => new File([blob], 'image.jpg', { type: 'image/jpeg' }));
                      uploadedUrl = await UploadToS3(file);
                    }
              
                    if (uploadedUrl) {
                      values.fileUrl = uploadedUrl;
                    } else {
                      
                      setIsSubmitting(false);
                      return;
                    }
              
                    const res = await createPost(values);
              
                    if (res?.errors) {
                      toast.error('hello im error');
                    } else {
                      toast.success("Upload complete");
                      router.push("/dashboard");
                    }
                  } catch (error) {
                    console.log(selectedFile);
                    toast.error('An unexpected error occurred');
                  } finally {
                    setIsSubmitting(false);
                  }
                })}
                className="space-y-4"
              >
                {!!fileUrl && (
                  <div>
                    {isVideo ? (
                      <Card className="relative max-h-[420px] overflow-hidden mb-6 shadow-custom-light">
                      <AspectRatio ratio={videoDimensions.width / videoDimensions.height} className="h-auto rounded-lg w-auto">
                        <ReactPlayer
                          url={fileUrl}
                          controls={true}
                          width="100%"
                          height="100%"
                          className="rounded-lg aspect-video"
                          onReady={handleVideoReady}
                        />
                      </AspectRatio>
                    </Card>
                    ) : (
                      !croppedImage ? (
                        <div className="h-96 md:h-[450px] overflow-hidden rounded-md relative">
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
                        <div className="h-96 md:h-[450px] overflow-hidden rounded-md">
                    <AspectRatio ratio={1 / 1} className="relative h-full">
                      <Image
                        src={croppedImage}
                        alt="Post preview"
                        fill
                        className="rounded-md object-cover"
                      />
                    </AspectRatio>
                  </div>
                      )
                    )}
                    {!isVideo && !croppedImage && (
                      <Button onClick={showCroppedImage} className="mt-2 mr-3">Crop Image</Button>
                    )}
                    <Button variant="secondary" onClick={handleReselect} className="mt-2">Reselect File</Button>
                  </div>
                )}
                {!fileUrl && (
                  <FormField
                    control={form.control}
                    name="fileUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="picture">Picture/Video</FormLabel>
                        <FormControl>
                          <Button variant="ghost" className="relative flex">
                            <CloudUpload />
                            Select Image/Video
                            <input
                              type="file"
                              accept="image/*,video/*"
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
                        <FormDescription>
                          Upload a picture or video to post.
                        </FormDescription>
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
                          <Input
                            type="caption"
                            id="caption"
                            placeholder="Write a caption..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting || !fileUrl || (!isVideo && !croppedImage)}
                  className="mr-5"
                > 
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                        Uploading,Please wait
                    </>): "Create Post"}
                </Button>
                              
                <Button variant="secondary" onClick={() => setSelectedOption(null)}>
                  Back
                </Button>
              </form>
            </Form>
          )}

          {selectedOption === "polling" && (
            <div className="space-y-4">
              <p className="text-lg font-semibold">Create a Poll</p>

              <input
                type="text"
                placeholder="Poll Question..."
                className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Option 1"
                  className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="text"
                  placeholder="Option 2"
                  className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  className="text-primary text-sm hover:underline"
                >
                  + Add another option
                </button>
              </div>

              <Button className="w-full" onClick={handleCreatePoll}>
                Post Poll
              </Button>

              <Button variant="secondary" className="w-full" onClick={() => setSelectedOption(null)}>
                Back
              </Button>
            </div>
        )}

        {selectedOption === "createGoal" && (
          <div className="space-y-4">
            <p className="text-lg font-semibold">Share a Goal</p>
        
            <textarea
              placeholder="Write your goal or idea..."
              rows={4}
              className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            
            <div>
              <p className="text-sm font-medium mb-2">Target Date</p>
              <input
              type="date"
              className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <Button className="w-full" onClick={handleCreateGoal}>
              Post Goal
            </Button>
        
            <Button variant="secondary" className="w-full" onClick={() => setSelectedOption(null)}>
              Back
            </Button>
          </div>
        )}

        {selectedOption === "createProject" && (
          <div className="space-y-4">
            <p className="text-lg font-semibold">Start a Project</p>
        
            <input
              type="text"
              placeholder="Project Title"
              className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <textarea
              placeholder="Project Description"
              rows={3}
              className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <input
              type="text"
              placeholder="Tech Stack (e.g. Next.js, Tailwind)"
              className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <input
              type="url"
              placeholder="GitHub Repo URL (optional)"
              className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <Button className="w-full" onClick={handleCreateProject}>
              Post Project
            </Button>
        
            <Button variant="secondary" className="w-full" onClick={() => setSelectedOption(null)}>
              Back
            </Button>
          </div>
        )}

        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CreatePage;
