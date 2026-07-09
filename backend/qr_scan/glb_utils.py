"""Utilities for sanitizing GLB (binary glTF) 3D models on upload.

Viro (the mobile AR renderer) uses a native glTF loader that fails hard on
several "advanced PBR" material extensions — it reports a generic
"Failed to load model" and shows nothing. The web preview (model-viewer /
three.js) tolerates them, so a model can look fine in the admin yet be
invisible in AR.

`strip_incompatible_extensions` removes those extensions from the GLB's JSON
chunk while leaving geometry and base PBR materials intact, so the model loads
in Viro with a nearly identical look. Any texture/buffer data the removed
extension referenced simply becomes unused (harmless) — the binary chunk is
left untouched.
"""

import json
import struct

# Material extensions Viro's glTF loader does not support and that are safe to
# drop (they only add optical detail on top of base pbrMetallicRoughness).
INCOMPATIBLE_EXTENSIONS = {
    'KHR_materials_sheen',
    'KHR_materials_clearcoat',
    'KHR_materials_transmission',
    'KHR_materials_volume',
    'KHR_materials_specular',
    'KHR_materials_ior',
    'KHR_materials_iridescence',
    'KHR_materials_emissive_strength',
}

_GLB_MAGIC = 0x46546C67  # 'glTF' little-endian
_CHUNK_JSON = 0x4E4F534A  # 'JSON'


def strip_incompatible_extensions(data: bytes) -> bytes:
    """Return a GLB with Viro-incompatible material extensions removed.

    If `data` is not a valid GLB, or nothing needs changing, the original
    bytes are returned unmodified.
    """
    if len(data) < 12:
        return data

    magic, version, total_len = struct.unpack('<III', data[:12])
    if magic != _GLB_MAGIC:
        return data  # not a GLB (maybe .gltf text or something else) — leave it

    # Parse chunks.
    off = 12
    chunks = []  # list of (type, start, length)
    while off + 8 <= len(data):
        clen, ctype = struct.unpack('<II', data[off:off + 8])
        cstart = off + 8
        chunks.append((ctype, cstart, clen))
        off = cstart + clen
        # chunk data is 4-byte aligned; struct already accounts for stored len

    json_chunk = next((c for c in chunks if c[0] == _CHUNK_JSON), None)
    if not json_chunk:
        return data

    _, jstart, jlen = json_chunk
    try:
        gltf = json.loads(data[jstart:jstart + jlen].decode('utf-8'))
    except (ValueError, UnicodeDecodeError):
        return data

    required = set(gltf.get('extensionsRequired') or [])
    removable = INCOMPATIBLE_EXTENSIONS - required  # never drop required ones
    if not removable:
        return data

    changed = False

    # Remove from each material's extensions block.
    for mat in gltf.get('materials', []):
        ext = mat.get('extensions')
        if not ext:
            continue
        for name in list(ext.keys()):
            if name in removable:
                del ext[name]
                changed = True
        if not ext:
            mat.pop('extensions', None)

    # Remove from the top-level extensionsUsed list.
    used = gltf.get('extensionsUsed')
    if used:
        new_used = [e for e in used if e not in removable]
        if len(new_used) != len(used):
            changed = True
            if new_used:
                gltf['extensionsUsed'] = new_used
            else:
                gltf.pop('extensionsUsed', None)

    if not changed:
        return data

    # Re-serialize the JSON chunk, padded with spaces to 4-byte alignment.
    new_json = json.dumps(gltf, separators=(',', ':')).encode('utf-8')
    pad = (4 - len(new_json) % 4) % 4
    new_json += b' ' * pad

    # Rebuild: header + new JSON chunk + all remaining chunks unchanged.
    out = bytearray()
    out += struct.pack('<III', _GLB_MAGIC, version, 0)  # length placeholder, filled below

    out += struct.pack('<II', len(new_json), _CHUNK_JSON)
    out += new_json

    for ctype, cstart, clen in chunks:
        if ctype == _CHUNK_JSON:
            continue
        out += struct.pack('<II', clen, ctype)
        out += data[cstart:cstart + clen]

    struct.pack_into('<I', out, 8, len(out))  # total length at offset 8
    return bytes(out)
