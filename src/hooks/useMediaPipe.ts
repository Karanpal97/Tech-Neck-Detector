"use client"

import { useState, useEffect } from "react"

// MediaPipe types based on the working example
interface MediaPipePoseLandmarker {
  createFromOptions: (vision: any, options: any) => Promise<any>
  detectForVideo: (video: HTMLVideoElement, timestamp: number, callback: (result: any) => void) => void
  setOptions: (options: { runningMode: string }) => Promise<void>
  POSE_CONNECTIONS: any[]
}

interface MediaPipeFilesetResolver {
  forVisionTasks: (wasmPath: string) => Promise<any>
}

interface MediaPipeDrawingUtils {
  new (
    ctx: CanvasRenderingContext2D,
  ): {
    drawLandmarks: (landmarks: any[], options?: any) => void
    drawConnectors: (landmarks: any[], connections: any[], options?: any) => void
  }
  lerp: (from: number, to: number, t: number, min: number, max: number) => number
}

declare global {
  interface Window {
    PoseLandmarker: MediaPipePoseLandmarker
    FilesetResolver: MediaPipeFilesetResolver
    DrawingUtils: MediaPipeDrawingUtils
  }
}

export function useMediaPipe() {
  const [poseLandmarker, setPoseLandmarker] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadMediaPipe = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Check if MediaPipe is already loaded
        if (window.PoseLandmarker && window.FilesetResolver && window.DrawingUtils) {
          await initializeMediaPipe()
          return
        }

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
          
          // Dispatch event when loaded
          window.dispatchEvent(new CustomEvent('mediapipe-loaded'));
        `

        // Add script to document
        document.head.appendChild(script)

        // Wait for MediaPipe to load
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("MediaPipe loading timeout"))
          }, 30000) // 30 second timeout

          const handleLoad = () => {
            clearTimeout(timeout)
            window.removeEventListener("mediapipe-loaded", handleLoad)
            resolve()
          }

          window.addEventListener("mediapipe-loaded", handleLoad)

          // Also check periodically in case event doesn't fire
          const checkInterval = setInterval(() => {
            if (window.PoseLandmarker && window.FilesetResolver && window.DrawingUtils) {
              clearInterval(checkInterval)
              clearTimeout(timeout)
              window.removeEventListener("mediapipe-loaded", handleLoad)
              resolve()
            }
          }, 100)
        })

        await initializeMediaPipe()
      } catch (err) {
        console.error("MediaPipe loading error:", err)
        if (isMounted) {
          setError("Failed to load MediaPipe. Please check your internet connection and try again.")
          setIsLoading(false)
        }
      }
    }

    const initializeMediaPipe = async () => {
      try {
        // Initialize MediaPipe exactly like the working example
        const vision = await window.FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm",
        )

        const landmarker = await window.PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        })

        if (isMounted) {
          setPoseLandmarker(landmarker)
          setIsLoading(false)
        }
      } catch (err) {
        console.error("MediaPipe initialization error:", err)
        if (isMounted) {
          setError("Failed to initialize MediaPipe model.")
          setIsLoading(false)
        }
      }
    }

    loadMediaPipe()

    return () => {
      isMounted = false
    }
  }, [])

  return { poseLandmarker, isLoading, error }
}
