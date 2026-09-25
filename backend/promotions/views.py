import json
import base64
import requests
from django.conf import settings
from django.db import transaction
from rest_framework import viewsets, generics, views, status, serializers
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

class CoinBundleViewSet(viewsets.ModelViewSet):
    queryset = CoinBundle.objects.all().order_by('-created_at')
    serializer_class = CoinBundleSerializer
    
    def get_permissions(self):
        if self.request.method in ['GET']:
            return [AllowAny()]
        return [IsAuthenticated()]
        
    def check_permissions(self, request):
        super().check_permissions(request)
        if request.method not in ['GET'] and not request.user.is_staff:
            self.permission_denied(request, message="Not authorized.")

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
        use_coins = str(self.request.data.get('use_coins', '')).lower() in ['true', '1']
        if use_coins:
            setting, _ = AppSetting.objects.get_or_create(
                key='PROMOTION_PUBLISH_COST', 
                defaults={'value': 50, 'description': 'Gold coins required to publish a promotion'}
            )
            cost = setting.value
            with transaction.atomic():
                wallet, _ = Wallet.objects.select_for_update().get_or_create(user=self.request.user)
                if wallet.balance < cost:
                    raise serializers.ValidationError(
                        {"detail": f"Not enough coins. Required: {cost}, Balance: {wallet.balance}"}
                    )
                wallet.balance -= cost
                wallet.save(update_fields=['balance', 'updated_at'])
                serializer.save(user=self.request.user, status='PUBLISHED')
        else:
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
                    "payment_method_types": ["qrph", "gcash", "paymaya", "card", "grab_pay"],
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


