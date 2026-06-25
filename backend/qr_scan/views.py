from django.db.models import F
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import QRMarker, QRScan



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

        return Response({
            'valid': True,
            'already_scanned': already_scanned,
            'unlock_type': marker.unlock_type,
            'bonus_creature': marker.bonus_creature,
            'spot': {
                'name': marker.spot.name,
                'description': marker.spot.description,
                'historical': {
                    'label': 'HISTORICAL BACKGROUND',
                    'body': marker.spot.historical_background,
                },
                'cultural': {
                    'label': 'CULTURAL SIGNIFICANCE',
                    'body': marker.spot.cultural_significance,
                },
                'funFact': {
                    'label': 'FUN FACT',
                    'body': marker.spot.fun_fact,
                },
                'location': marker.spot.location_name,
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