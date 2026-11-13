from rest_framework import generics, status, permissions
from .levels import level_for_xp
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.conf import settings
from google.oauth2 import id_token
from google.auth.transport import requests
from .serializers import (
     UserSerializer, 
    CharacterSetupSerializer,
)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from . import cosmetics

User = get_user_model()


class GoogleLoginView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        token = request.data.get('id_token')
        if not token:
            return Response({'error': 'id_token is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Verify token
            idinfo = id_token.verify_oauth2_token(token, requests.Request(), settings.GOOGLE_CLIENT_ID)
            
            email = idinfo.get('email')
            full_name = idinfo.get('name', '')
            first_name = idinfo.get('given_name', '')
            last_name = idinfo.get('family_name', '')

            # Check if user exists
            user = User.objects.filter(email=email).first()
            if not user:
                user = User.objects.create_user(
                    email=email,
                    password=User.objects.make_random_password(),
                    full_name=full_name,
                    first_name=first_name,
                    last_name=last_name,
                    auth_provider='google'
                )
            
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_200_OK)
            
        except ValueError:
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                refresh_token = request.data.get('refresh_token')
                
            if not refresh_token:
                return Response({'error': 'Refresh token is required'}, status=status.HTTP_400_BAD_REQUEST)
                
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Successfully logged out'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class VerifyEmailView(APIView):
    """POST {email, code}: checks the sign-up code; on success returns login tokens."""
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        from .verification import check_code
        email = str(request.data.get('email', '')).strip()
        code = str(request.data.get('code', '')).strip()
        if not email or not code:
            return Response({'detail': 'Enter the 6-digit code from your email.'}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({'detail': "That code isn't right."}, status=status.HTTP_400_BAD_REQUEST)
        if user.email_verified:
            return Response(
                {'detail': 'This email is already verified. Please log in.', 'code': 'already_verified'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        error = check_code(user, code)
        if error:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })


class ResendVerificationCodeView(APIView):
    """POST {email}: mails a new sign-up code (at most once a minute)."""
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        from .verification import hourly_limit_reached, needs_verification, send_code, seconds_until_resend
        email = str(request.data.get('email', '')).strip()
        user = User.objects.filter(email__iexact=email).first() if email else None
        # Same reply whether or not the email exists, so this can't be used to look up accounts.
        if user and needs_verification(user):
            wait = seconds_until_resend(user)
            if wait:
                return Response(
                    {'detail': f'Please wait {wait} seconds before asking for a new code.', 'retry_after': wait},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            if hourly_limit_reached(user):
                return Response(
                    {'detail': 'Too many codes were sent to this email. Please try again in an hour.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            if not send_code(user):
                return Response(
                    {'detail': "We couldn't send the email right now. Please try again in a moment."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
        return Response({'detail': 'If that email needs verifying, a new code is on its way.', 'retry_after': 60})


def _password_errors(password, user):
    """Django's password rules as a list of messages (empty when the password is fine)."""
    from django.contrib.auth.password_validation import validate_password
    from django.core.exceptions import ValidationError
    try:
        validate_password(password, user)
    except ValidationError as e:
        return list(e.messages)
    return []


def _sign_out_everywhere(user):
    """Ends every session of `user` by blacklisting their refresh tokens."""
    from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)


class PasswordCodeThrottle(AnonRateThrottle):
    """Per-IP limit on the forgot/reset endpoints, on top of the per-account limits."""
    rate = '20/hour'


class ForgotPasswordView(APIView):
    """POST {email}: mails a 6-digit password reset code.

    The reply is the same whether or not the email has an account, and also
    when the account is rate-limited or the email can't be sent, so the
    endpoint can't be used to find out who is registered.
    """
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (PasswordCodeThrottle,)

    def post(self, request):
        from .verification import send_code, seconds_until_resend
        email = str(request.data.get('email', '')).strip()
        if not email:
            return Response({'detail': 'Enter your email address.'}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.filter(email__iexact=email).first()
        if user and user.is_active and user.has_usable_password() and not seconds_until_resend(user):
            send_code(user, purpose='reset')
        return Response({
            'detail': 'If that email has a LAKBAY account, a reset code is on its way.', 'retry_after': 60,
        })


class ResetPasswordView(APIView):
    """POST {email, code, new_password}: sets a new password using the emailed code."""
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (PasswordCodeThrottle,)

    def post(self, request):
        from .verification import check_code, use_code
        email = str(request.data.get('email', '')).strip()
        code = str(request.data.get('code', '')).strip()
        new_password = str(request.data.get('new_password', ''))
        if not email or not code or not new_password:
            return Response(
                {'detail': 'Enter the code from your email and a new password.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Rules that don't depend on the account run first, the same for every email.
        errors = _password_errors(new_password, None)
        if errors:
            return Response({'detail': ' '.join(errors), 'field': 'new_password'}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.filter(email__iexact=email).first()
        # One reply for every failure (unknown email, no code, wrong or expired
        # code, locked out) so this can't reveal which emails have accounts.
        wrong = Response(
            {'detail': "That code isn't right or has expired. Check the email or ask for a new code."},
            status=status.HTTP_400_BAD_REQUEST,
        )
        if not user or not user.is_active or not user.has_usable_password():
            return wrong
        if check_code(user, code, consume=False):
            return wrong
        # Only someone holding the right code gets here, so account-specific
        # rules (e.g. too similar to the email) reveal nothing new.
        errors = _password_errors(new_password, user)
        if errors:
            return Response({'detail': ' '.join(errors), 'field': 'new_password'}, status=status.HTTP_400_BAD_REQUEST)
        use_code(user)
        user.set_password(new_password)
        user.save(update_fields=['password'])
        _sign_out_everywhere(user)
        return Response({'detail': 'Your password was changed. Please log in with the new one.'})


class ChangePasswordView(APIView):
    """POST {current_password, new_password}: changes the logged-in user's password.

    Every other session is signed out; this phone gets a fresh token pair.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        user = request.user
        current = str(request.data.get('current_password', ''))
        new_password = str(request.data.get('new_password', ''))
        if not current or not new_password:
            return Response(
                {'detail': 'Enter your current password and a new password.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not user.check_password(current):
            return Response(
                {'detail': 'Your current password is not correct.', 'field': 'current_password'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if current == new_password:
            return Response(
                {'detail': 'Choose a new password that is different from the current one.', 'field': 'new_password'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        errors = _password_errors(new_password, user)
        if errors:
            return Response({'detail': ' '.join(errors), 'field': 'new_password'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save(update_fields=['password'])
        _sign_out_everywhere(user)
        refresh = RefreshToken.for_user(user)
        return Response({
            'detail': 'Your password was changed.',
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })


class CharacterSetupView(generics.UpdateAPIView):
    serializer_class = CharacterSetupSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Return full user data after setup
        return Response(UserSerializer(instance).data, status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def test_auth(request):
    return Response({
        "user": request.user.email,
        "message": "Authentication successful!"
    })


class AdjustUserXPView(APIView):
    """
    POST: {"delta": 10} or {"delta": -5}
    Adjusts user's XP score, never going below 0.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            delta = int(request.data.get('delta', 0))
        except (ValueError, TypeError):
            return Response({'error': 'Valid integer delta is required'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        new_xp = max(0, user.xp + delta)
        user.xp = new_xp
        user.save(update_fields=['xp'])

        return Response({
            'message': 'XP adjusted successfully',
            'delta': delta,
            'xp': user.xp,
        })


class UserListView(APIView):
    """Admin-only: list all non-staff registered users."""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        users = User.objects.filter(is_staff=False).order_by('-date_joined')
        data = [
            {
                'id':               u.id,
                'full_name':        u.full_name,
                'email':            u.email,
                'in_game_name':     u.in_game_name or '',
                'chosen_character': u.chosen_character or '',
                'xp':               u.xp,
                'is_active':        u.is_active,
                'location':         u.location or '',
                'visitor_type':     u.visitor_type,
                'date_joined':      u.date_joined.strftime('%Y-%m-%d'),
            }
            for u in users
        ]
        return Response(data)


class ToggleUserStatusView(APIView):
    """Admin-only: activate or suspend a user."""
    permission_classes = [permissions.IsAdminUser]

    def patch(self, request, user_id):
        try:
            user = User.objects.get(pk=user_id, is_staff=False)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        return Response({'id': user.id, 'is_active': user.is_active})

class LeaderboardView(APIView):
    """Top tourists by XP. Exposes only public game identity: IGN, character, XP, level."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            limit = max(1, min(int(request.query_params.get('limit', 50)), 100))
        except (TypeError, ValueError):
            limit = 50

        players = (
            User.objects
            .filter(role='tourist', is_active=True, is_staff=False, in_game_name__isnull=False)
            .exclude(in_game_name='')
            .order_by('-xp', 'date_joined', 'id')
        )

        def entry(u, rank):
            return {
                'rank': rank,
                'id': u.id,
                'in_game_name': u.in_game_name,
                'chosen_character': u.chosen_character or '',
                'xp': u.xp,
                'level': level_for_xp(u.xp),
                'is_me': u.id == request.user.id,
                **cosmetics.equipped(u),
            }

        # Ties share a rank (1, 2, 2, 4) so equal XP is never ranked unfairly.
        results = []
        prev_xp, rank = None, 0
        for i, u in enumerate(players[:limit], start=1):
            if u.xp != prev_xp:
                rank, prev_xp = i, u.xp
            results.append(entry(u, rank))

        me = request.user
        me_entry = None
        if players.filter(pk=me.pk).exists():
            me_entry = entry(me, players.filter(xp__gt=me.xp).count() + 1)

        return Response({
            'results': results,
            'me': me_entry,
            'total_players': players.count(),
        })


class CosmeticsView(APIView):
    """GET: decoration catalog with unlock state + what is equipped.
    PATCH {hat|frame|pin|backdrop: id}: equip items the player's XP has unlocked."""
    permission_classes = [permissions.IsAuthenticated]

    def _payload(self, user):
        return {
            'xp': user.xp,
            'equipped': cosmetics.equipped(user),
            'catalog': cosmetics.catalog_for(user.xp),
        }

    def get(self, request):
        return Response(self._payload(request.user))

    def patch(self, request):
        user = request.user
        updates = {}
        for slot, field in cosmetics.SLOT_FIELDS.items():
            if slot not in request.data:
                continue
            item_id = request.data.get(slot) or ''
            min_xp = cosmetics.min_xp_for(slot, item_id)
            if min_xp is None:
                return Response({'error': f'Unknown {slot}: {item_id}'}, status=status.HTTP_400_BAD_REQUEST)
            if user.xp < min_xp:
                return Response(
                    {'error': f'This {slot} unlocks at {min_xp} XP.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            updates[field] = item_id
        for field, value in updates.items():
            setattr(user, field, value)
        if updates:
            user.save(update_fields=list(updates))
        return Response(self._payload(user))
