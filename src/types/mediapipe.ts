// Complete MediaPipe type definitions
export interface PoseLandmark {
  x: number
  y: number
  z: number
  visibility?: number
}

export interface PoseDetectionResult {
  landmarks: PoseLandmark[][]
  worldLandmarks?: PoseLandmark[][]
}

export interface MediaPipeVision {
  wasmLoaderPath?: string
  wasmBinaryPath?: string
}

export interface PoseLandmarkerOptions {
  baseOptions: {
    modelAssetPath: string
    delegate: "GPU" | "CPU"
  }
  runningMode: "IMAGE" | "VIDEO"
  numPoses: number
}

export interface PoseLandmarkerInstance {
  detectForVideo: (video: HTMLVideoElement, timestamp: number, callback: (result: PoseDetectionResult) => void) => void
  setOptions: (options: { runningMode: "IMAGE" | "VIDEO" }) => Promise<void>
}

export interface MediaPipePoseLandmarker {
  createFromOptions: (vision: MediaPipeVision, options: PoseLandmarkerOptions) => Promise<PoseLandmarkerInstance>
  POSE_CONNECTIONS: PoseConnection[]
}

export interface MediaPipeFilesetResolver {
  forVisionTasks: (wasmPath: string) => Promise<MediaPipeVision>
}

export interface PoseConnection {
  start: number
  end: number
}

export interface DrawingOptions {
  color?: string
  lineWidth?: number
  radius?: number | ((data: LandmarkData) => number)
}

export interface LandmarkData {
  from?: PoseLandmark
  to?: PoseLandmark
  index?: number
}

export interface DrawingUtilsInstance {
  drawLandmarks: (landmarks: PoseLandmark[], options?: DrawingOptions) => void
  drawConnectors: (landmarks: PoseLandmark[], connections: PoseConnection[], options?: DrawingOptions) => void
}

export interface MediaPipeDrawingUtils {
  new (ctx: CanvasRenderingContext2D): DrawingUtilsInstance
  lerp: (value: number, min: number, max: number, targetMin: number, targetMax: number) => number
}

export interface TechNeckDetectionResult {
  hasTechNeck: boolean
  score: number
}
