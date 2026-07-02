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
    def classify_visitor_type(location):
        """Return 'local' when the given location is within Zamboanga City,
        otherwise 'tourist'. Matching is case-insensitive on the city name."""
        if location and 'zamboanga' in location.strip().lower():
            return 'local'
        return 'tourist'

    def __str__(self):
        return self.email