declare module 'quagga' {
  interface QuaggaConfig {
    inputStream: {
      name: string;
      type: string;
      target: HTMLElement | null;
      constraints?: {
        width: number;
        height: number;
        facingMode: string;
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

  interface DetectionResult {
    codeResult: {
      code: string;
      format: string;
    };
  }

  interface Quagga {
    init(config: QuaggaConfig, callback: (err: any) => void): void;
    start(): void;
    stop(): void;
    onDetected(callback: (result: DetectionResult) => void): void;
    offDetected(): void;
  }

  const quagga: Quagga;
  export default quagga;
}