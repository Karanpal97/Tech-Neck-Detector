"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, Info, Smartphone, Monitor, Clock, Loader2 } from "lucide-react"
import type { PoseLandmarkerInstance, PoseDetectionResult, DrawingUtilsInstance, LandmarkData } from "@/types/mediapipe"

const EXERCISE_TIPS = [
  {
    title: "Chin Tucks",
    description: "Pull your chin back towards your neck, creating a double chin. Hold for 5 seconds.",
    frequency: "10 reps, 3x daily",
    icon: "🔄",
    duration: "2 min",
  },
  {
    title: "Neck Stretches",
    description: "Gently tilt your head to each side, holding for 15-30 seconds.",
    frequency: "3 sets each direction",
    icon: "↔️",
    duration: "3 min",
  },
  {
    title: "Upper Trap Stretch",
    description: "Tilt head to one side while pulling opposite shoulder down.",
    frequency: "Hold 30 sec each side",
    icon: "⬇️",
    duration: "2 min",
  },
  {
    title: "Wall Angels",
    description: "Stand against wall, move arms up and down like making snow angels.",
    frequency: "15 reps, 3 sets",
    icon: "👼",
    duration: "4 min",
  },
  {
    title: "Doorway Chest Stretch",
    description: "Place forearm on doorframe, step forward to stretch chest.",
    frequency: "Hold 30 sec each arm",
    icon: "🚪",
    duration: "2 min",
  },
] as const

const PREVENTION_TIPS = [
  {
    category: "Phone Usage",
    icon: <Smartphone className="h-5 w-5" />,
    tips: [
      "Hold phone at eye level",
      "Use voice-to-text when possible",
      "Take breaks every 15 minutes",
      "Use a phone stand or holder",
    ],
  },
  {
    category: "Workstation Setup",
    icon: <Monitor className="h-5 w-5" />,
    tips: ["Monitor at eye level", "Feet flat on floor", "Shoulders relaxed", "Elbows at 90 degrees"],
  },
  {
    category: "Break Reminders",
    icon: <Clock className="h-5 w-5" />,
    tips: [
      "Take breaks every 30 minutes",
      "Look away from screen regularly",
      "Stand and stretch hourly",
      "Practice the 20-20-20 rule",
    ],
  },
] as const

