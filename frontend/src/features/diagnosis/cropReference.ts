import type { Diagnosis } from "./types";

export interface CropProfile {
  readonly crop: string;
  readonly botanicalName: string;
  readonly botanicalScope: "species" | "group";
  readonly sourceUrl: string;
  readonly sourceName: string;
  readonly conditions: readonly { readonly rawLabel: string; readonly name: string; readonly healthyReference: boolean }[];
}

/** Botanical references describe crop names, never a photo-confirmed species.
 * Conditions were generated from field_robust_v2_metadata.json (38 classes).
 * Taxon references checked against linked university/Kew sources, 2026-11-01.
 */
export const CROP_PROFILES: readonly CropProfile[] = [
  {
    "crop": "Apple",
    "botanicalName": "Malus spp.",
    "botanicalScope": "group",
    "sourceUrl": "https://plants.ces.ncsu.edu/plants/malus/",
    "sourceName": "NC State Extension",
    "conditions": [
      {
        "rawLabel": "Apple___Apple_scab",
        "name": "Apple scab",
        "healthyReference": false
      },
      {
        "rawLabel": "Apple___Black_rot",
        "name": "Black rot",
        "healthyReference": false
      },
      {
        "rawLabel": "Apple___Cedar_apple_rust",
        "name": "Cedar apple rust",
        "healthyReference": false
      },
      {
        "rawLabel": "Apple___healthy",
        "name": "Healthy",
        "healthyReference": true
      }
    ]
  },
  {
    "crop": "Blueberry",
    "botanicalName": "Vaccinium spp.",
    "botanicalScope": "group",
    "sourceUrl": "https://plants.ces.ncsu.edu/plants/vaccinium/common-name/blueberry/",
    "sourceName": "NC State Extension",
    "conditions": [
      {
        "rawLabel": "Blueberry___healthy",
        "name": "Healthy",
        "healthyReference": true
      }
    ]
  },
  {
    "crop": "Cherry",
    "botanicalName": "Prunus spp.",
    "botanicalScope": "group",
    "sourceUrl": "https://plants.ces.ncsu.edu/plants/prunus/",
    "sourceName": "NC State Extension",
    "conditions": [
      {
        "rawLabel": "Cherry_(including_sour)___Powdery_mildew",
        "name": "Powdery mildew",
        "healthyReference": false
      },
      {
        "rawLabel": "Cherry_(including_sour)___healthy",
        "name": "Healthy",
        "healthyReference": true
      }
    ]
  },
  {
    "crop": "Corn",
    "botanicalName": "Zea mays",
    "botanicalScope": "species",
    "sourceUrl": "https://plants.ces.ncsu.edu/plants/zea-mays/",
    "sourceName": "NC State Extension",
    "conditions": [
      {
        "rawLabel": "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
        "name": "Cercospora leaf spot Gray leaf spot",
        "healthyReference": false
      },
      {
        "rawLabel": "Corn_(maize)___Common_rust_",
        "name": "Common rust",
        "healthyReference": false
      },
      {
        "rawLabel": "Corn_(maize)___Northern_Leaf_Blight",
        "name": "Northern Leaf Blight",
        "healthyReference": false
      },
      {
        "rawLabel": "Corn_(maize)___healthy",
        "name": "Healthy",
        "healthyReference": true
      }
    ]
  },
  {
    "crop": "Grape",
    "botanicalName": "Vitis spp.",
    "botanicalScope": "group",
    "sourceUrl": "https://plants.ces.ncsu.edu/plants/vitis-vinifera/",
    "sourceName": "NC State Extension",
    "conditions": [
      {
        "rawLabel": "Grape___Black_rot",
        "name": "Black rot",
        "healthyReference": false
      },
      {
        "rawLabel": "Grape___Esca_(Black_Measles)",
        "name": "Esca (Black Measles)",
        "healthyReference": false
      },
      {
        "rawLabel": "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
        "name": "Leaf blight (Isariopsis Leaf Spot)",
        "healthyReference": false
      },
      {
        "rawLabel": "Grape___healthy",
        "name": "Healthy",
        "healthyReference": true
      }
    ]
  },
  {
    "crop": "Orange",
    "botanicalName": "Citrus spp. and hybrids",
    "botanicalScope": "group",
    "sourceUrl": "https://plants.ces.ncsu.edu/plants/citrus/",
    "sourceName": "NC State Extension",
    "conditions": [
      {
        "rawLabel": "Orange___Haunglongbing_(Citrus_greening)",
        "name": "Haunglongbing (Citrus greening)",
        "healthyReference": false
      }
    ]
  },
  {
    "crop": "Peach",
    "botanicalName": "Prunus persica",
    "botanicalScope": "species",
    "sourceUrl": "https://plants.ces.ncsu.edu/plants/prunus-persica/",
    "sourceName": "NC State Extension",
    "conditions": [
      {
        "rawLabel": "Peach___Bacterial_spot",
        "name": "Bacterial spot",
        "healthyReference": false
      },
      {
        "rawLabel": "Peach___healthy",
        "name": "Healthy",
        "healthyReference": true
      }
    ]
  },
  {
    "crop": "Bell Pepper",
    "botanicalName": "Capsicum annuum (bell pepper group)",
    "botanicalScope": "group",
    "sourceUrl": "https://plants.ces.ncsu.edu/plants/capsicum-annuum-grossum-group/",
    "sourceName": "NC State Extension",
    "conditions": [
      {
        "rawLabel": "Pepper,_bell___Bacterial_spot",
        "name": "Bacterial spot",
        "healthyReference": false
      },
      {
        "rawLabel": "Pepper,_bell___healthy",
        "name": "Healthy",
        "healthyReference": true
      }
    ]
  },
  {
    "crop": "Potato",
    "botanicalName": "Solanum tuberosum",
    "botanicalScope": "species",
    "sourceUrl": "https://plants.ces.ncsu.edu/plants/solanum-tuberosum/",
    "sourceName": "NC State Extension",
    "conditions": [
      {
        "rawLabel": "Potato___Early_blight",
        "name": "Early blight",
        "healthyReference": false
      },
      {
        "rawLabel": "Potato___Late_blight",
        "name": "Late blight",
        "healthyReference": false
      },
      {
        "rawLabel": "Potato___healthy",
        "name": "Healthy",
        "healthyReference": true
      }
    ]
  },
  {
    "crop": "Raspberry",
    "botanicalName": "Rubus spp.",
    "botanicalScope": "group",
    "sourceUrl": "https://plants.ces.ncsu.edu/plants/rubus/",
    "sourceName": "NC State Extension",
    "conditions": [
      {
        "rawLabel": "Raspberry___healthy",
        "name": "Healthy",
        "healthyReference": true
      }
    ]
  },
  {
    "crop": "Soybean",
    "botanicalName": "Glycine max",
    "botanicalScope": "species",
    "sourceUrl": "https://powo.science.kew.org/taxon/urn%3Alsid%3Aipni.org%3Anames%3A60450240-2",
    "sourceName": "Kew Science",
    "conditions": [
      {
        "rawLabel": "Soybean___healthy",
        "name": "Healthy",
        "healthyReference": true
      }
    ]
  },
  {
    "crop": "Squash",
    "botanicalName": "Cucurbita spp.",
    "botanicalScope": "group",
    "sourceUrl": "https://plants.ces.ncsu.edu/plants/cucurbita/",
    "sourceName": "NC State Extension",
    "conditions": [
      {
        "rawLabel": "Squash___Powdery_mildew",
        "name": "Powdery mildew",
        "healthyReference": false
      }
    ]
  },
  {
    "crop": "Strawberry",
    "botanicalName": "Fragaria spp. and hybrids",
    "botanicalScope": "group",
    "sourceUrl": "https://plants.ces.ncsu.edu/plants/fragaria-x-ananassa/common-name/strawberry/",
    "sourceName": "NC State Extension",
    "conditions": [
      {
        "rawLabel": "Strawberry___Leaf_scorch",
        "name": "Leaf scorch",
        "healthyReference": false
      },
      {
        "rawLabel": "Strawberry___healthy",
        "name": "Healthy",
        "healthyReference": true
      }
    ]
  },
  {
    "crop": "Tomato",
    "botanicalName": "Solanum lycopersicum",
    "botanicalScope": "species",
    "sourceUrl": "https://plants.ces.ncsu.edu/plants/solanum-lycopersicum/",
    "sourceName": "NC State Extension",
    "conditions": [
      {
        "rawLabel": "Tomato___Bacterial_spot",
        "name": "Bacterial spot",
        "healthyReference": false
      },
      {
        "rawLabel": "Tomato___Early_blight",
        "name": "Early blight",
        "healthyReference": false
      },
      {
        "rawLabel": "Tomato___Late_blight",
        "name": "Late blight",
        "healthyReference": false
      },
      {
        "rawLabel": "Tomato___Leaf_Mold",
        "name": "Leaf Mold",
        "healthyReference": false
      },
      {
        "rawLabel": "Tomato___Septoria_leaf_spot",
        "name": "Septoria leaf spot",
        "healthyReference": false
      },
      {
        "rawLabel": "Tomato___Spider_mites Two-spotted_spider_mite",
        "name": "Spider mites Two-spotted spider mite",
        "healthyReference": false
      },
      {
        "rawLabel": "Tomato___Target_Spot",
        "name": "Target Spot",
        "healthyReference": false
      },
      {
        "rawLabel": "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
        "name": "Tomato Yellow Leaf Curl Virus",
        "healthyReference": false
      },
      {
        "rawLabel": "Tomato___Tomato_mosaic_virus",
        "name": "Tomato mosaic virus",
        "healthyReference": false
      },
      {
        "rawLabel": "Tomato___healthy",
        "name": "Healthy",
        "healthyReference": true
      }
    ]
  }
];

