from django.db import models
from .cloudinary_storage import CloudinaryRawStorage

# Create your models here.
class CulturalSpot(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()
    historical_background = models.TextField()
    cultural_significance = models.TextField()
    fun_fact = models.TextField(blank=True)
    hook = models.CharField(max_length=300, blank=True)
    image = models.ImageField(upload_to='spot_images/', null=True, blank=True)
    image2 = models.ImageField(upload_to='spot_images/', null=True, blank=True)
    image3 = models.ImageField(upload_to='spot_images/', null=True, blank=True)
    images = models.JSONField(default=list, blank=True)
    location_name = models.CharField(max_length=200)
    latitude = models.FloatField()
    longitude = models.FloatField()
    feature_types = models.JSONField(default=list)
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class QRMarker(models.Model):
    spot = models.ForeignKey(CulturalSpot, on_delete=models.CASCADE, related_name='qr_markers')
    qr_code_string = models.CharField(max_length=500, unique=True)
    is_active = models.BooleanField(default=True)
    bonus_creature = models.CharField(max_length=100, blank=True)
    unlock_type = models.CharField(
        max_length=50,
        choices=[
            ('cultural_story', 'Cultural Story'),
            ('ar_creature', 'AR Creature'),
            ('hidden_game', 'Hidden Game Content'),
        ],
        default='cultural_story'
    )
    scan_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.spot.name} — {self.qr_code_string[:30]}"


class QRScan(models.Model):
    user = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.CASCADE,
        related_name='qr_scans'
    )
    qr_marker = models.ForeignKey(QRMarker, on_delete=models.CASCADE, related_name='scans')
    scanned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'qr_marker')

    def __str__(self):
        return f"{self.user.email} scanned {self.qr_marker.spot.name}"


class TriviaQuestion(models.Model):
    spot = models.ForeignKey(CulturalSpot, on_delete=models.CASCADE, related_name='questions')
    question = models.CharField(max_length=300)
    choices = models.JSONField()          # ["A", "B", "C", "D"]
    correct_index = models.IntegerField() # never sent to the client


class SpotBadge(models.Model):
    user = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, related_name='spot_badges')
    spot = models.ForeignKey(CulturalSpot, on_delete=models.CASCADE)
    awarded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'spot')


class TriviaAttempt(models.Model):
    user = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, related_name='trivia_attempts')
    spot = models.ForeignKey(CulturalSpot, on_delete=models.CASCADE, related_name='trivia_attempts')
    score = models.IntegerField()
    total = models.IntegerField()
    passed = models.BooleanField(default=False)
    attempted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} — {self.spot.name} ({self.score}/{self.total})"


class CulturalIcon(models.Model):
    name = models.CharField(max_length=100)
    emoji = models.CharField(max_length=10)
    tagline = models.CharField(max_length=200)
    type_name = models.CharField(max_length=100) # e.g. "Marine Creature"
    color = models.CharField(max_length=20, default="#E91E8C")
    about = models.TextField()
    significance = models.TextField()
    facts = models.JSONField(default=list, blank=True)
    model_3d = models.FileField(
        upload_to='lakbay/models/',
        storage=CloudinaryRawStorage(),
        max_length=500,
        null=True, blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name