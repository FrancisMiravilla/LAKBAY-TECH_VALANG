import os
import sys

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from promotions.models import CoinBundle

User = get_user_model()

def run_test():
    print("Starting PayMongo Integration Test...\n")
    
    user = User.objects.first()
    if not user:
        print("No users found. Creating a temporary test user...")
        user = User.objects.create_user(email='testpaymongo@example.com', password='password123')
    
    bundle = CoinBundle.objects.first()
    if not bundle:
        print("❌ Error: No CoinBundles found! Please create one in the Django admin.")
        return

    print(f"Found User: {user.email}")
    print(f"Found Bundle: {bundle.name} - {bundle.coins_amount} coins for {bundle.price_php} PHP")

    from rest_framework.test import APIClient
    client = APIClient()
    # Authenticate via DRF to bypass JWT requirements
    client.force_authenticate(user=user)

    print("\nSending request to /api/promotions/checkout/ ...")
    response = client.post('/api/promotions/checkout/', {'bundle_id': bundle.id})
    
    print(f"Response Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("\nSUCCESS! PayMongo generated a checkout URL:")
        print(f"Link: {data.get('checkout_url')}")
        print("\nYou can copy and paste that link into your browser to see the actual payment page!")
    else:
        print("\nFAILED! Something went wrong.")
        print(response.json())

if __name__ == '__main__':
    run_test()
