from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL

class Wallet(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wallet')
    balance = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user}'s Wallet - {self.balance} Coins"


class CoinBundle(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    coins_amount = models.PositiveIntegerField()
    price_php = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.coins_amount} coins for {self.price_php} PHP)"


class UserPromotion(models.Model):
    STATUS_CHOICES = (
        ('DRAFT', 'Draft'),
        ('PENDING_REVIEW', 'Pending Review'),
        ('APPROVED_PENDING_PAYMENT', 'Approved - Pending Payment'),
        ('PUBLISHED', 'Published'),
        ('REJECTED', 'Rejected'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='promotions')
    spot_name = models.CharField(max_length=200) # Could be a ForeignKey to a Spot model if you have one
    description = models.TextField()
    
    # Image and 3D model files (stored in Cloudinary)
    image_file = models.ImageField(upload_to='promotions/images/', blank=True, null=True)
    model_3d_file = models.FileField(upload_to='promotions/3d_models/', blank=True, null=True)

    # Location
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)

    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='DRAFT')
    rejection_reason = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Promotion for {self.spot_name} by {self.user}"


class Transaction(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('PAID', 'Paid'),
        ('FAILED', 'Failed'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    bundle = models.ForeignKey(CoinBundle, on_delete=models.SET_NULL, null=True, related_name='transactions')
    
    paymongo_checkout_id = models.CharField(max_length=255, blank=True, null=True)
    paymongo_payment_intent_id = models.CharField(max_length=255, blank=True, null=True)
    
    amount_php = models.DecimalField(max_digits=10, decimal_places=2)
    coins_to_add = models.PositiveIntegerField()
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Transaction {self.id} - {self.user} - {self.status}"

class AppSetting(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.IntegerField()
    description = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.key}: {self.value}"
