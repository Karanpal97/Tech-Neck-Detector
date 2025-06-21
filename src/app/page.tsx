"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Camera,
  CameraOff,
  AlertTriangle,
  CheckCircle,
  Info,
  Smartphone,
  Monitor,
  Clock,
  RefreshCw,
  Wifi,
} from "lucide-react"
import { useMediaPipe } from "@/hooks/useMediaPipe"
import { useCamera } from "@/hooks/useCamera"

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
]

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
]

interface PostureStatus {
  status: string
  color: string
  icon: typeof CheckCircle
}

export default function TechNeckDetector() {
  const [techNeckDetected, setTechNeckDetected] = useState(false)
  const [postureScore, setPostureScore] = useState(0)
  const [detectionCount, setDetectionCount] = useState(0)
  const [activeTab, setActiveTab] = useState("camera")
  const [runningMode, setRunningMode] = useState("IMAGE")

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(null)
  const lastVideoTimeRef = useRef(-1)

  const { poseLandmarker, isLoading: isMediaPipeLoading, error: mediaPipeError } = useMediaPipe()
  const {
    isActive: isWebcamActive,
    error: cameraError,
    isSupported: isCameraSupported,
    startCamera,
    stopCamera,
  } = useCamera()

  // Tech neck detection algorithm
  const detectTechNeck = useCallback((landmarks: any[]) => {
    if (landmarks.length < 33) return { hasTechNeck: false, score: 0 }

    // Key landmarks for tech neck detection
    const nose = landmarks[0]
    const leftEar = landmarks[7]
    const rightEar = landmarks[8]
    const leftShoulder = landmarks[11]
    const rightShoulder = landmarks[12]

    // Validate landmarks exist
    if (!nose || !leftEar || !rightEar || !leftShoulder || !rightShoulder) {
      return { hasTechNeck: false, score: 0 }
    }

    // Calculate average ear and shoulder positions
    const avgEarX = (leftEar.x + rightEar.x) / 2
    const avgShoulderX = (leftShoulder.x + rightShoulder.x) / 2
    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2
    const avgEarY = (leftEar.y + rightEar.y) / 2

    // Calculate forward head posture
    const headForwardDistance = Math.abs(avgEarX - avgShoulderX)
    const neckLength = Math.abs(avgEarY - avgShoulderY)

    // Prevent division by zero
    if (neckLength === 0) return { hasTechNeck: false, score: 0 }

    // Normalize the forward distance by neck length
    const forwardRatio = headForwardDistance / neckLength

    // Tech neck threshold (adjust based on testing)
    const techNeckThreshold = 0.15
    const hasTechNeck = forwardRatio > techNeckThreshold

    // Calculate posture score (0-100, higher is better)
    const score = Math.max(0, Math.min(100, (1 - forwardRatio / 0.3) * 100))

    return { hasTechNeck, score: Math.round(score) }
  }, [])

  // Start webcam
  const handleStartWebcam = async () => {
    if (!poseLandmarker || !videoRef.current) return

    const success = await startCamera(videoRef.current)
    if (success && videoRef.current) {
      videoRef.current.addEventListener("loadeddata", () => {
        predictWebcam()
      })
    }
  }

  // Stop webcam
  const handleStopWebcam = () => {
    stopCamera()
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    setTechNeckDetected(false)
    setPostureScore(0)
    setRunningMode("IMAGE")
  }

  // Webcam prediction loop - exactly like the working example
  const predictWebcam = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !poseLandmarker || !isWebcamActive) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx || video.readyState < 2) {
      if (isWebcamActive) {
        animationRef.current = requestAnimationFrame(predictWebcam)
      }
      return
    }

    // Set canvas size to match video
    canvas.style.height = "360px"
    canvas.style.width = "480px"

    // Switch to VIDEO mode if needed
    if (runningMode === "IMAGE") {
      setRunningMode("VIDEO")
      await poseLandmarker.setOptions({ runningMode: "VIDEO" })
    }

    const startTimeMs = performance.now()

    if (lastVideoTimeRef.current !== video.currentTime) {
      lastVideoTimeRef.current = video.currentTime

      try {
        poseLandmarker.detectForVideo(video, startTimeMs, (result: any) => {
          ctx.save()
          ctx.clearRect(0, 0, canvas.width, canvas.height)

          if (result.landmarks && result.landmarks.length > 0) {
            const landmarks = result.landmarks[0]

            // Detect tech neck
            const { hasTechNeck, score } = detectTechNeck(landmarks)
            setTechNeckDetected(hasTechNeck)
            setPostureScore(score)

            if (hasTechNeck) {
              setDetectionCount((prev) => prev + 1)
            }

            // Draw pose landmarks using MediaPipe's DrawingUtils
            if (window.DrawingUtils) {
              const drawingUtils = new window.DrawingUtils(ctx)

              // Draw landmarks
              drawingUtils.drawLandmarks(landmarks, {
                radius: (data: any) => window.DrawingUtils.lerp(data.from?.z || 0, -0.15, 0.1, 5, 1),
              })

              // Draw connections
              drawingUtils.drawConnectors(landmarks, window.PoseLandmarker.POSE_CONNECTIONS)
            }
          }

          ctx.restore()
        })
      } catch (error) {
        console.error("Prediction error:", error)
      }
    }

    if (isWebcamActive) {
      animationRef.current = requestAnimationFrame(predictWebcam)
    }
  }, [poseLandmarker, isWebcamActive, detectTechNeck, runningMode])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      stopCamera()
    }
  }, [stopCamera])

  const getPostureStatus = (): PostureStatus => {
    if (postureScore >= 80) return { status: "Excellent", color: "bg-green-500", icon: CheckCircle }
    if (postureScore >= 60) return { status: "Good", color: "bg-blue-500", icon: Info }
    if (postureScore >= 40) return { status: "Fair", color: "bg-yellow-500", icon: AlertTriangle }
    return { status: "Poor", color: "bg-red-500", icon: AlertTriangle }
  }

  const postureStatus = getPostureStatus()
  const StatusIcon = postureStatus.icon

  // Loading state
  if (isMediaPipeLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 mb-2">Loading AI Model...</p>
              <p className="text-xs text-gray-500">This may take a moment</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (mediaPipeError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center">
              <Wifi className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
              <p className="text-gray-600 mb-4">
                Unable to load the AI model. Please check your internet connection and try again.
              </p>
              <Button onClick={() => window.location.reload()} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
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
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">Tech Neck Detector</h1>
          <p className="text-gray-600 text-sm sm:text-base text-center mt-1">AI-powered posture analysis</p>
        </div>
      </div>

      {/* Mobile Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-12">
              <TabsTrigger value="camera" className="text-xs sm:text-sm">
                <Camera className="h-4 w-4 mr-1" />
                Camera
              </TabsTrigger>
              <TabsTrigger value="exercises" className="text-xs sm:text-sm">
                <span className="mr-1">💪</span>
                Exercises
              </TabsTrigger>
              <TabsTrigger value="tips" className="text-xs sm:text-sm">
                <Info className="h-4 w-4 mr-1" />
                Tips
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Camera Tab */}
          <TabsContent value="camera" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl">Live Posture Analysis</CardTitle>
                <CardDescription className="text-sm">
                  Position yourself in front of the camera for real-time detection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Camera Support Check */}
                {!isCameraSupported && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      Camera is not supported on this device or browser.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Camera Error */}
                {cameraError && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">{cameraError}</AlertDescription>
                  </Alert>
                )}

                {/* Camera View */}
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover transform scale-x-[-1]"
                    autoPlay
                    playsInline
                    muted
                  />
                  <canvas
                    ref={canvasRef}
                    width={640}
                    height={480}
                    className="absolute top-0 left-0 w-full h-full transform scale-x-[-1]"
                  />
                  {!isWebcamActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
                      <div className="text-center text-white">
                        <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Camera not active</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Camera Controls */}
                <Button
                  onClick={isWebcamActive ? handleStopWebcam : handleStartWebcam}
                  className="w-full h-12 text-base"
                  variant={isWebcamActive ? "destructive" : "default"}
                  size="lg"
                  disabled={!isCameraSupported || !poseLandmarker}
                >
                  {isWebcamActive ? (
                    <>
                      <CameraOff className="h-5 w-5 mr-2" />
                      Stop Camera
                    </>
                  ) : (
                    <>
                      <Camera className="h-5 w-5 mr-2" />
                      Start Camera
                    </>
                  )}
                </Button>

                {/* Posture Status */}
                {isWebcamActive && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">Posture Score:</span>
                      <Badge className={`${postureStatus.color} text-white px-3 py-1`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {postureScore}/100
                      </Badge>
                    </div>

                    <div className="text-center">
                      <div
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${postureStatus.color} text-white`}
                      >
                        {postureStatus.status} Posture
                      </div>
                    </div>

                    {techNeckDetected && (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800 text-sm">
                          <strong>Tech Neck Detected!</strong> Your head is positioned too far forward. Check the
                          exercise tips to improve your posture.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="text-xs text-gray-500 text-center">Detection count: {detectionCount}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Exercises Tab */}
          <TabsContent value="exercises" className="space-y-4 mt-4">
            <div className="grid gap-4">
              {EXERCISE_TIPS.map((exercise, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl flex-shrink-0">{exercise.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 text-sm sm:text-base">{exercise.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {exercise.duration}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3 leading-relaxed">{exercise.description}</p>
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
          <TabsContent value="tips" className="space-y-4 mt-4">
            <div className="grid gap-4">
              {PREVENTION_TIPS.map((category, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      {category.icon}
                      {category.category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-2">
                      {category.tips.map((tip, tipIndex) => (
                        <li key={tipIndex} className="flex items-start gap-2 text-sm text-gray-600">
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
        <Card className="mt-6">
          <CardContent className="p-4">
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
