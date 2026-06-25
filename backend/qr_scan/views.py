from django.db.models import F
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, viewsets
from .models import CulturalSpot, QRMarker, QRScan, TriviaQuestion, SpotBadge
from .serializers import CulturalSpotSerializer, QRMarkerSerializer, TriviaQuestionSerializer

XP_PER_QUIZ = 50


class CulturalSpotViewSet(viewsets.ModelViewSet):
    queryset = CulturalSpot.objects.all().order_by('name')
    serializer_class = CulturalSpotSerializer
    permission_classes = [permissions.IsAdminUser]


class QRMarkerViewSet(viewsets.ModelViewSet):
    queryset = QRMarker.objects.select_related('spot').all().order_by('created_at')
    serializer_class = QRMarkerSerializer
    permission_classes = [permissions.IsAdminUser]


class ValidateQRView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        qr_code = request.data.get('qr_code')

        if not qr_code:
            return Response(
                {'error': 'qr_code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            marker = QRMarker.objects.select_related('spot').get(
                qr_code_string=qr_code,
                is_active=True
            )
        except QRMarker.DoesNotExist:
            return Response(
                {'valid': False, 'error': 'Invalid or inactive QR code'},
                status=status.HTTP_404_NOT_FOUND
            )

        _, created = QRScan.objects.get_or_create(user=request.user, qr_marker=marker)
        already_scanned = not created

        if created:
            QRMarker.objects.filter(pk=marker.pk).update(scan_count=F('scan_count') + 1)

        spot = marker.spot
        image_url = request.build_absolute_uri(spot.image.url) if spot.image else None

        return Response({
            'valid': True,
            'already_scanned': already_scanned,
            'unlock_type': marker.unlock_type,
            'bonus_creature': marker.bonus_creature,
            'spot': {
                'id': spot.id,
                'name': spot.name,
                'hook': spot.hook,
                'image': image_url,
                'description': spot.description,
                'historical': {
                    'label': 'HISTORICAL BACKGROUND',
                    'body': spot.historical_background,
                },
                'cultural': {
                    'label': 'CULTURAL SIGNIFICANCE',
                    'body': spot.cultural_significance,
                },
                'funFact': {
                    'label': 'FUN FACT',
                    'body': spot.fun_fact,
                },
                'location': spot.location_name,
            }
        }, status=status.HTTP_200_OK)


class UserQRScansView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        scans = QRScan.objects.filter(
            user=request.user
        ).select_related('qr_marker__spot').order_by('-scanned_at')

        data = [{
            'spot_name': scan.qr_marker.spot.name,
            'scanned_at': scan.scanned_at,
            'unlock_type': scan.qr_marker.unlock_type,
        } for scan in scans]

        return Response({'scans': data, 'total': len(data)})


class SpotTriviaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, spot_id):
        spot = get_object_or_404(CulturalSpot, pk=spot_id)
        questions = TriviaQuestion.objects.filter(spot=spot)
        serializer = TriviaQuestionSerializer(questions, many=True)
        return Response({'questions': serializer.data})


class AwardSpotBadgeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, spot_id):
        spot = get_object_or_404(CulturalSpot, pk=spot_id)
        badge, created = SpotBadge.objects.get_or_create(user=request.user, spot=spot)

        if created:
            request.user.__class__.objects.filter(pk=request.user.pk).update(
                xp=F('xp') + XP_PER_QUIZ
            )
            request.user.refresh_from_db(fields=['xp'])

        return Response({
            'awarded': created,
            'spot_name': spot.name,
            'xp_earned': XP_PER_QUIZ if created else 0,
            'total_xp': request.user.xp,
        })
