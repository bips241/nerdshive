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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useMount from "@/hooks/useMount";
import { CreatePost } from "@/schemas/Post";
import {
  createPost,
  submitShipLogPost,
  submitHackathonCrewPost,
} from "@/lib/actions";
import { getVerifiedHackathons } from "@/lib/hackathon-actions";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CloudUpload,
  Film,
  Loader2,
  Rocket,
  Zap,
  ChevronLeft,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import Cropper from "react-easy-crop";
import ReactPlayer, { ReactPlayerProps } from "react-player";
import getCroppedImg from "@/lib/cropImage";
import { uploadMediaFile } from "@/lib/uploader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const typeMap: Record<string, string> = {
  ship_log: "shipLog",
  hackathon_crew: "hackathonCrew",
  media: "media",
};

function CreatePage() {
  const pathname = usePathname();
  const isCreatePage = pathname === "/dashboard/create";
  const router = useRouter();
  const mount = useMount();
  const searchParams = useSearchParams();

  const paramType = searchParams?.get("type");
  const initialOption = paramType ? (typeMap[paramType] || null) : null;
  const [selectedOption, setSelectedOption] = useState<string | null>(initialOption);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // 1. Ship Log State
  const [shipTitle, setShipTitle] = useState("");
  const [shipPitch, setShipPitch] = useState("");
  const [shipDemoUrl, setShipDemoUrl] = useState("");
  const [shipRepoUrl, setShipRepoUrl] = useState("");
  const [shipTechStack, setShipTechStack] = useState("");
  const [feedbackWanted, setFeedbackWanted] = useState<string[]>([]);

  // 2. Hackathon Crew State
  const [hackName, setHackName] = useState("");
  const [hackUrgencyDate, setHackUrgencyDate] = useState("");
  const [hackRolesHave, setHackRolesHave] = useState("");
  const [hackRolesNeed, setHackRolesNeed] = useState("");
  const [hackMaxSquadSize, setHackMaxSquadSize] = useState(4);
  const [hackCommitment, setHackCommitment] = useState<"hardcore" | "moderate" | "casual">("moderate");
  const [hackathonList, setHackathonList] = useState<any[]>([]);
  const [selectedHackathonId, setSelectedHackathonId] = useState<string>("custom");
  const [hackTargetTrack, setHackTargetTrack] = useState<string>("");
  const [hackTracks, setHackTracks] = useState<any[]>([]);

  // 3. Media State
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

  // Sync selectedOption whenever query param changes
  useEffect(() => {
    const type = searchParams?.get("type");
    if (type && typeMap[type]) {
      setSelectedOption(typeMap[type]);
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadHackathons() {
      try {
        const list = await getVerifiedHackathons();
        setHackathonList(list);

        const typeParam = searchParams?.get("type");
        const slugParam = searchParams?.get("hackathonSlug");
        const nameParam = searchParams?.get("hackathonName");

        if (typeParam === "hackathon_crew") {
          setSelectedOption("hackathonCrew");
        }

        if (slugParam && list.length > 0) {
          const match = list.find((h: any) => h.slug === slugParam);
          if (match) {
            setSelectedHackathonId(match._id);
            setHackName(match.name);
            if (match.submissionDeadline) {
              setHackUrgencyDate(new Date(match.submissionDeadline).toISOString().split("T")[0]);
            }
            if (match.tracks && match.tracks.length > 0) {
              setHackTracks(match.tracks);
              setHackTargetTrack(match.tracks[0].name);
            }
          } else if (nameParam) {
            setHackName(nameParam);
          }
        }
      } catch (err) {
        console.error("Error loading hackathons:", err);
      }
    }
    loadHackathons();
  }, [searchParams]);

  // Submit Handlers
  const handleShipLogSubmit = async () => {
    if (!shipTitle.trim() || !shipPitch.trim() || !shipTechStack.trim()) {
      toast.error("Title, pitch, and tech stack are required");
      return;
    }
    setIsSubmitting(true);
    try {
      const techStackArr = shipTechStack.split(",").map((s) => s.trim()).filter(Boolean);
      await submitShipLogPost({
        title: shipTitle.trim(),
        pitch: shipPitch.trim(),
        demoUrl: shipDemoUrl.trim() || undefined,
        repoUrl: shipRepoUrl.trim() || undefined,
        techStack: techStackArr,
        feedbackWanted,
      });
      toast.success("Project Showcase published!");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to publish project showcase");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHackathonCrewSubmit = async () => {
    if (!hackName.trim() || !hackRolesNeed.trim()) {
      toast.error("Hackathon name and needed roles are required");
      return;
    }
    setIsSubmitting(true);
    try {
      const rolesHaveArr = hackRolesHave.split(",").map((s) => s.trim()).filter(Boolean);
      const rolesNeedArr = hackRolesNeed.split(",").map((s) => s.trim()).filter(Boolean);
      await submitHackathonCrewPost({
        hackathonId: selectedHackathonId !== "custom" ? selectedHackathonId : undefined,
        hackathonName: hackName.trim(),
        targetTrack: hackTargetTrack.trim() || undefined,
        urgencyDate: hackUrgencyDate || undefined,
        rolesHave: rolesHaveArr,
        rolesNeed: rolesNeedArr,
        commitmentLevel: hackCommitment,
        maxSquadSize: hackMaxSquadSize,
      });
      toast.success("Hackathon Squad Call published! Private workspace provisioned.");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to publish squad recruitment call");
    } finally {
      setIsSubmitting(false);
    }
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
        return;
      }

      const uploadResult = await uploadMediaFile({
        file: fileToUpload,
        onProgress: (p) => setUploadProgress(p),
      });

      if (!uploadResult.success || !uploadResult.fileUrl) {
        throw new Error(uploadResult.error || "Failed to upload media file");
      }

      const res = await createPost({
        fileUrl: uploadResult.fileUrl,
        caption: values.caption || "",
      });

      if (res?.errors) {
        toast.error("Failed to publish post");
        return;
      }

      toast.success("Media post published!");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to publish media post");
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  if (!mount) return null;

  return (
    <div>
      <Dialog
        open={isCreatePage}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOption(null);
            router.back();
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedOption && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-7 w-7 rounded-full"
                    onClick={() => setSelectedOption(null)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <div>
                  <DialogTitle className="text-lg font-bold">
                    {!selectedOption
                      ? "What developer workflow do you need?"
                      : selectedOption === "hackathonCrew"
                      ? "⚡ Squad Recruitment — Hackathon & Team Builder"
                      : selectedOption === "shipLog"
                      ? "🚀 Project Showcase & Ship Log"
                      : "🎬 Demo Reel & Visual Media"}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {!selectedOption
                      ? "Select the workflow for what you are building or recruiting for:"
                      : selectedOption === "hackathonCrew"
                      ? "Fill missing skill gaps (Frontend, AI, Smart Contracts) with an auto-provisioned private Squad Server."
                      : selectedOption === "shipLog"
                      ? "Showcase an MVP, open-source repo, or tool to collect feedback, demo traction, and stars."
                      : "Upload screen recordings, visual demo reels, or architecture snapshots."}
                  </p>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* MAIN MENU: Accepted Post Archetypes */}
          {!selectedOption && (
            <div className="flex flex-col space-y-3 py-3">
              <button
                type="button"
                className="flex items-start gap-4 p-4 rounded-xl border bg-card hover:bg-secondary/40 transition-all text-left group hover:border-amber-500/40"
                onClick={() => setSelectedOption("hackathonCrew")}
              >
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 group-hover:scale-105 transition-transform shrink-0">
                  <Zap className="h-6 w-6" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      Recruit Squad Teammates
                      <Badge variant="outline" className="text-[10px] py-0 border-amber-500/40 text-amber-500">Hackathons & OSS</Badge>
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Need teammates for an upcoming hackathon or side project? Broadcast the exact roles needed (Frontend, Backend, AI) and automatically create a private Squad Server with voice/text lounges.
                  </p>
                </div>
              </button>

              <button
                type="button"
                className="flex items-start gap-4 p-4 rounded-xl border bg-card hover:bg-secondary/40 transition-all text-left group hover:border-emerald-500/40"
                onClick={() => setSelectedOption("shipLog")}
              >
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 group-hover:scale-105 transition-transform shrink-0">
                  <Rocket className="h-6 w-6" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      Showcase Project & Product Demo
                      <Badge variant="outline" className="text-[10px] py-0 border-emerald-500/40 text-emerald-500">Showcase</Badge>
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Have you built an MVP, open-source tool, or library? Post your live demo URL, GitHub repository, tech stack tags, and request feedback from early adopters.
                  </p>
                </div>
              </button>

              <button
                type="button"
                className="flex items-start gap-4 p-4 rounded-xl border bg-card hover:bg-secondary/40 transition-all text-left group hover:border-neutral-500/40"
                onClick={() => setSelectedOption("media")}
              >
                <div className="p-3 rounded-xl bg-neutral-500/10 text-neutral-400 border border-neutral-500/20 group-hover:scale-105 transition-transform shrink-0">
                  <Film className="h-6 w-6" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      Demo Reel & Visual Media
                      <Badge variant="outline" className="text-[10px] py-0 border-neutral-500/40 text-neutral-400">Media</Badge>
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Upload screen recordings, visual demo reels, or architecture snapshots with rich cropping and video previews.
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* 1. SHIP LOG / PROJECT SHOWCASE FORM */}
          {selectedOption === "shipLog" && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Product / Project Name</Label>
                <Input
                  placeholder="e.g. FastKV — Embedded key-value store in Rust"
                  value={shipTitle}
                  onChange={(e) => setShipTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Pitch / Elevator Summary</Label>
                <Input
                  placeholder="What does it do and why did you build it?"
                  value={shipPitch}
                  onChange={(e) => setShipPitch(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Live Demo / Website URL</Label>
                  <Input
                    placeholder="https://mytool.dev"
                    value={shipDemoUrl}
                    onChange={(e) => setShipDemoUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>GitHub / Repository URL</Label>
                  <Input
                    placeholder="https://github.com/username/repo"
                    value={shipRepoUrl}
                    onChange={(e) => setShipRepoUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Tech Stack (Comma-separated)</Label>
                <Input
                  placeholder="e.g. Next.js, Rust, WebAssembly, Tailwind"
                  value={shipTechStack}
                  onChange={(e) => setShipTechStack(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Feedback You Are Seeking (Optional)</Label>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {["UI/UX Design", "Code Review", "Benchmark Testing", "Alpha Testers", "Security Audit"].map(
                    (tag) => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() =>
                          setFeedbackWanted((prev) =>
                            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                          )
                        }
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                          feedbackWanted.includes(tag)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary/40 text-muted-foreground border-border hover:border-foreground/30"
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedOption(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleShipLogSubmit}
                  disabled={isSubmitting || !shipTitle.trim() || !shipPitch.trim() || !shipTechStack.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Publish Project
                </Button>
              </div>
            </div>
          )}

          {/* 2. HACKATHON CREW CALL FORM */}
          {selectedOption === "hackathonCrew" && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5">
                <Zap className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-xs text-amber-600 dark:text-amber-400">
                  <span className="font-bold block">Auto-Provisioned Squad Workspace</span>
                  <span>
                    Broadcasting this crew call will automatically spin up a private Squad Server with #general, #resources, and a WebRTC pair-programming voice lounge.
                  </span>
                </div>
              </div>

              {/* Hackathon Selector */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-amber-500" />
                  Select Target Hackathon
                </Label>
                <Select
                  value={selectedHackathonId}
                  onValueChange={(val) => {
                    setSelectedHackathonId(val);
                    if (val === "custom") {
                      setHackName("");
                      setHackTracks([]);
                      setHackTargetTrack("");
                      setHackUrgencyDate("");
                    } else {
                      const match = hackathonList.find((h: any) => h._id === val);
                      if (match) {
                        setHackName(match.name);
                        if (match.submissionDeadline) {
                          setHackUrgencyDate(new Date(match.submissionDeadline).toISOString().split("T")[0]);
                        }
                        if (match.tracks && match.tracks.length > 0) {
                          setHackTracks(match.tracks);
                          setHackTargetTrack(match.tracks[0].name);
                        } else {
                          setHackTracks([]);
                          setHackTargetTrack("");
                        }
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a verified hackathon or custom" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">-- Custom / Other Hackathon --</SelectItem>
                    {hackathonList.map((h: any) => (
                      <SelectItem key={h._id} value={h._id}>
                        {h.name} {h.isVerified && "✓"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Hackathon / Competition Name</Label>
                <div className="relative">
                  <Input
                    placeholder="e.g. ETHGlobal Bangkok, Solana Radar Hackathon"
                    value={hackName}
                    onChange={(e) => setHackName(e.target.value)}
                    required
                  />
                  {selectedHackathonId !== "custom" && (
                    <span className="absolute right-3 top-2.5 flex items-center gap-1 text-[11px] font-bold text-amber-500">
                      <ShieldCheck className="h-3.5 w-3.5" /> Verified
                    </span>
                  )}
                </div>
              </div>

              {/* Track Selector */}
              {hackTracks.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Target Track / Category</Label>
                  <Select value={hackTargetTrack} onValueChange={(val) => setHackTargetTrack(val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select targeted track" />
                    </SelectTrigger>
                    <SelectContent>
                      {hackTracks.map((tr: any) => (
                        <SelectItem key={tr.name} value={tr.name}>
                          {tr.name} {tr.prizePool ? `(${tr.prizePool})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Submission Deadline</Label>
                  <Input
                    type="date"
                    value={hackUrgencyDate}
                    onChange={(e) => setHackUrgencyDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Max Squad Size</Label>
                  <Select
                    value={hackMaxSquadSize.toString()}
                    onValueChange={(val) => setHackMaxSquadSize(parseInt(val))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Squad Size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 Members (Duo)</SelectItem>
                      <SelectItem value="3">3 Members (Trio)</SelectItem>
                      <SelectItem value="4">4 Members (Standard)</SelectItem>
                      <SelectItem value="5">5 Members (Large)</SelectItem>
                      <SelectItem value="6">6 Members (Full Team)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Commitment Level</Label>
                  <Select
                    value={hackCommitment}
                    onValueChange={(val: any) => setHackCommitment(val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hardcore">🏆 Hardcore (Sprint to win)</SelectItem>
                      <SelectItem value="moderate">⚡ Moderate (Prototype + learn)</SelectItem>
                      <SelectItem value="casual">☕ Casual (Fun & exploratory)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Roles We Already Have (Comma-separated)</Label>
                <Input
                  placeholder="e.g. Backend Go, PyTorch ML Engineer"
                  value={hackRolesHave}
                  onChange={(e) => setHackRolesHave(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Roles We Urgently Need (Comma-separated)</Label>
                <Input
                  placeholder="e.g. Next.js Frontend Dev, Figma UI/UX Designer"
                  value={hackRolesNeed}
                  onChange={(e) => setHackRolesNeed(e.target.value)}
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedOption(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleHackathonCrewSubmit}
                  disabled={isSubmitting || !hackName.trim() || !hackRolesNeed.trim()}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-1.5"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Broadcast Squad Call
                </Button>
              </div>
            </div>
          )}

          {/* 3. MEDIA UPLOAD FORM */}
          {selectedOption === "media" && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleMediaSubmit)} className="space-y-4 py-2">
                {!!fileUrl && (
                  <div>
                    {isVideo ? (
                      <Card className="relative max-h-[360px] overflow-hidden mb-3">
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
                      <div className="relative h-64 w-full overflow-hidden rounded-lg mb-3">
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
                      <div className="relative h-64 w-full overflow-hidden rounded-lg mb-3">
                        <Image
                          src={croppedImage}
                          alt="Cropped Preview"
                          fill
                          className="object-cover rounded-lg"
                        />
                      </div>
                    )}

                    {!isVideo && !croppedImage && (
                      <Button
                        type="button"
                        onClick={showCroppedImage}
                        variant="secondary"
                        size="sm"
                        className="w-full mb-3"
                      >
                        Confirm Image Crop
                      </Button>
                    )}

                    <Button
                      type="button"
                      onClick={handleReselect}
                      variant="outline"
                      size="sm"
                      className="w-full mb-3"
                    >
                      Select Different File
                    </Button>
                  </div>
                )}

                {!fileUrl && (
                  <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 hover:bg-secondary/20 transition-colors cursor-pointer relative">
                    <CloudUpload className="h-10 w-10 text-primary mb-2" />
                    <p className="text-sm font-semibold">Click to select video demo or image</p>
                    <p className="text-xs text-muted-foreground mt-1">MP4, MOV, WebM, PNG, JPG (max 15MB)</p>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="caption"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Caption</FormLabel>
                      <FormControl>
                        <Input placeholder="Describe your demo reel or screenshot..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {uploadProgress !== null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Uploading to S3...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-3 border-t">
                  <Button variant="ghost" onClick={() => setSelectedOption(null)}>Back</Button>
                  <Button type="submit" disabled={isSubmitting || !fileUrl} className="font-semibold gap-1.5">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
                    Publish Media
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CreatePage;
