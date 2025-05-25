export type FileResult = {
    path: string;
    type: string;
    confidence: number;
    size: number;
  };
  
  export type ExportResult = {
    file: string;
    symbol: string;
  };
  
  export type ScanResult = {
    unusedFiles?: FileResult[];
    unusedExports?: ExportResult[];
    type: string;
  };
  