export default function TechNeckDetector() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const demosSectionRef = useRef<HTMLDivElement>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("camera")
  const [detectedPoses, setDetectedPoses] = useState(0)
  const [isWebcamActive, setIsWebcamActive] = useState(false)
  const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarkerInstance | null>(null)

  // Store these in refs to access in prediction loop
  const webcamRunningRef = useRef(false)
  const runningModeRef = useRef<"IMAGE" | "VIDEO">("IMAGE")
  const lastVideoTimeRef = useRef(-1)

  useEffect(() => {
    // Load MediaPipe script
    const script = document.createElement("script")
    script.type = "module"
    script.innerHTML = `
      import {
        PoseLandmarker,
        FilesetResolver,
        DrawingUtils
      } from "https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0";

      window.PoseLandmarker = PoseLandmarker;
      window.FilesetResolver = FilesetResolver;
      window.DrawingUtils = DrawingUtils;
      
      // Create pose landmarker exactly like your code
      const createPoseLandmarker = async () => {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        window.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU"
          },
          runningMode: "IMAGE",
          numPoses: 2
        });
        
        // Signal that MediaPipe is ready
        window.dispatchEvent(new CustomEvent('mediapipe-ready'));
      };
      createPoseLandmarker();
    `
    document.head.appendChild(script)

    // Wait for MediaPipe to load
    const handleMediaPipeReady = () => {
      console.log("✅ MediaPipe loaded!")
      setPoseLandmarker(window.poseLandmarker || null)
      setIsLoading(false)

      if (demosSectionRef.current) {
        demosSectionRef.current.style.opacity = "1"
      }
    }

    window.addEventListener("mediapipe-ready", handleMediaPipeReady)

    return () => {
      window.removeEventListener("mediapipe-ready", handleMediaPipeReady)
    }
  }, [])

  // React button click handler
  const handleCameraToggle = async () => {
    if (!poseLandmarker) {
      console.log("Wait! poseLandmarker not loaded yet.")
      return
    }

    const video = videoRef.current
    const canvasElement = canvasRef.current

    if (!video || !canvasElement) return

    if (webcamRunningRef.current === true) {
      // Stop webcam
      webcamRunningRef.current = false
      setIsWebcamActive(false)

      // Stop video stream
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
        video.srcObject = null
      }
    } else {
      // Start webcam
      try {
        const constraints = {
          video: {
            width: { ideal: 640, min: 320, max: 1280 },
            height: { ideal: 480, min: 240, max: 720 },
            facingMode: "user",
          },
        }
        const stream = await navigator.mediaDevices.getUserMedia(constraints)

        video.srcObject = stream
        webcamRunningRef.current = true
        setIsWebcamActive(true)

        video.addEventListener("loadeddata", () => {
          console.log("📹 Video loaded, starting predictions")
          predictWebcam()
        })
      } catch (error) {
        console.error("Camera error:", error)
        alert("Could not access camera. Please check permissions.")
      }
    }
  }

  // Prediction function - exactly like your code
  const predictWebcam = async () => {
    if (!videoRef.current || !canvasRef.current || !poseLandmarker || !webcamRunningRef.current) {
      return
    }

    const video = videoRef.current
    const canvasElement = canvasRef.current

    // Responsive video sizing
    const containerWidth = Math.min(480, window.innerWidth - 32)
    const containerHeight = (containerWidth * 3) / 4 // 4:3 aspect ratio

    canvasElement.style.height = `${containerHeight}px`
    video.style.height = `${containerHeight}px`
    canvasElement.style.width = `${containerWidth}px`
    video.style.width = `${containerWidth}px`

    // Get canvas context and drawing utils
    const canvasCtx = canvasElement.getContext("2d")
    if (!canvasCtx) return

    const drawingUtils: DrawingUtilsInstance = new window.DrawingUtils(canvasCtx)

    // Switch to VIDEO mode if needed
    if (runningModeRef.current === "IMAGE") {
      runningModeRef.current = "VIDEO"
      await poseLandmarker.setOptions({ runningMode: "VIDEO" })
      console.log("🎥 Switched to VIDEO mode")
    }

    const startTimeMs = performance.now()
    if (lastVideoTimeRef.current !== video.currentTime) {
      lastVideoTimeRef.current = video.currentTime

      try {
        poseLandmarker.detectForVideo(video, startTimeMs, (result: PoseDetectionResult) => {
          canvasCtx.save()
          canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height)

          console.log("🎯 Detected poses:", result.landmarks?.length || 0)
          setDetectedPoses(result.landmarks?.length || 0)

          for (const landmark of result.landmarks) {
            drawingUtils.drawLandmarks(landmark, {
              radius: (data: LandmarkData) => window.DrawingUtils.lerp(data.from?.z || 0, -0.15, 0.1, 5, 1),
            })
            drawingUtils.drawConnectors(landmark, window.PoseLandmarker.POSE_CONNECTIONS)
          }
          canvasCtx.restore()
        })
      } catch (error) {
        console.error("Prediction error:", error)
      }
    }

    // Continue prediction loop
    if (webcamRunningRef.current === true) {
      window.requestAnimationFrame(predictWebcam)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="flex items-center justify-center p-6 sm:p-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 sm:h-12 sm:w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 mb-2 text-sm sm:text-base">Loading AI Model...</p>
              <p className="text-xs text-gray-500">This may take a moment</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 text-center">Tech Neck Detector</h1>
          <p className="text-gray-600 text-xs sm:text-sm md:text-base text-center mt-1">AI-powered posture analysis</p>
        </div>
      </div>

      {/* Mobile Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-2 sm:px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-10 sm:h-12">
              <TabsTrigger value="camera" className="text-xs sm:text-sm px-2">
                <Camera className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden xs:inline">Camera</span>
                <span className="xs:hidden">Cam</span>
              </TabsTrigger>
              <TabsTrigger value="exercises" className="text-xs sm:text-sm px-2">
                <span className="mr-1">💪</span>
                <span className="hidden xs:inline">Exercises</span>
                <span className="xs:hidden">Ex</span>
              </TabsTrigger>
              <TabsTrigger value="tips" className="text-xs sm:text-sm px-2">
                <Info className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden xs:inline">Tips</span>
                <span className="xs:hidden">Tips</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-2 sm:p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Camera Tab */}
          <TabsContent value="camera" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg md:text-xl">Live Pose Detection</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Position yourself in front of the camera for real-time detection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {/* Status */}
                <div className="text-xs text-gray-500 text-center space-y-1">
                  <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
                    <span>Status: {isWebcamActive ? "🟢 Running" : "🔴 Stopped"}</span>
                    <span>Poses: {detectedPoses}</span>
                    <span>AI: {poseLandmarker ? "✅ Ready" : "⏳ Loading"}</span>
                  </div>
                </div>

                {/* Camera view - Responsive */}
                <div className="bg-black rounded-lg overflow-hidden flex justify-center relative">
                  <div ref={demosSectionRef} style={{ opacity: 0.2, transition: "opacity 500ms ease-in-out" }}>
                    <div style={{ position: "relative" }}>
                      <video
                        ref={videoRef}
                        className="max-w-full h-auto"
                        style={{
                          width: "100%",
                          maxWidth: "480px",
                          height: "auto",
                          aspectRatio: "4/3",
                          display: "block",
                          transform: "rotateY(180deg)",
                          WebkitTransform: "rotateY(180deg)",
                          MozTransform: "rotateY(180deg)",
                        }}
                        autoPlay
                        playsInline
                        muted
                      />
                      <canvas
                        ref={canvasRef}
                        width={640}
                        height={480}
                        className="absolute inset-0 max-w-full h-auto"
                        style={{
                          width: "100%",
                          maxWidth: "480px",
                          height: "auto",
                          aspectRatio: "4/3",
                          transform: "rotateY(180deg)",
                          WebkitTransform: "rotateY(180deg)",
                          MozTransform: "rotateY(180deg)",
                          zIndex: 1,
                          pointerEvents: "none",
                        }}
                      />
                    </div>
                  </div>
                  {!isWebcamActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
                      <div className="text-center text-white p-4">
                        <Camera className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-xs sm:text-sm">Camera not active</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* React button with onClick - Responsive */}
                <div className="flex justify-center">
                  <button
                    onClick={handleCameraToggle}
                    disabled={!poseLandmarker}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors duration-200 text-sm sm:text-base w-full sm:w-auto sm:min-w-[200px]"
                  >
                    {isWebcamActive ? "DISABLE PREDICTIONS" : "ENABLE PREDICTIONS"}
                  </button>
                </div>

                {/* Instructions */}
                <div className="text-center text-xs sm:text-sm text-gray-600 space-y-2">
                  <p>
                    <strong>Instructions:</strong> Click the button above to start camera and see pose landmarks.
                  </p>
                  <p className="hidden sm:block">Check the browser console (F12) for debug messages.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Exercises Tab */}
          <TabsContent value="exercises" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
            <div className="grid gap-3 sm:gap-4">
              {EXERCISE_TIPS.map((exercise, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="text-xl sm:text-2xl flex-shrink-0">{exercise.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 text-sm sm:text-base">{exercise.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {exercise.duration}
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 leading-relaxed">
                          {exercise.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-xs">
                            {exercise.frequency}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Tips Tab */}
          <TabsContent value="tips" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
            <div className="grid gap-3 sm:gap-4">
              {PREVENTION_TIPS.map((category, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2 sm:pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm sm:text-base md:text-lg">
                      {category.icon}
                      {category.category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-1 sm:space-y-2">
                      {category.tips.map((tip, tipIndex) => (
                        <li key={tipIndex} className="flex items-start gap-2 text-xs sm:text-sm text-gray-600">
                          <span className="text-blue-500 mt-1 flex-shrink-0">•</span>
                          <span className="leading-relaxed">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Information Footer */}
        <Card className="mt-4 sm:mt-6">
          <CardContent className="p-3 sm:p-4">
            <div className="text-center text-xs sm:text-sm text-gray-600 space-y-2">
              <p>
                <strong>How it works:</strong> This app uses AI to analyze your posture in real-time by detecting key
                body landmarks.
              </p>
              <p>
                Tech neck occurs when your head is positioned too far forward relative to your shoulders, often caused
                by prolonged device use.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
