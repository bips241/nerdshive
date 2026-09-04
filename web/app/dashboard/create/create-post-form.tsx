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
  submitCodeSosPost,
  submitArchitectureRfcPost,
  submitHackathonCrewPost,
  submitTechShowdownPost,
} from "@/lib/actions";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CloudUpload,
  Film,
  Loader2,
  Rocket,
  Bug,
  Network,
  Zap,
  Swords,
  ChevronLeft,
  Code2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

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

  // 1. Ship Log State
  const [shipTitle, setShipTitle] = useState("");
  const [shipPitch, setShipPitch] = useState("");
  const [shipDemoUrl, setShipDemoUrl] = useState("");
  const [shipRepoUrl, setShipRepoUrl] = useState("");
  const [shipTechStack, setShipTechStack] = useState("");
  const [feedbackWanted, setFeedbackWanted] = useState<string[]>([
    "UI/UX Feedback",
    "Architecture Critique",
  ]);

  // 2. Code SOS State
  const [sosTitle, setSosTitle] = useState("");
  const [sosLanguage, setSosLanguage] = useState("typescript");
  const [sosSnippet, setSosSnippet] = useState("");
  const [sosErrorLog, setSosErrorLog] = useState("");
  const [sosEnvironment, setSosEnvironment] = useState("");
  const [sosTriedSteps, setSosTriedSteps] = useState("");

  // 3. Architecture RFC State
  const [rfcTitle, setRfcTitle] = useState("");
  const [rfcChallenge, setRfcChallenge] = useState("");
  const [rfcDiagram, setRfcDiagram] = useState("");
  const [rfcAudience, setRfcAudience] = useState("Senior / Staff Engineers");
  const [rfcTradeOffs, setRfcTradeOffs] = useState<Array<{ option: string; pros: string; cons: string }>>([
    { option: "Option A: Event-Driven Queue", pros: "Scalable & decoupled", cons: "Higher eventual consistency delay" },
    { option: "Option B: Direct RPC Gateway", pros: "Low latency & simpler", cons: "Coupled dependencies" },
  ]);

  // 4. Hackathon Crew State
  const [hackName, setHackName] = useState("");
  const [hackUrgencyDate, setHackUrgencyDate] = useState("");
  const [hackRolesHave, setHackRolesHave] = useState("");
  const [hackRolesNeed, setHackRolesNeed] = useState("");
  const [hackCommitment, setHackCommitment] = useState<"hardcore" | "moderate" | "casual">("moderate");

  // 5. Tech Showdown State
  const [showdownTopic, setShowdownTopic] = useState("");
  const [showdownOptionA, setShowdownOptionA] = useState("");
  const [showdownOptionADesc, setShowdownOptionADesc] = useState("");
  const [showdownOptionB, setShowdownOptionB] = useState("");
  const [showdownOptionBDesc, setShowdownOptionBDesc] = useState("");
  const [showdownBenchmark, setShowdownBenchmark] = useState("");

  // 6. Media State
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
      toast.success("Ship Log published!");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to publish Ship Log");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeSosSubmit = async () => {
    if (!sosTitle.trim() || !sosSnippet.trim()) {
      toast.error("Issue title and code snippet are required");
      return;
    }
    setIsSubmitting(true);
    try {
      await submitCodeSosPost({
        title: sosTitle.trim(),
        snippet: sosSnippet.trim(),
        language: sosLanguage,
        errorLog: sosErrorLog.trim() || undefined,
        environment: sosEnvironment.trim() || undefined,
        triedSteps: sosTriedSteps.trim() || undefined,
      });
      toast.success("Code SOS posted! Developers are notified.");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to post Code SOS");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchitectureRfcSubmit = async () => {
    if (!rfcTitle.trim() || !rfcChallenge.trim()) {
      toast.error("RFC title and system challenge are required");
      return;
    }
    setIsSubmitting(true);
    try {
      await submitArchitectureRfcPost({
        title: rfcTitle.trim(),
        challenge: rfcChallenge.trim(),
        diagramMarkdown: rfcDiagram.trim() || undefined,
        tradeOffs: rfcTradeOffs.filter((t) => t.option.trim()),
        targetAudience: rfcAudience,
      });
      toast.success("Architecture RFC posted for senior review!");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to post Architecture RFC");
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
        hackathonName: hackName.trim(),
        urgencyDate: hackUrgencyDate || undefined,
        rolesHave: rolesHaveArr,
        rolesNeed: rolesNeedArr,
        commitmentLevel: hackCommitment,
      });
      toast.success("Hackathon Crew call published!");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to post Hackathon Crew call");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTechShowdownSubmit = async () => {
    if (!showdownTopic.trim() || !showdownOptionA.trim() || !showdownOptionB.trim()) {
      toast.error("Topic and both options are required");
      return;
    }
    setIsSubmitting(true);
    try {
      await submitTechShowdownPost({
        topic: showdownTopic.trim(),
        optionAName: showdownOptionA.trim(),
        optionADescription: showdownOptionADesc.trim() || undefined,
        optionBName: showdownOptionB.trim(),
        optionBDescription: showdownOptionBDesc.trim() || undefined,
        benchmark: showdownBenchmark.trim() || undefined,
      });
      toast.success("Tech Showdown debate posted!");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to post Tech Showdown");
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
      <Dialog open={isCreatePage} onOpenChange={(open) => !open && router.back()}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedOption && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setSelectedOption(null)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <DialogTitle className="text-lg font-bold">
                  {!selectedOption
                    ? "Create on Nerdshive"
                    : selectedOption === "shipLog"
                    ? "🚀 Launchpad & Ship Log"
                    : selectedOption === "codeSos"
                    ? "🐛 Code SOS & Debug Request"
                    : selectedOption === "architectureRfc"
                    ? "📐 Architecture RFC & System Design"
                    : selectedOption === "hackathonCrew"
                    ? "⚡ Hackathon Crew Call"
                    : selectedOption === "techShowdown"
                    ? "⚔️ Tech Showdown & Debate"
                    : "🎬 Demo Reel & Media"}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          {/* MAIN MENU: 6 Developer Post Archetypes */}
          {!selectedOption && (
            <div className="flex flex-col space-y-2.5 py-3">
              <button
                type="button"
                className="flex items-start gap-3.5 p-3.5 rounded-xl border bg-card hover:bg-secondary/40 transition-colors text-left group"
                onClick={() => setSelectedOption("shipLog")}
              >
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                  <Rocket className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    Ship Log & Launchpad
                    <Badge variant="outline" className="text-[10px] py-0 border-emerald-500/40 text-emerald-500">Popular</Badge>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Showcase a live tool, MVP, or repo to get alpha testers, feedback, and stars.
                  </p>
                </div>
              </button>

              <button
                type="button"
                className="flex items-start gap-3.5 p-3.5 rounded-xl border bg-card hover:bg-secondary/40 transition-colors text-left group"
                onClick={() => setSelectedOption("codeSos")}
              >
                <div className="p-2.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 group-hover:scale-105 transition-transform">
                  <Bug className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-foreground">Code SOS / Debug with Me</h3>
                  <p className="text-xs text-muted-foreground">
                    Share failing code with stack traces and invite 1-click pair-debugging video sessions.
                  </p>
                </div>
              </button>

              <button
                type="button"
                className="flex items-start gap-3.5 p-3.5 rounded-xl border bg-card hover:bg-secondary/40 transition-colors text-left group"
                onClick={() => setSelectedOption("architectureRfc")}
              >
                <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-500 border border-purple-500/20 group-hover:scale-105 transition-transform">
                  <Network className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-foreground">Architecture RFC & System Design</h3>
                  <p className="text-xs text-muted-foreground">
                    Share system diagrams and design trade-offs for review by senior and staff engineers.
                  </p>
                </div>
              </button>

              <button
                type="button"
                className="flex items-start gap-3.5 p-3.5 rounded-xl border bg-card hover:bg-secondary/40 transition-colors text-left group"
                onClick={() => setSelectedOption("hackathonCrew")}
              >
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 group-hover:scale-105 transition-transform">
                  <Zap className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-foreground">Hackathon Crew Call</h3>
                  <p className="text-xs text-muted-foreground">
                    Form a winning team by broadcasting exact missing skill gaps with countdown urgency.
                  </p>
                </div>
              </button>

              <button
                type="button"
                className="flex items-start gap-3.5 p-3.5 rounded-xl border bg-card hover:bg-secondary/40 transition-colors text-left group"
                onClick={() => setSelectedOption("techShowdown")}
              >
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 group-hover:scale-105 transition-transform">
                  <Swords className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-foreground">Tech Showdown & Debate</h3>
                  <p className="text-xs text-muted-foreground">
                    Compare frameworks, databases, and architectures with benchmark data and structured voting.
                  </p>
                </div>
              </button>

              <button
                type="button"
                className="flex items-start gap-3.5 p-3.5 rounded-xl border bg-card hover:bg-secondary/40 transition-colors text-left group"
                onClick={() => setSelectedOption("media")}
              >
                <div className="p-2.5 rounded-lg bg-neutral-500/10 text-neutral-400 border border-neutral-500/20 group-hover:scale-105 transition-transform">
                  <Film className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-foreground">Demo Reel & Visual Media</h3>
                  <p className="text-xs text-muted-foreground">
                    Upload screen recordings, visual demo reels, or architecture snapshots.
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* 1. SHIP LOG FORM */}
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
                <Label>The Pitch & What You Built</Label>
                <textarea
                  placeholder="Explain why you built this, the architecture, and what makes it unique..."
                  rows={3}
                  value={shipPitch}
                  onChange={(e) => setShipPitch(e.target.value)}
                  className="w-full border rounded-md p-2.5 text-xs bg-background focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Live Demo URL</Label>
                  <Input
                    placeholder="https://app.yourproject.com"
                    value={shipDemoUrl}
                    onChange={(e) => setShipDemoUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>GitHub Repo URL</Label>
                  <Input
                    placeholder="https://github.com/user/project"
                    value={shipRepoUrl}
                    onChange={(e) => setShipRepoUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Tech Stack (Comma-separated)</Label>
                <Input
                  placeholder="Rust, WebSockets, Next.js, Docker"
                  value={shipTechStack}
                  onChange={(e) => setShipTechStack(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Feedback Desired</Label>
                <div className="flex flex-wrap gap-2">
                  {["UI/UX Feedback", "Architecture Critique", "Looking for Alpha Testers", "Seeking Contributors"].map((tag) => {
                    const isChecked = feedbackWanted.includes(tag);
                    return (
                      <Badge
                        key={tag}
                        variant={isChecked ? "default" : "outline"}
                        className="cursor-pointer text-xs py-1"
                        onClick={() =>
                          setFeedbackWanted((prev) =>
                            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                          )
                        }
                      >
                        {tag}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t">
                <Button variant="ghost" onClick={() => setSelectedOption(null)}>Back</Button>
                <Button onClick={handleShipLogSubmit} disabled={isSubmitting} className="font-semibold gap-1.5">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                  Publish Ship Log
                </Button>
              </div>
            </div>
          )}

          {/* 2. CODE SOS FORM */}
          {selectedOption === "codeSos" && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Issue / Bug Title</Label>
                <Input
                  placeholder="e.g. NextAuth cookie drops under HTTPS reverse proxy in Docker"
                  value={sosTitle}
                  onChange={(e) => setSosTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Language / Tech</Label>
                  <Select value={sosLanguage} onValueChange={setSosLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="typescript">TypeScript / Next.js</SelectItem>
                      <SelectItem value="javascript">JavaScript / Node.js</SelectItem>
                      <SelectItem value="python">Python / PyTorch</SelectItem>
                      <SelectItem value="rust">Rust</SelectItem>
                      <SelectItem value="go">Go</SelectItem>
                      <SelectItem value="docker">Docker / DevOps</SelectItem>
                      <SelectItem value="sql">PostgreSQL / MongoDB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Environment Context</Label>
                  <Input
                    placeholder="e.g. Node 20, Docker, macOS arm64"
                    value={sosEnvironment}
                    onChange={(e) => setSosEnvironment(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Code2 className="h-3.5 w-3.5 text-primary" />
                  Code Snippet
                </Label>
                <textarea
                  placeholder="// Paste the minimal reproducible code snippet here..."
                  rows={5}
                  value={sosSnippet}
                  onChange={(e) => setSosSnippet(e.target.value)}
                  className="w-full font-mono text-xs border rounded-md p-2.5 bg-neutral-950 text-emerald-400 focus:ring-1 focus:ring-primary"
                  spellCheck={false}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Error Log / Stack Trace</Label>
                <textarea
                  placeholder="Paste error logs, exception messages, or terminal output..."
                  rows={3}
                  value={sosErrorLog}
                  onChange={(e) => setSosErrorLog(e.target.value)}
                  className="w-full font-mono text-xs border rounded-md p-2 bg-neutral-900 text-red-400 focus:ring-1 focus:ring-primary"
                  spellCheck={false}
                />
              </div>

              <div className="space-y-1.5">
                <Label>What Have You Tried?</Label>
                <Input
                  placeholder="e.g. Cleared cookies, checked CORS origin, verified trustProxy flag"
                  value={sosTriedSteps}
                  onChange={(e) => setSosTriedSteps(e.target.value)}
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t">
                <Button variant="ghost" onClick={() => setSelectedOption(null)}>Back</Button>
                <Button onClick={handleCodeSosSubmit} disabled={isSubmitting} variant="destructive" className="font-semibold gap-1.5">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bug className="h-4 w-4" />}
                  Broadcast Code SOS
                </Button>
              </div>
            </div>
          )}

          {/* 3. ARCHITECTURE RFC FORM */}
          {selectedOption === "architectureRfc" && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>RFC Title & System Challenge</Label>
                <Input
                  placeholder="e.g. Migrating WebSockets Signaling to Redis Streams for 100k Concurrent Users"
                  value={rfcTitle}
                  onChange={(e) => setRfcTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Challenge, Constraints & Scale Requirements</Label>
                <textarea
                  placeholder="Detail the problem: current bottlenecks, target QPS, latency SLOs, and memory caps..."
                  rows={3}
                  value={rfcChallenge}
                  onChange={(e) => setRfcChallenge(e.target.value)}
                  className="w-full text-xs border rounded-md p-2.5 bg-background focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Architecture Diagram Flow (Mermaid or ASCII)</Label>
                <textarea
                  placeholder="flowchart TD&#10;  Client --> Gateway&#10;  Gateway --> RedisStream&#10;  RedisStream --> WorkerService"
                  rows={4}
                  value={rfcDiagram}
                  onChange={(e) => setRfcDiagram(e.target.value)}
                  className="w-full font-mono text-xs border rounded-md p-2.5 bg-neutral-950 text-purple-300 focus:ring-1 focus:ring-primary"
                  spellCheck={false}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Target Reviewers</Label>
                <Input
                  value={rfcAudience}
                  onChange={(e) => setRfcAudience(e.target.value)}
                  placeholder="e.g. Distributed systems engineers, backend architects"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t">
                <Button variant="ghost" onClick={() => setSelectedOption(null)}>Back</Button>
                <Button onClick={handleArchitectureRfcSubmit} disabled={isSubmitting} className="font-semibold gap-1.5">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />}
                  Submit RFC for Review
                </Button>
              </div>
            </div>
          )}

          {/* 4. HACKATHON CREW FORM */}
          {selectedOption === "hackathonCrew" && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Hackathon / Competition Name</Label>
                <Input
                  placeholder="e.g. HackMIT 2026, ETHGlobal DevConnect, MLH Local Hack Day"
                  value={hackName}
                  onChange={(e) => setHackName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Urgency / Registration Deadline</Label>
                  <Input
                    type="date"
                    value={hackUrgencyDate}
                    onChange={(e) => setHackUrgencyDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Team Commitment Level</Label>
                  <Select
                    value={hackCommitment}
                    onValueChange={(val: any) => setHackCommitment(val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hardcore">🏆 Hardcore (Sprint to win prizes)</SelectItem>
                      <SelectItem value="moderate">⚡ Moderate (Solid prototype + learning)</SelectItem>
                      <SelectItem value="casual">☕ Casual (Fun networking & exploratory)</SelectItem>
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

              <div className="flex justify-between items-center pt-3 border-t">
                <Button variant="ghost" onClick={() => setSelectedOption(null)}>Back</Button>
                <Button onClick={handleHackathonCrewSubmit} disabled={isSubmitting} className="font-semibold gap-1.5">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  Broadcast Crew Call
                </Button>
              </div>
            </div>
          )}

          {/* 5. TECH SHOWDOWN FORM */}
          {selectedOption === "techShowdown" && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Debate Topic / Showdown Title</Label>
                <Input
                  placeholder="e.g. Bun vs Node 22 for High-Throughput Microservices"
                  value={showdownTopic}
                  onChange={(e) => setShowdownTopic(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 border rounded-xl space-y-2 bg-secondary/20">
                  <Label className="text-xs font-bold text-primary">Option A</Label>
                  <Input
                    placeholder="e.g. Bun"
                    value={showdownOptionA}
                    onChange={(e) => setShowdownOptionA(e.target.value)}
                    required
                  />
                  <Input
                    placeholder="Tagline / Key advantage"
                    value={showdownOptionADesc}
                    onChange={(e) => setShowdownOptionADesc(e.target.value)}
                  />
                </div>

                <div className="p-3 border rounded-xl space-y-2 bg-secondary/20">
                  <Label className="text-xs font-bold text-primary">Option B</Label>
                  <Input
                    placeholder="e.g. Node.js 22"
                    value={showdownOptionB}
                    onChange={(e) => setShowdownOptionB(e.target.value)}
                    required
                  />
                  <Input
                    placeholder="Tagline / Key advantage"
                    value={showdownOptionBDesc}
                    onChange={(e) => setShowdownOptionBDesc(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Benchmark Data / Notes (Optional)</Label>
                <Input
                  placeholder="e.g. Req/sec: Bun 65k vs Node 38k; Memory: Bun 35MB vs Node 55MB"
                  value={showdownBenchmark}
                  onChange={(e) => setShowdownBenchmark(e.target.value)}
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t">
                <Button variant="ghost" onClick={() => setSelectedOption(null)}>Back</Button>
                <Button onClick={handleTechShowdownSubmit} disabled={isSubmitting} className="font-semibold gap-1.5">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
                  Launch Tech Showdown
                </Button>
              </div>
            </div>
          )}

          {/* 6. MEDIA UPLOAD FORM */}
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
