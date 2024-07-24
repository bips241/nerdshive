"use client";
import Error from "@/components/Error";
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
import { createPost } from "@/lib/actions";
import { zodResolver } from "@hookform/resolvers/zod";
import { CloudUpload, Crosshair, Film, Loader2, Vote } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import Cropper from 'react-easy-crop';
import ReactPlayer from 'react-player';
import getCroppedImg from '@/lib/cropImage';
import { getSignedURL } from "./actions";


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
      const fileURL = URL.createObjectURL(file);
      form.setValue("fileUrl", fileURL);
      setIsVideo(file.type.startsWith("video"));
    }
  };

  const handleReselect = () => {
    form.setValue("fileUrl", "");
    setCroppedImage(null);
    setIsVideo(false);
  };

  const computeSHA256 = async (file: File) => {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
    return hashHex
  }

  const UploadToS3 = async (file: File) => {
    const signedURLResult = await getSignedURL({
      fileSize: file.size,
      fileType: file.type,
      checksum: await computeSHA256(file),
    });
  
    if (signedURLResult.failure !== undefined) {
      console.error('Signed URL error');
    }
  
    if (signedURLResult.success !== undefined) {
      const { url } = signedURLResult.success;
  
      await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });
  
      const fileUrl = url.split("?")[0];
      return fileUrl;
    }
    console.error('uploading failed');
  };
  
  
  
  if (!mount) return null;

  return (
    <div>
      <Dialog
        open={isCreatePage}
        onOpenChange={(open) => !open && router.back()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex justify-center">Create new post</DialogTitle>
          </DialogHeader>

          {!selectedOption && (
            <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0 justify-between">
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
            </div>
          )}

          {selectedOption === "uploadImage" && (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(async (values) => {
                  if (isVideo) {
                    const file = new File([fileUrl], 'video.mp4', { type: 'video/mp4' });
                    const uploadedUrl = await UploadToS3(file);
                    if(uploadedUrl)
                    {
                      values.fileUrl = uploadedUrl;
                    }
                  } else if (croppedImage) {
                    const file = await fetch(croppedImage).then(res => res.blob()).then(blob => new File([blob], 'image.jpg', { type: 'image/jpeg' }));
                    const uploadedUrl = await UploadToS3(file);
                    if(uploadedUrl)
                    {
                      values.fileUrl = uploadedUrl;
                    }
                  }
                  const res = await createPost(values);
                  if (res) {
                    return toast.error(<Error res={res} />);
                  }
                })}
                className="space-y-4"
              >
                {!!fileUrl && (
                  <div>
                    {isVideo ? (
                      <div className="aspect-w-16 aspect-h-9">
                        <ReactPlayer url={fileUrl} controls={true} width="100%" height="auto" />
                      </div>
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
                  disabled={form.formState.isSubmitting || (!isVideo && !croppedImage)}
                  className="mr-5"
                > {form.formState.isSubmitting?(
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                      Uploading
                  </>
                )
                :('Create post')}
                </Button>
                              
                <Button variant="secondary" onClick={() => setSelectedOption(null)}>
                  Back
                </Button>
              </form>
            </Form>
          )}

          {selectedOption === "polling" && (
            <div>
              <p>Polling</p>
              <Button variant="secondary" onClick={() => setSelectedOption(null)}>
                Back
              </Button>
            </div>
          )}

          {selectedOption === "createGoal" && (
            <div>
              <p>Create Goal</p>
              <Button variant="secondary" onClick={() => setSelectedOption(null)}>
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
