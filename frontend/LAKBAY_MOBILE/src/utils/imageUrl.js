// Cloudinary serves originals at full camera resolution. Asking for a
// phone-sized, auto-quality version cuts download and decode time a lot.
// Only /image/upload/ URLs without an existing transformation are touched,
// so 3D models (/raw/upload/) and AR tracking images stay as uploaded.
const UPLOAD = '/image/upload/';

export const sizedImage = (url, width = 900) => {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com')) return url;
  const at = url.indexOf(UPLOAD);
  if (at === -1) return url;
  const rest = url.slice(at + UPLOAD.length);
  if (/^[a-z]{1,3}_[^/]+\//.test(rest) && !/^v\d+\//.test(rest)) return url;
  return `${url.slice(0, at + UPLOAD.length)}c_limit,w_${width},q_auto/${rest}`;
};
