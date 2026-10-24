import {
  useEffect,
  useId,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";

import {
  ImageIcon,
  ShieldAlert,
  UploadCloud,
  X,
} from "lucide-react";

import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import {
  diagnosisApi,
} from "@/features/diagnosis/api/diagnosisApi";

import type {
  Diagnosis,
} from "@/features/diagnosis/types";

import type {
  CropField,
} from "@/features/fields/types";

import {
  ApiClientError,
} from "@/services/apiError";

import { inspectCropPhoto, type PhotoQualityResult } from "@/features/diagnosis/photoQuality";

import "@/features/diagnosis/diagnosis.css";


const MAX_FILE_SIZE =
  8 * 1024 * 1024;

const ACCEPTED_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);


interface ImageUploaderProps {
  fields: CropField[];

  onComplete: (
    diagnosis: Diagnosis,
  ) => void;
}


function validateFile(
  file: File,
): string | null {
  if (
    !ACCEPTED_TYPES.has(
      file.type,
    )
  ) {
    return "Choose a JPEG, PNG or WEBP crop image.";
  }

  if (
    file.size >
    MAX_FILE_SIZE
  ) {
    return "Image must be smaller than 8 MB.";
  }

  if (
    file.size === 0
  ) {
    return "The selected image is empty.";
  }

  return null;
}


