"""Star ratings with an optional comment, shared by tourist spots and promotions.

GET  -> {average, count, my_review, results}
POST {rating: 1-5, comment?: str} -> saves (or replaces) the caller's review.
"""
from django.db.models import Avg, Count, Prefetch
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

MAX_COMMENT_LENGTH = 500
LIST_LIMIT = 50


def rounded_average(value):
    return round(value, 1) if value is not None else None


def commented_reviews_prefetch(review_model):
    """Prefetch for list views: each item's reviews that have a comment, newest first,
    stored on `commented_reviews` so a card can quote the latest one without extra queries."""
    return Prefetch(
        'reviews',
        queryset=review_model.objects.exclude(comment='').select_related('user').order_by('-updated_at'),
        to_attr='commented_reviews',
    )


def latest_comment(obj):
    reviews = getattr(obj, 'commented_reviews', None)
    return review_row(reviews[0]) if reviews else None


def review_row(review):
    user = review.user
    return {
        'id': review.id,
        'rating': review.rating,
        'comment': review.comment,
        'name': user.in_game_name or 'Explorer',
        'character': user.chosen_character or '',
        'updated_at': review.updated_at,
    }


def parse_review(data):
    try:
        rating = int(data.get('rating'))
    except (TypeError, ValueError):
        return None, None, 'Choose a rating from 1 to 5 stars.'
    if not 1 <= rating <= 5:
        return None, None, 'Choose a rating from 1 to 5 stars.'
    comment = str(data.get('comment') or '').strip()
    if len(comment) > MAX_COMMENT_LENGTH:
        return None, None, f'Keep your comment under {MAX_COMMENT_LENGTH} characters.'
    return rating, comment, None


class ReviewView(APIView):
    """Subclasses set `review_model` and `target_field`, and implement
    `get_target(pk)` (None when not found) and `review_block_reason(user, target)`."""

    permission_classes = (permissions.IsAuthenticated,)
    review_model = None
    target_field = None

    def get_target(self, pk):
        raise NotImplementedError

    def review_block_reason(self, user, target):
        return None

    def _reviews(self, target):
        return self.review_model.objects.filter(**{self.target_field: target})

    def _payload(self, target, user):
        reviews = self._reviews(target)
        totals = reviews.aggregate(average=Avg('rating'), count=Count('id'))
        mine = reviews.filter(user=user).first()
        return {
            'average': rounded_average(totals['average']),
            'count': totals['count'],
            'my_review': {'rating': mine.rating, 'comment': mine.comment} if mine else None,
            'results': [review_row(r) for r in reviews.select_related('user').order_by('-updated_at')[:LIST_LIMIT]],
        }

    def get(self, request, pk):
        target = self.get_target(pk)
        if target is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(self._payload(target, request.user))

    def post(self, request, pk):
        target = self.get_target(pk)
        if target is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        reason = self.review_block_reason(request.user, target)
        if reason:
            return Response({'detail': reason}, status=status.HTTP_403_FORBIDDEN)
        rating, comment, error = parse_review(request.data)
        if error:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)
        self.review_model.objects.update_or_create(
            user=request.user, **{self.target_field: target},
            defaults={'rating': rating, 'comment': comment},
        )
        return Response(self._payload(target, request.user))
