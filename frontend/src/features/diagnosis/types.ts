export type DiagnosisStatus =
  | "uploaded"
  | "analyzed"
  | "failed";

export type DiagnosisInferenceMode =
  | "development_stub"
  | "onnx_model";

export interface Diagnosis {
  id: string;
  field_id: string;
  original_filename: string;
  status: DiagnosisStatus;
  predicted_label: string | null;
  confidence: number | null;
  severity: string | null;
  advisory: string | null;
  created_at: string;
  inference_mode:
    DiagnosisInferenceMode;
  model_display_name: string;
  model_version: string | null;
}

export interface CreateDiagnosisPayload {
  fieldId: string;
  file: File;
}