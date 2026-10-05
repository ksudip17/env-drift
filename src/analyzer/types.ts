export interface ScanResult {
  used: Set<string>;
  dynamic: boolean;
  files: number;
}

export interface DriftResult {
  referenceFile: string;
  used: string[];
  documented: string[];
  missing: string[];
  unused: string[];
  dynamic: boolean;
  files: number;
  summary: {
    used: number;
    documented: number;
    missing: number;
    unused: number;
  };
}