export function ImageUploader({
  fields,
  onComplete,
}: ImageUploaderProps) {
  const inputId =
    useId();

  const queryClient =
    useQueryClient();

  const [
    fieldId,
    setFieldId,
  ] = useState("");

  const [
    selectedFile,
    setSelectedFile,
  ] = useState<File | null>(
    null,
  );

  const [
    previewUrl,
    setPreviewUrl,
  ] = useState("");

  const [
    localError,
    setLocalError,
  ] = useState("");

  const [
    dragging,
    setDragging,
  ] = useState(false);

  const [photoQuality, setPhotoQuality] = useState<PhotoQualityResult | null>(null);
  const [qualityPending, setQualityPending] = useState(false);
  const [continueAnyway, setContinueAnyway] = useState(false);

  useEffect(() => {
    let canceled = false;
    setPhotoQuality(null);
    setContinueAnyway(false);
    if (!selectedFile) {
      setQualityPending(false);
      return;
    }
    setQualityPending(true);
    void inspectCropPhoto(selectedFile).then((result) => {
      if (!canceled) {
        setPhotoQuality(result);
        setQualityPending(false);
      }
    });
    return () => { canceled = true; };
  }, [selectedFile]);


  useEffect(() => {
    if (
      !fieldId &&
      fields.length > 0
    ) {
      setFieldId(
        fields[0]?.id ??
          "",
      );
    }
  }, [
    fieldId,
    fields,
  ]);


  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return;
    }

    const objectUrl =
      URL.createObjectURL(
        selectedFile,
      );

    setPreviewUrl(
      objectUrl,
    );

    return () => {
      URL.revokeObjectURL(
        objectUrl,
      );
    };
  }, [
    selectedFile,
  ]);


  const mutation =
    useMutation({
      mutationFn:
        diagnosisApi.create,

      onSuccess:
        async (diagnosis) => {
          setSelectedFile(
            null,
          );

          setLocalError("");

          onComplete(
            diagnosis,
          );

          await queryClient.invalidateQueries({
            queryKey: [
              "diagnoses",
            ],
          });
        },
    });


  function chooseFile(
    file: File | undefined,
  ): void {
    if (!file) {
      return;
    }

    const validationError =
      validateFile(
        file,
      );

    if (validationError) {
      setSelectedFile(
        null,
      );

      setLocalError(
        validationError,
      );

      return;
    }

    setLocalError("");
    setPhotoQuality(null);
    setQualityPending(true);
    setContinueAnyway(false);
    setSelectedFile(
      file,
    );
  }


  function handleFileChange(
    event:
      ChangeEvent<HTMLInputElement>,
  ): void {
    chooseFile(
      event.target.files?.[0],
    );

    event.target.value =
      "";
  }


  function handleDrop(
    event:
      DragEvent<HTMLLabelElement>,
  ): void {
    event.preventDefault();

    setDragging(false);

    chooseFile(
      event.dataTransfer
        .files?.[0],
    );
  }


  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();

    if (
      !fieldId ||
      !selectedFile ||
      mutation.isPending ||
      qualityPending ||
      !photoQuality ||
      (photoQuality.status === "retake" && !continueAnyway)
    ) {
      return;
    }

    mutation.mutate({
      fieldId,
      file:
        selectedFile,
    });
  }


  const errorMessage =
    mutation.error instanceof
    ApiClientError
      ? mutation.error.message
      : mutation.isError
        ? "Crop image screening failed."
        : localError;


  return (
    <article className="panel diagnosis-upload-panel">
      <div className="diagnosis-section-heading">
        <span className="eyebrow">
          IMAGE SCREENING
        </span>

        <h2>
          Screen a crop image
        </h2>

        <p>
          Choose the field first,
          then upload a clear image
          of the affected leaf or
          plant area.
        </p>
      </div>

      <div className="simulation-notice">
        <ShieldAlert size={17} />

        <div>
          <strong>
            Field-robust crop screening
          </strong>

          <span>
            Supported crops are screened using
            the existing ONNX model. Calibration has not been
            independently confirmed for this model.
            Low-confidence and crop-mismatch cases
            should be reviewed, not forced.
          </span>
        </div>
      </div>

      <form
        className="diagnosis-form"
        onSubmit={
          handleSubmit
        }
      >
        <label className="diagnosis-field-label">
          <span>
            Crop field *
          </span>

          <select
            value={
              fieldId
            }
            onChange={(event) => {
              setFieldId(
                event.target.value,
              );
            }}
            required
          >
            {fields.map(
              (field) => (
                <option
                  key={field.id}
                  value={field.id}
                >
                  {field.name}
                  {" — "}
                  {field.crop_name}
                </option>
              ),
            )}
          </select>
        </label>

        <input
          id={inputId}
          className="diagnosis-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={
            handleFileChange
          }
        />

        <label
          htmlFor={inputId}
          className={
            dragging
              ? "diagnosis-dropzone diagnosis-dropzone--dragging"
              : "diagnosis-dropzone"
          }
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => {
            setDragging(false);
          }}
          onDrop={
            handleDrop
          }
        >
          {previewUrl ? (
            <div className="diagnosis-preview">
              <img
                src={previewUrl}
                alt="Selected crop preview"
              />
              <div className="cropguard-leaf-frame" aria-hidden="true" />

              <button
                type="button"
                className="diagnosis-remove-image"
                aria-label="Remove selected image"
                onClick={(event) => {
                  event.preventDefault();

                  setSelectedFile(
                    null,
                  );

                  setLocalError(
                    "",
                  );
                }}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className="diagnosis-drop-icon">
                <UploadCloud size={28} />
              </div>

              <strong>
                Drop crop image here
                or click to browse
              </strong>

              <span>
                JPEG, PNG or WEBP
                · maximum 8 MB
              </span>

              <ImageIcon size={18} />
            </>
          )}
        </label>

        {selectedFile ? (
          <div className="diagnosis-file-meta">
            <strong>
              {selectedFile.name}
            </strong>

            <span>
              {(
                selectedFile.size /
                1024 /
                1024
              ).toFixed(2)}
              {" MB"}
            </span>
          </div>
        ) : null}

        {selectedFile && (
          <section className="cropguard-photo-preflight" aria-label="Photo quality check" aria-live="polite">
            <strong>Photo check · {qualityPending ? "Checking…" : photoQuality?.status === "ready" ? "Basic checks passed" : photoQuality?.status === "retake" ? "Retake recommended" : "Review recommended"}</strong>
            {photoQuality?.width ? (
              <span>{photoQuality.width} × {photoQuality.height} pixels · local precheck only</span>
            ) : null}
            {photoQuality?.hints.map((hint) => <p key={hint}>{hint}</p>)}
            <p>For the clearest result: capture one whole plant, a focused leaf top and the underside separately. This release sends only the selected image; it does not combine three images yet.</p>
            <p>Keep the affected leaf large in the frame, avoid multiple plants and tap the leaf to focus.</p>
            {photoQuality?.status === "retake" && (
              <label className="cropguard-photo-override">
                <input type="checkbox" checked={continueAnyway} onChange={(event) => setContinueAnyway(event.target.checked)} />
                I understand the photo may not provide a useful result; continue anyway.
              </label>
            )}
          </section>
        )}

        {errorMessage ? (
          <div
            className="error-box"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}

        <button
          type="submit"
          className="button primary full"
          disabled={
            !selectedFile ||
            !fieldId ||
            mutation.isPending ||
            qualityPending ||
            !photoQuality ||
            (photoQuality.status === "retake" && !continueAnyway)
          }
        >
          {mutation.isPending
            ? "Screening image…"
            : "Run crop-health screening"}
        </button>
      </form>
    </article>
  );
}