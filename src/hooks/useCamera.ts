"use client"

import { useState, useRef, useCallback } from "react"

export function useCamera() {
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(true)
  const streamRef = useRef<MediaStream | null>(null)

  const checkCameraSupport = useCallback(() => {
    const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    setIsSupported(hasGetUserMedia)
    return hasGetUserMedia
  }, [])

  const startCamera = useCallback(
    async (videoElement: HTMLVideoElement | null) => {
      if (!videoElement) return false

      try {
        setError(null)

        if (!checkCameraSupport()) {
          throw new Error("Camera not supported on this device")
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640, min: 320, max: 1280 },
            height: { ideal: 480, min: 240, max: 720 },
            facingMode: "user",
          },
          audio: false,
        })

        videoElement.srcObject = stream
        streamRef.current = stream
        setIsActive(true)

        return true
      } catch (err) {
        console.error("Camera error:", err)
        let errorMessage = "Failed to access camera"

        if (err instanceof Error) {
          if (err.name === "NotAllowedError") {
            errorMessage = "Camera permission denied. Please allow camera access and try again."
          } else if (err.name === "NotFoundError") {
            errorMessage = "No camera found on this device."
          } else if (err.name === "NotReadableError") {
            errorMessage = "Camera is already in use by another application."
          } else {
            errorMessage = err.message
          }
        }

        setError(errorMessage)
        setIsActive(false)
        return false
      }
    },
    [checkCameraSupport],
  )

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
      })
      streamRef.current = null
    }
    setIsActive(false)
    setError(null)
  }, [])

  return {
    isActive,
    error,
    isSupported,
    startCamera,
    stopCamera,
    checkCameraSupport,
  }
}
