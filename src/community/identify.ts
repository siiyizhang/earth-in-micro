import * as ort from "onnxruntime-web/wasm";
import wasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";
import wasmModuleUrl from "onnxruntime-web/ort-wasm-simd-threaded.mjs?url";

type ModelConfig = {
  image_size: number;
  image_mean: number[];
  image_std: number[];
  ranks: string[];
  vocab: Record<string, string[]>;
  gate_calibration?: { threshold: number };
};
export type Prediction = {
  rank: string;
  label: string;
  name: string;
  probability: number;
};
let initialization:
  | Promise<{
      session: ort.InferenceSession;
      config: ModelConfig;
      names: Record<string, string>;
    }>
  | undefined;
async function initialize() {
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.wasmPaths = { wasm: wasmUrl, mjs: wasmModuleUrl };
  const [configResponse, namesResponse] = await Promise.all([
    fetch("/community-model/model_config.json"),
    fetch("/community-model/display_names.json"),
  ]);
  if (!configResponse.ok || !namesResponse.ok)
    throw new Error(
      "The identification model could not load. Please try again.",
    );
  const [config, names, session] = await Promise.all([
    configResponse.json() as Promise<ModelConfig>,
    namesResponse.json() as Promise<Record<string, string>>,
    ort.InferenceSession.create("/community-model/student.onnx", {
      executionProviders: ["wasm"],
    }),
  ]);
  return { session, config, names };
}
export async function identify(file: Blob) {
  initialization ??= initialize().catch((error) => {
    initialization = undefined;
    throw error;
  });
  const { session, config, names } = await initialization;
  const bitmap = await createImageBitmap(file),
    size = config.image_size;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Image processing is unavailable in this browser.");
  }
  const scale = size / Math.max(bitmap.width, bitmap.height),
    width = Math.max(1, Math.round(bitmap.width * scale)),
    height = Math.max(1, Math.round(bitmap.height * scale));
  context.fillStyle = "black";
  context.fillRect(0, 0, size, size);
  context.drawImage(
    bitmap,
    Math.floor((size - width) / 2),
    Math.floor((size - height) / 2),
    width,
    height,
  );
  bitmap.close();
  const pixels = context.getImageData(0, 0, size, size).data,
    input = new Float32Array(3 * size * size);
  for (let i = 0; i < size * size; i++)
    for (let c = 0; c < 3; c++)
      input[c * size * size + i] =
        (pixels[4 * i + c] / 255 - config.image_mean[c]) / config.image_std[c];
  const tensor = new ort.Tensor("float32", input, [1, 3, size, size]);
  const outputs = await session.run({ [session.inputNames[0]]: tensor });
  try {
    const probabilities: Prediction[] = config.ranks.flatMap((rank) => {
      const values = outputs[rank]?.data;
      if (!values) return [];
      return config.vocab[rank]
        .map((label, i) => ({
          rank: rank.toLowerCase(),
          label,
          name: names[label] ?? label,
          probability: Number(values[i]),
        }))
        .sort((a, b) => b.probability - a.probability);
    });
    const organismProbability = Number(outputs.object_type?.data[0] ?? 1);
    return {
      predictions: config.ranks.flatMap(rank => probabilities.filter(p => p.rank === rank.toLowerCase()).slice(0, 5)),
      probabilities,
      organismProbability,
      likelyOrganism:
        organismProbability >= (config.gate_calibration?.threshold ?? 0.5),
    };
  } finally {
    tensor.dispose();
    Object.values(outputs).forEach((output) => output.dispose());
  }
}
