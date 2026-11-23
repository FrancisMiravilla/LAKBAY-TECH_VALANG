import qrService from '../api/qrService';

export const MAX_VIDEO_MB = 100;
export const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/webm';

// Uploads straight from the browser to Cloudinary with a signature from our server,
// so a large video never passes through the API. Resolves to the video's https URL.
export async function uploadSpotVideo(file, onProgress) {
  if (!file.type.startsWith('video/')) {
    throw new Error('Please choose a video file (MP4, MOV or WebM).');
  }
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
    throw new Error(`This video is ${(file.size / 1024 / 1024).toFixed(0)} MB. The limit is ${MAX_VIDEO_MB} MB — try a shorter or compressed video.`);
  }

  let signed;
  try {
    ({ data: signed } = await qrService.getVideoUploadSignature());
  } catch (err) {
    throw new Error(err.response?.data?.error || 'Could not start the upload. Check your connection and try again.', { cause: err });
  }

  const form = new FormData();
  form.append('file', file);
  ['api_key', 'timestamp', 'signature', 'folder', 'eager', 'eager_async'].forEach((key) => form.append(key, signed[key]));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', signed.upload_url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
      if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) resolve(body.secure_url);
      else reject(new Error(body.error?.message || 'The video upload failed. Please try again.'));
    };
    xhr.onerror = () => reject(new Error('The video upload was interrupted. Check your connection and try again.'));
    xhr.send(form);
  });
}
