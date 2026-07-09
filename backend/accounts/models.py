from django.contrib.auth.models import AbstractUser
from django.db import models
from .managers import CustomUserManager

class CustomUser(AbstractUser):
    AUTH_PROVIDERS = (
        ('email', 'Email'),
        ('google', 'Google'),
    )
    ROLE_CHOICES = (
        ('tourist', 'Tourist'),
        ('admin', 'Administrator'),
        ('tourist_guide', 'Tourist Guide'),
    )
    VISITOR_TYPE_CHOICES = (
        ('local', 'Local'),
        ('tourist', 'Tourist'),
    )

    username = None
    email = models.EmailField(unique=True)
    # first_name and last_name are inherited from AbstractUser. middle_initial
    # is optional. full_name is kept as the canonical display name and is
    # composed from the parts at sign-up.
    middle_initial = models.CharField(max_length=5, blank=True)
    full_name = models.CharField(max_length=255)
    in_game_name = models.CharField(max_length=100, unique=True, null=True, blank=True)
    chosen_character = models.CharField(max_length=100, null=True, blank=True)
    profile_photo = models.ImageField(upload_to='profile_photos/', null=True, blank=True)
    auth_provider = models.CharField(max_length=50, choices=AUTH_PROVIDERS, default='email')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='tourist')
    xp = models.IntegerField(default=0)

    # Location the user provides at sign-up, and the classification derived
    # from it: users inside Zamboanga City are "local", everyone else "tourist".
    location = models.CharField(max_length=255, null=True, blank=True)
    visitor_type = models.CharField(
        max_length=10, choices=VISITOR_TYPE_CHOICES, default='tourist'
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    objects = CustomUserManager()

    @staticmethod
    def compose_full_name(first_name, last_name, middle_initial=''):
        """Build a display name from the parts, e.g. "Juan D. Dela Cruz".
        The middle initial is normalised to a single trailing-period token."""
        mi = (middle_initial or '').strip().rstrip('.').upper()
        parts = [(first_name or '').strip()]
        if mi:
            parts.append(f'{mi}.')
        parts.append((last_name or '').strip())
        return ' '.join(p for p in parts if p).strip()

    @staticmethod
    def classify_visitor_type(location):
        """Return 'local' when the given location is within Zamboanga City,
        otherwise 'tourist'. Matching is case-insensitive.

        Note the "zamboanga" name is shared with other places that are NOT the
        city (e.g. Zamboanga Sibugay, Zamboanga del Sur/Norte, the Zamboanga
        Peninsula region). Those must classify as tourists unless the location
        explicitly names Zamboanga City."""
        if not location:
            return 'tourist'

        text = location.strip().lower()
        if 'zamboanga' not in text:
            return 'tourist'

        # Markers that identify a Zamboanga province/region rather than the city.
        non_city_markers = ('del sur', 'del norte', 'sibugay', 'peninsula')
        if any(marker in text for marker in non_city_markers):
            return 'local' if 'zamboanga city' in text else 'tourist'

        return 'local'

    def __str__(self):
        return self.email