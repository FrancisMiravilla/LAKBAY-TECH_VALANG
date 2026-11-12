// Makes an uploaded .glb loadable by the phone's AR renderer (Viro).
//
// GLB "compressor" tools shrink files with Draco or meshopt geometry
// compression, quantized vertices and WebP/AVIF textures. The admin preview
// (three.js) reads all of those, but Viro's loader reads none of them, so the
// model shows up in the browser yet never appears on the scanned artwork.
// This undoes those encodings in the browser before upload: geometry becomes
// plain float data and textures become JPEG/PNG (max 2048 px).
//
// AI-generated models (e.g. Meshy) can hold 1-2+ million triangles; Draco
// only hides that. Phones can't draw that many, so heavy models are reduced
// to MAX_TRIANGLES with meshoptimizer's simplifier.

const GEOMETRY_EXTS = ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_mesh_quantization'];
const IMAGE_EXTS = ['EXT_texture_webp', 'EXT_texture_avif'];
const FLOAT = 5126;
const MAX_TEXTURE = 2048;
const MAX_TRIANGLES = 150000;
const DRACO_URL = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/draco_decoder_gltf.js';

const readJson = (bytes) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67) return null;
  const length = view.getUint32(12, true);
  return JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + length)));
};

const triangleCount = (gltf) => (gltf.meshes || []).reduce((sum, m) => sum + (m.primitives || []).reduce((n, p) => {
  const acc = gltf.accessors?.[p.indices ?? p.attributes?.POSITION];
  return n + (acc ? acc.count / 3 : 0);
}, 0), 0);

// What in this file Viro can't read or a phone can't draw (empty list = already fine).
export const viroProblems = (gltf) => {
  const used = gltf.extensionsUsed || [];
  const problems = used.filter((e) => GEOMETRY_EXTS.includes(e) || IMAGE_EXTS.includes(e) || e === 'KHR_texture_basisu');
  const attrsQuantized = (gltf.meshes || []).some((m) => (m.primitives || []).some((p) =>
    ['POSITION', 'NORMAL', 'TEXCOORD_0'].some((a) => {
      const acc = gltf.accessors?.[p.attributes?.[a]];
      return acc && acc.componentType !== FLOAT;
    })));
  if (attrsQuantized && !problems.includes('KHR_mesh_quantization')) problems.push('quantized vertices');
  const oddImages = (gltf.images || []).some((i) => i.mimeType && !['image/png', 'image/jpeg'].includes(i.mimeType));
  if (oddImages && !problems.some((p) => IMAGE_EXTS.includes(p))) problems.push('WebP/AVIF textures');
  const triangles = Math.round(triangleCount(gltf));
  if (triangles > MAX_TRIANGLES) problems.push(`${triangles.toLocaleString()} triangles`);
  return problems;
};

let dracoPromise = null;
const loadDraco = () => {
  if (!dracoPromise) {
    dracoPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = DRACO_URL;
      s.onload = () => window.DracoDecoderModule().then(resolve, reject);
      s.onerror = () => reject(new Error('Could not load the Draco decoder (check your internet connection).'));
      document.head.appendChild(s);
    }).catch((e) => { dracoPromise = null; throw e; });
  }
  return dracoPromise;
};

const toJpegOrPng = async (bytes, mimeType) => {
  const bitmap = await createImageBitmap(new Blob([bytes], { type: mimeType }));
  const k = Math.min(1, MAX_TEXTURE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * k);
  canvas.height = Math.round(bitmap.height * k);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let hasAlpha = false;
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i] < 255) { hasAlpha = true; break; }
  const type = hasAlpha ? 'image/png' : 'image/jpeg';
  const blob = await new Promise((r) => canvas.toBlob(r, type, 0.88));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), mimeType: type };
};

// Returns { file, converted, problems }. `file` is the original when nothing needed fixing.
export async function makeArSafeGlb(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let gltf;
  try { gltf = readJson(bytes); } catch { gltf = null; }
  if (!gltf) return { file, converted: false, problems: [] };
  const problems = viroProblems(gltf);
  if (!problems.length) return { file, converted: false, problems };
  if (problems.includes('KHR_texture_basisu')) {
    throw new Error('This model uses KTX2/Basis textures, which the phone AR cannot read. Export it again with JPEG or PNG textures.');
  }

  const [{ WebIO }, { ALL_EXTENSIONS }, { dequantize, unpartition, weld, simplify, dedup, prune }, { MeshoptDecoder, MeshoptSimplifier }] = await Promise.all([
    import('@gltf-transform/core'),
    import('@gltf-transform/extensions'),
    import('@gltf-transform/functions'),
    import('meshoptimizer'),
  ]);
  await Promise.all([MeshoptDecoder.ready, MeshoptSimplifier.ready]);
  const deps = { 'meshopt.decoder': MeshoptDecoder };
  if ((gltf.extensionsUsed || []).includes('KHR_draco_mesh_compression')) deps['draco3d.decoder'] = await loadDraco();

  const io = new WebIO().registerExtensions(ALL_EXTENSIONS).registerDependencies(deps);
  const doc = await io.readBinary(bytes);
  await doc.transform(dequantize(), unpartition());
  const triangles = triangleCount(gltf);
  if (triangles > MAX_TRIANGLES) {
    await doc.transform(
      weld(),
      simplify({ simplifier: MeshoptSimplifier, ratio: MAX_TRIANGLES / triangles, error: 0.01 }),
      dedup(),
      prune(),
    );
  }

  for (const texture of doc.getRoot().listTextures()) {
    const mime = texture.getMimeType();
    if (mime === 'image/png' || mime === 'image/jpeg') continue;
    const out = await toJpegOrPng(texture.getImage(), mime);
    texture.setImage(out.bytes).setMimeType(out.mimeType)
      .setURI(texture.getURI().replace(/\.\w+$/, out.mimeType === 'image/png' ? '.png' : '.jpg'));
  }

  for (const ext of doc.getRoot().listExtensionsUsed()) {
    if (GEOMETRY_EXTS.includes(ext.extensionName) || IMAGE_EXTS.includes(ext.extensionName)) ext.dispose();
  }

  const out = await io.writeBinary(doc);
  const name = file.name.replace(/\.glb$/i, '') + '_ar.glb';
  return { file: new File([out], name, { type: 'model/gltf-binary' }), converted: true, problems };
}
