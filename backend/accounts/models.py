from django.contrib.auth.models import AbstractUser
from django.db import models
from .managers import CustomUserManager

class CustomUser(AbstractUser):
    AUTH_PROVIDERS = (
        ('email', 'Email'),
        ('google', 'Google'),
    )

    username = None
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    in_game_name = models.CharField(max_length=100, unique=True, null=True, blank=True)
    chosen_character = models.CharField(max_length=100, null=True, blank=True)
    profile_photo = models.ImageField(upload_to='profile_photos/', null=True, blank=True)
    auth_provider = models.CharField(max_length=50, choices=AUTH_PROVIDERS, default='email')
    xp = models.IntegerField(default=0)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    objects = CustomUserManager()

    def __str__(self):
        return self.email