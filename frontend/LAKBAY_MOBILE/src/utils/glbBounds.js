import * as FileSystem from 'expo-file-system/legacy';

// Reads only the JSON header of a local .glb and returns the model's bounding
// box in model space ({ min:[x,y,z], max:[x,y,z] }), with node transforms and
// an optional extra rotation (degrees, X then Y then Z) applied. Null if the
// file can't be read or has no POSITION bounds.

const base64ToBytes = (b64) => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const readBytes = async (uri, position, length) =>
  base64ToBytes(await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64, position, length,
  }));

const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

// Column-major 4x4 matrices, as in glTF.
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

const mul = (a, b) => {
  const r = new Array(16);
  for (let c = 0; c < 4; c++) {
    for (let row = 0; row < 4; row++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + row] * b[c * 4 + k];
      r[c * 4 + row] = s;
    }
  }
  return r;
};

const fromTRS = (t = [0, 0, 0], q = [0, 0, 0, 1], s = [1, 1, 1]) => {
  const [x, y, z, w] = q;
  return [
    (1 - 2 * (y * y + z * z)) * s[0], 2 * (x * y + z * w) * s[0], 2 * (x * z - y * w) * s[0], 0,
    2 * (x * y - z * w) * s[1], (1 - 2 * (x * x + z * z)) * s[1], 2 * (y * z + x * w) * s[1], 0,
    2 * (x * z + y * w) * s[2], 2 * (y * z - x * w) * s[2], (1 - 2 * (x * x + y * y)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ];
};

const rotX = (d) => { const a = d * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; };
const rotY = (d) => { const a = d * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; };
const rotZ = (d) => { const a = d * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; };

export const eulerMatrix = ([x, y, z] = [0, 0, 0]) => mul(rotZ(z), mul(rotY(y), rotX(x)));

const apply = (m, [x, y, z]) => [
  m[0] * x + m[4] * y + m[8] * z + m[12],
  m[1] * x + m[5] * y + m[9] * z + m[13],
  m[2] * x + m[6] * y + m[10] * z + m[14],
];

export async function getGlbBounds(uri, extraRotation) {
  try {
    const head = await readBytes(uri, 0, 20);
    if (u32(head, 0) !== 0x46546c67 || u32(head, 16) !== 0x4e4f534a) return null;
    const jsonBytes = await readBytes(uri, 20, u32(head, 12));
    let jsonText = '';
    for (let i = 0; i < jsonBytes.length; i += 8192) {
      jsonText += String.fromCharCode.apply(null, jsonBytes.subarray(i, i + 8192));
    }
    let utf8Text = jsonText;
    try { utf8Text = decodeURIComponent(escape(jsonText)); } catch (_) {}
    const gltf = JSON.parse(utf8Text);

    const nodes = gltf.nodes || [];
    const scene = (gltf.scenes || [])[gltf.scene || 0];
    const roots = scene?.nodes || nodes.map((_, i) => i);
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];

    const visit = (index, parent, depth) => {
      const node = nodes[index];
      if (!node || depth > 64) return;
      const world = mul(parent, node.matrix || fromTRS(node.translation, node.rotation, node.scale));
      const mesh = node.mesh != null ? gltf.meshes?.[node.mesh] : null;
      (mesh?.primitives || []).forEach((p) => {
        const acc = gltf.accessors?.[p.attributes?.POSITION];
        if (!acc?.min || !acc?.max) return;
        for (let i = 0; i < 8; i++) {
          const corner = [i & 1 ? acc.max[0] : acc.min[0], i & 2 ? acc.max[1] : acc.min[1], i & 4 ? acc.max[2] : acc.min[2]];
          const v = apply(world, corner);
          for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], v[k]); max[k] = Math.max(max[k], v[k]); }
        }
      });
      (node.children || []).forEach((c) => visit(c, world, depth + 1));
    };

    const root = extraRotation ? eulerMatrix(extraRotation) : IDENTITY;
    roots.forEach((i) => visit(i, root, 0));
    return Number.isFinite(min[0]) ? { min, max } : null;
  } catch (e) {
    console.log('[AR] could not read GLB bounds:', String(e));
    return null;
  }
}
