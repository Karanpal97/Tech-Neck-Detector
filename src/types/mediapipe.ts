// Simplified MediaPipe type definitions
export interface PoseLandmark {
  x: number
  y: number
  z: number
  visibility?: number
}

export interface PoseDetectionResult {
  landmarks: PoseLandmark[][]
}

export interface PoseLandmarkerInstance {
  detectForVideo: (video: HTMLVideoElement, timestamp: number, callback: (result: PoseDetectionResult) => void) => void
  setOptions: (options: { runningMode: string }) => Promise<void>
}

export interface DrawingUtilsInstance {
  drawLandmarks: (landmarks: PoseLandmark[], options?: { color?: string; radius?: number }) => void
  drawConnectors: (
    landmarks: PoseLandmark[],
    connections: unknown[],
    options?: { color?: string; lineWidth?: number },
  ) => void
}