const aliases: Readonly<Record<string, string>> = {
  apple: "Apple", blueberry: "Blueberry", cherry: "Cherry", "cherry including sour": "Cherry",
  corn: "Corn", maize: "Corn", "corn maize": "Corn", grape: "Grape", orange: "Orange", peach: "Peach",
  pepper: "Bell Pepper", "bell pepper": "Bell Pepper", "pepper bell": "Bell Pepper", potato: "Potato",
  raspberry: "Raspberry", soybean: "Soybean", squash: "Squash", strawberry: "Strawberry", tomato: "Tomato",
};
export function findCropProfile(value: string | null | undefined): CropProfile | null {
  const key = (value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const canonical = aliases[key];
  return canonical ? CROP_PROFILES.find(profile => profile.crop === canonical) ?? null : null;
}

export function hasKnownCropCoverage(modelVersion: string | null): boolean {
  return modelVersion === "field-robust-v2" || modelVersion === "field-candidate-20261029-epoch6" || modelVersion === "field-candidate-20261030-epoch6";
}

export function cropReferenceForResult(diagnosis: Diagnosis, selectedCrop?: string | null) {
  if (diagnosis.inference_mode !== "onnx_model" || diagnosis.status !== "analyzed") return null;
  const selected = findCropProfile(selectedCrop);
  const suggested = findCropProfile(diagnosis.predicted_crop);
  const profile = selected ?? suggested;
  if (!profile) return null;
  return {profile, basis: selected ? "selected" as const : "suggested" as const,
    mismatch: diagnosis.predicted_label === "crop_mismatch",
    coverageKnown: hasKnownCropCoverage(diagnosis.model_version)};
}
