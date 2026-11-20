import apiClient from './api';
import { ORIGIN } from './qrService';

// Star ratings (1-5) with an optional comment, for tourist spots and promotions.
// Responses: { average, count, my_review: {rating, comment} | null, results: [...] }
const reviewsUrl = (kind, id) =>
  kind === 'promotion'
    ? `${ORIGIN}/api/promotions/published/${id}/reviews/`
    : `${ORIGIN}/api/qr/spots/${id}/reviews/`;

export const getReviews = (kind, id) =>
  apiClient.get(reviewsUrl(kind, id)).then((r) => r.data);

export const submitReview = (kind, id, rating, comment = '') =>
  apiClient.post(reviewsUrl(kind, id), { rating, comment }).then((r) => r.data);

export const reviewErrorText = (err) =>
  err?.response?.data?.detail || 'Your rating could not be saved. Check your connection and try again.';
