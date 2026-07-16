import json
import base64
import requests
from django.conf import settings
from rest_framework import viewsets, generics, views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from .models import Wallet, CoinBundle, UserPromotion, Transaction, AppSetting
from .serializers import WalletSerializer, CoinBundleSerializer, UserPromotionSerializer, AppSettingSerializer

class WalletRetrieveView(generics.RetrieveAPIView):
    serializer_class = WalletSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        wallet, created = Wallet.objects.get_or_create(user=self.request.user)
        return wallet

class CoinBundleListView(generics.ListAPIView):
    queryset = CoinBundle.objects.filter(is_active=True)
    serializer_class = CoinBundleSerializer
    permission_classes = [AllowAny]

class AppSettingViewSet(viewsets.ModelViewSet):
    queryset = AppSetting.objects.all()
    serializer_class = AppSettingSerializer
    lookup_field = 'key'
    
    def get_permissions(self):
        if self.request.method in ['GET']:
            return [AllowAny()]
        return [IsAuthenticated()]
        
    def check_permissions(self, request):
        super().check_permissions(request)
        if request.method not in ['GET'] and not request.user.is_staff:
            self.permission_denied(request, message="Not authorized.")

class UserPromotionViewSet(viewsets.ModelViewSet):
    serializer_class = UserPromotionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Admin can see all, normal user sees only theirs or published ones
        if self.request.user.is_staff:
            return UserPromotion.objects.all().order_by('-created_at')
        
        # In a real scenario, you'd likely return Published ones + the user's own ones
        return UserPromotion.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, status='PENDING_REVIEW')

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def approve(self, request, pk=None):
        if not request.user.is_staff:
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
        
        promotion = self.get_object()
        promotion.status = 'APPROVED_PENDING_PAYMENT'
        promotion.save()
        return Response({"status": "Promotion approved, awaiting payment."})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        if not request.user.is_staff:
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
        
        reason = request.data.get('reason', 'No reason provided.')
        promotion = self.get_object()
        promotion.status = 'REJECTED'
        promotion.rejection_reason = reason
        promotion.save()
        return Response({"status": "Promotion rejected."})

class PublishPromotionView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            promotion = UserPromotion.objects.get(pk=pk, user=request.user)
        except UserPromotion.DoesNotExist:
            return Response({"detail": "Promotion not found."}, status=status.HTTP_404_NOT_FOUND)

        if promotion.status != 'APPROVED_PENDING_PAYMENT':
            return Response({"detail": "Promotion is not approved for publishing yet."}, status=status.HTTP_400_BAD_REQUEST)

        # Get cost from dynamic settings, default to 50 if not set
        setting, _ = AppSetting.objects.get_or_create(
            key='PROMOTION_PUBLISH_COST', 
            defaults={'value': 50, 'description': 'Gold coins required to publish a promotion'}
        )
        cost = setting.value 

        wallet, _ = Wallet.objects.get_or_create(user=request.user)

        if wallet.balance < cost:
            return Response({"detail": "Not enough game coins.", "required": cost, "balance": wallet.balance}, status=status.HTTP_402_PAYMENT_REQUIRED)

        # Deduct coins and publish
        wallet.balance -= cost
        wallet.save()

        promotion.status = 'PUBLISHED'
        promotion.save()

        return Response({"status": "Success", "message": "Promotion published!"})


class CreatePayMongoCheckoutView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        bundle_id = request.data.get('bundle_id')
        try:
            bundle = CoinBundle.objects.get(id=bundle_id, is_active=True)
        except CoinBundle.DoesNotExist:
            return Response({"detail": "Bundle not found or inactive."}, status=status.HTTP_404_NOT_FOUND)

        # Create a pending transaction in our DB
        transaction = Transaction.objects.create(
            user=request.user,
            bundle=bundle,
            amount_php=bundle.price_php,
            coins_to_add=bundle.coins_amount,
            status='PENDING'
        )

        # Call PayMongo API
        url = "https://api.paymongo.com/v1/checkout_sessions"
        
        # PayMongo expects amount in centavos (e.g., 100 PHP = 10000)
        amount_centavos = int(bundle.price_php * 100)

        payload = {
            "data": {
                "attributes": {
                    "send_email_receipt": False,
                    "show_description": True,
                    "show_line_items": True,
                    "description": bundle.description or f"Buy {bundle.coins_amount} Coins",
                    "line_items": [
                        {
                            "currency": "PHP",
                            "amount": amount_centavos,
                            "name": bundle.name,
                            "quantity": 1
                        }
                    ],
                    "payment_method_types": ["gcash", "paymaya", "card", "grab_pay"],
                    "reference_number": str(transaction.id),
                    "success_url": getattr(settings, 'FRONTEND_URL', 'http://localhost:8081') + "/payment-success",
                    "cancel_url": getattr(settings, 'FRONTEND_URL', 'http://localhost:8081') + "/payment-cancelled"
                }
            }
        }

        secret_key = getattr(settings, 'PAYMONGO_SECRET_KEY', '')
        auth_string = base64.b64encode(f"{secret_key}:".encode()).decode()

        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "authorization": f"Basic {auth_string}"
        }

        response = requests.post(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            checkout_id = data['data']['id']
            checkout_url = data['data']['attributes']['checkout_url']
            
            transaction.paymongo_checkout_id = checkout_id
            transaction.save()

            return Response({"checkout_url": checkout_url})
        else:
            return Response({"detail": "Failed to create checkout session with PayMongo.", "paymongo_error": response.json()}, status=status.HTTP_400_BAD_REQUEST)


class PayMongoWebhookView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # In a real production app, verify the signature using PAYMONGO_WEBHOOK_SECRET
        # signature = request.headers.get('Paymongo-Signature')

        event = request.data.get('data', {})
        attributes = event.get('attributes', {})
        event_type = attributes.get('type')

        if event_type == 'checkout_session.payment.paid':
            data_attributes = attributes.get('data', {}).get('attributes', {})
            checkout_id = data_attributes.get('id')
            
            # Note: Depending on the event structure, the checkout session ID might be referenced differently.
            # Usually, you can find the reference number we passed earlier.
            reference_number = data_attributes.get('reference_number')
            
            try:
                # Find the transaction by ID (reference_number)
                transaction = Transaction.objects.get(id=reference_number, status='PENDING')
                
                # Fulfill the order
                wallet, _ = Wallet.objects.get_or_create(user=transaction.user)
                wallet.balance += transaction.coins_to_add
                wallet.save()

                transaction.status = 'PAID'
                transaction.save()
                
            except Transaction.DoesNotExist:
                pass # Probably not a checkout we generated or already paid
                
        return Response({"status": "Webhook received"}, status=status.HTTP_200_OK)

class PublishedPromotionListView(generics.ListAPIView):
    serializer_class = UserPromotionSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        return UserPromotion.objects.filter(status='PUBLISHED').order_by('-created_at')
