declare module 'quagga' {
  interface QuaggaConfig {
    inputStream: {
      name: string;
      type: string;
      target: HTMLElement | null;
      constraints?: {
        width: number | { min: number; ideal: number; max: number };
        height: number | { min: number; ideal: number; max: number };
        facingMode: string;
        aspectRatio?: { min: number; max: number };
      };
    };
    locator?: {
      patchSize: string;
      halfSample: boolean;
    };
    numOfWorkers?: number;
    decoder: {
      readers: string[];
    };
    locate?: boolean;
  }

  interface QuaggaJSResultObject {
    codeResult: {
      code: string;
      format: string;
    };
  }

  // Alias for compatibility
  type DetectionResult = QuaggaJSResultObject;

  interface Quagga {
    init(config: QuaggaConfig, callback: (err: Error | null) => void): void;
    start(): void;
    stop(): void;
    onDetected(callback: (result: QuaggaJSResultObject) => void): void;
    offDetected(callback?: (result: QuaggaJSResultObject) => void): void;
  }

  const quagga: Quagga;
  export default quagga;
  export { QuaggaJSResultObject, DetectionResult };
}