class CreatePromotionQRPhView(views.APIView):
    """
    Creates a PayMongo Payment Intent strictly for QR Ph,
    generates a QR Ph Payment Method, attaches it, and returns the
    dynamic Base64 QR Ph code image directly for PromoteScreen.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        spot_name = (request.data.get('spot_name') or 'Zamboanga Spot Promotion').strip()
        
        # Promotion fee in PHP (defaults to 50 PHP)
        setting, _ = AppSetting.objects.get_or_create(
            key='PROMOTION_FEE_PHP',
            defaults={'value': 50, 'description': 'PHP cost to promote a spot via QR Ph'}
        )
        amount_php = setting.value
        amount_centavos = int(amount_php * 100)

        secret_key = getattr(settings, 'PAYMONGO_SECRET_KEY', '')
        auth_string = base64.b64encode(f"{secret_key}:".encode()).decode()
        headers = {
            "Authorization": f"Basic {auth_string}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        try:
            # 1. Create Payment Intent (QR Ph only)
            intent_payload = {
                "data": {
                    "attributes": {
                        "amount": amount_centavos,
                        "payment_method_allowed": ["qrph"],
                        "currency": "PHP",
                        "description": f"LAKBAY Spot Promotion: {spot_name}",
                        "statement_descriptor": "LAKBAY ZAMBOANGA",
                    }
                }
            }
            res_pi = requests.post("https://api.paymongo.com/v1/payment_intents", json=intent_payload, headers=headers)
            if res_pi.status_code != 200:
                return Response({"error": "Failed to create Payment Intent", "details": res_pi.json()}, status=status.HTTP_400_BAD_REQUEST)

            pi_data = res_pi.json()['data']
            payment_intent_id = pi_data['id']

            # 2. Create QR Ph Payment Method
            user_name = request.user.get_full_name() or request.user.email
            method_payload = {
                "data": {
                    "attributes": {
                        "type": "qrph",
                        "billing": {
                            "name": user_name,
                            "email": request.user.email
                        }
                    }
                }
            }
            res_pm = requests.post("https://api.paymongo.com/v1/payment_methods", json=method_payload, headers=headers)
            if res_pm.status_code != 200:
                return Response({"error": "Failed to create QR Ph Payment Method", "details": res_pm.json()}, status=status.HTTP_400_BAD_REQUEST)

            payment_method_id = res_pm.json()['data']['id']

            # 3. Attach Payment Method to Payment Intent
            attach_payload = {
                "data": {
                    "attributes": {
                        "payment_method": payment_method_id,
                        "return_url": "https://localhost:8081/payment-return"
                    }
                }
            }
            res_att = requests.post(f"https://api.paymongo.com/v1/payment_intents/{payment_intent_id}/attach", json=attach_payload, headers=headers)
            if res_att.status_code != 200:
                return Response({"error": "Failed to attach QR Ph to Payment Intent", "details": res_att.json()}, status=status.HTTP_400_BAD_REQUEST)

            att_data = res_att.json()['data']
            next_action = att_data.get('attributes', {}).get('next_action', {})
            qr_image_url = next_action.get('code', {}).get('image_url')

            # 4. Record pending Transaction in DB
            tx = Transaction.objects.create(
                user=request.user,
                bundle=None,
                paymongo_payment_intent_id=payment_intent_id,
                amount_php=amount_php,
                coins_to_add=0,
                status='PENDING'
            )

            return Response({
                "payment_intent_id": payment_intent_id,
                "qr_image_url": qr_image_url,
                "amount_php": amount_php,
                "spot_name": spot_name,
                "transaction_id": tx.id
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"QR Ph initialization failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifyPromotionPaymentView(views.APIView):
    """
    Checks if the PayMongo Payment Intent has been paid.
    Returns { "paid": true/false, "status": "succeeded" }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, payment_intent_id):
        secret_key = getattr(settings, 'PAYMONGO_SECRET_KEY', '')
        auth_string = base64.b64encode(f"{secret_key}:".encode()).decode()
        headers = {"Authorization": f"Basic {auth_string}"}

        try:
            res = requests.get(f"https://api.paymongo.com/v1/payment_intents/{payment_intent_id}", headers=headers)
            if res.status_code != 200:
                return Response({"paid": False, "status": "not_found", "error": res.json()}, status=status.HTTP_400_BAD_REQUEST)

            pi_status = res.json().get('data', {}).get('attributes', {}).get('status', 'unknown')
            paid = (pi_status == 'succeeded')

            if paid:
                Transaction.objects.filter(paymongo_payment_intent_id=payment_intent_id).update(status='PAID')

            return Response({
                "paid": paid,
                "status": pi_status,
                "payment_intent_id": payment_intent_id
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"paid": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SimulateTestPaymentView(views.APIView):
    """
    Development/Demo helper:
    Manually marks a pending Payment Intent as PAID for testing in test mode.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        payment_intent_id = request.data.get('payment_intent_id')
        if not payment_intent_id:
            return Response({"error": "payment_intent_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        tx = Transaction.objects.filter(paymongo_payment_intent_id=payment_intent_id).first()
        if tx:
            tx.status = 'PAID'
            tx.save(update_fields=['status', 'updated_at'])

        return Response({
            "paid": True,
            "status": "succeeded",
            "message": "Test mode: payment simulated as succeeded."
        }, status=status.HTTP_200_OK)


class CreateBundleQRPhView(views.APIView):
    """
    Creates a PayMongo Payment Intent strictly for QR Ph for a CoinBundle.
    Returns the dynamic Base64 QR Ph code image directly for StoreScreen.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        bundle_id = request.data.get('bundle_id')
        try:
            bundle = CoinBundle.objects.get(id=bundle_id, is_active=True)
        except CoinBundle.DoesNotExist:
            return Response({"error": "Coin bundle not found or inactive."}, status=status.HTTP_404_NOT_FOUND)

        amount_centavos = int(bundle.price_php * 100)
        secret_key = getattr(settings, 'PAYMONGO_SECRET_KEY', '')
        auth_string = base64.b64encode(f"{secret_key}:".encode()).decode()
        headers = {
            "Authorization": f"Basic {auth_string}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        try:
            # 1. Create Payment Intent (QR Ph only)
            intent_payload = {
                "data": {
                    "attributes": {
                        "amount": amount_centavos,
                        "payment_method_allowed": ["qrph"],
                        "currency": "PHP",
                        "description": f"LAKBAY Bundle: {bundle.name} ({bundle.coins_amount} Coins)",
                        "statement_descriptor": "LAKBAY COINS",
                    }
                }
            }
            res_pi = requests.post("https://api.paymongo.com/v1/payment_intents", json=intent_payload, headers=headers)
            if res_pi.status_code != 200:
                return Response({"error": "Failed to create Payment Intent", "details": res_pi.json()}, status=status.HTTP_400_BAD_REQUEST)

            pi_data = res_pi.json()['data']
            payment_intent_id = pi_data['id']

            # 2. Create QR Ph Payment Method
            user_name = request.user.get_full_name() or request.user.email
            method_payload = {
                "data": {
                    "attributes": {
                        "type": "qrph",
                        "billing": {
                            "name": user_name,
                            "email": request.user.email
                        }
                    }
                }
            }
            res_pm = requests.post("https://api.paymongo.com/v1/payment_methods", json=method_payload, headers=headers)
            if res_pm.status_code != 200:
                return Response({"error": "Failed to create QR Ph Payment Method", "details": res_pm.json()}, status=status.HTTP_400_BAD_REQUEST)

            payment_method_id = res_pm.json()['data']['id']

            # 3. Attach Payment Method to Payment Intent
            attach_payload = {
                "data": {
                    "attributes": {
                        "payment_method": payment_method_id,
                        "return_url": "https://localhost:8081/payment-return"
                    }
                }
            }
            res_att = requests.post(f"https://api.paymongo.com/v1/payment_intents/{payment_intent_id}/attach", json=attach_payload, headers=headers)
            if res_att.status_code != 200:
                return Response({"error": "Failed to attach QR Ph to Payment Intent", "details": res_att.json()}, status=status.HTTP_400_BAD_REQUEST)

            att_data = res_att.json()['data']
            next_action = att_data.get('attributes', {}).get('next_action', {})
            qr_image_url = next_action.get('code', {}).get('image_url')

            # 4. Record pending Transaction in DB
            tx = Transaction.objects.create(
                user=request.user,
                bundle=bundle,
                paymongo_payment_intent_id=payment_intent_id,
                amount_php=bundle.price_php,
                coins_to_add=bundle.coins_amount,
                status='PENDING'
            )

            return Response({
                "payment_intent_id": payment_intent_id,
                "qr_image_url": qr_image_url,
                "amount_php": str(bundle.price_php),
                "coins_amount": bundle.coins_amount,
                "bundle_name": bundle.name,
                "transaction_id": tx.id
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"QR Ph initialization failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifyBundlePaymentView(views.APIView):
    """
    Checks if the PayMongo Payment Intent for a bundle has been paid.
    If succeeded, credits coins to user's wallet and updates Transaction status to 'PAID'.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, payment_intent_id):
        secret_key = getattr(settings, 'PAYMONGO_SECRET_KEY', '')
        auth_string = base64.b64encode(f"{secret_key}:".encode()).decode()
        headers = {"Authorization": f"Basic {auth_string}"}

        try:
            res = requests.get(f"https://api.paymongo.com/v1/payment_intents/{payment_intent_id}", headers=headers)
            if res.status_code != 200:
                return Response({"paid": False, "status": "not_found", "error": res.json()}, status=status.HTTP_400_BAD_REQUEST)

            pi_status = res.json().get('data', {}).get('attributes', {}).get('status', 'unknown')
            paid = (pi_status == 'succeeded')

            coins_added = 0
            current_balance = 0

            if paid:
                with transaction.atomic():
                    tx = Transaction.objects.select_for_update().filter(paymongo_payment_intent_id=payment_intent_id, status='PENDING').first()
                    if tx:
                        wallet, _ = Wallet.objects.select_for_update().get_or_create(user=tx.user)
                        wallet.balance += tx.coins_to_add
                        wallet.save(update_fields=['balance', 'updated_at'])
                        tx.status = 'PAID'
                        tx.save(update_fields=['status', 'updated_at'])
                        coins_added = tx.coins_to_add
                        current_balance = wallet.balance
                    else:
                        wallet, _ = Wallet.objects.get_or_create(user=request.user)
                        current_balance = wallet.balance
            else:
                wallet, _ = Wallet.objects.get_or_create(user=request.user)
                current_balance = wallet.balance

            return Response({
                "paid": paid,
                "status": pi_status,
                "coins_added": coins_added,
                "balance": current_balance,
                "payment_intent_id": payment_intent_id
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"paid": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SimulateTestBundlePaymentView(views.APIView):
    """
    Development/Demo helper:
    Manually marks a pending bundle Payment Intent as PAID and credits wallet coins.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        payment_intent_id = request.data.get('payment_intent_id')
        if not payment_intent_id:
            return Response({"error": "payment_intent_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        coins_added = 0
        current_balance = 0
        with transaction.atomic():
            tx = Transaction.objects.select_for_update().filter(paymongo_payment_intent_id=payment_intent_id, status='PENDING').first()
            if tx:
                wallet, _ = Wallet.objects.select_for_update().get_or_create(user=tx.user)
                wallet.balance += tx.coins_to_add
                wallet.save(update_fields=['balance', 'updated_at'])
                tx.status = 'PAID'
                tx.save(update_fields=['status', 'updated_at'])
                coins_added = tx.coins_to_add
                current_balance = wallet.balance
            else:
                wallet, _ = Wallet.objects.get_or_create(user=request.user)
                current_balance = wallet.balance

        return Response({
            "paid": True,
            "status": "succeeded",
            "coins_added": coins_added,
            "balance": current_balance,
            "message": "Test mode: payment simulated as succeeded. Coins added."
        }, status=status.HTTP_200_OK)


class PayMongoWebhookView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        event = request.data.get('data', {})
        attributes = event.get('attributes', {})
        event_type = attributes.get('type')

        # Supports both Checkout Session and Payment Intent webhooks
        if event_type in ['checkout_session.payment.paid', 'payment.paid']:
            data_attributes = attributes.get('data', {}).get('attributes', {})
            reference_number = data_attributes.get('reference_number')
            payment_intent_id = data_attributes.get('payment_intent_id') or data_attributes.get('id')
            
            try:
                tx = None
                if reference_number:
                    tx = Transaction.objects.filter(id=reference_number, status='PENDING').first()
                if not tx and payment_intent_id:
                    tx = Transaction.objects.filter(paymongo_payment_intent_id=payment_intent_id, status='PENDING').first()

                if tx:
                    if tx.coins_to_add > 0:
                        wallet, _ = Wallet.objects.get_or_create(user=tx.user)
                        wallet.balance += tx.coins_to_add
                        wallet.save()

                    tx.status = 'PAID'
                    tx.save()
            except Exception as e:
                print("Webhook processing error:", e)

        return Response({"status": "Webhook received"}, status=status.HTTP_200_OK)

class PublishedPromotionListView(generics.ListAPIView):
    serializer_class = UserPromotionSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        return UserPromotion.objects.filter(status='PUBLISHED').order_by('-created_at')
