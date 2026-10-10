#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

echo "==> Installing Python dependencies..."
pip install -r requirements.txt

echo "==> Collecting static files..."
python manage.py collectstatic --noinput

echo "==> Applying database migrations..."
python manage.py migrate

echo "==> Checking / creating Administrator account..."
python manage.py shell << 'EOF'
import os
from django.contrib.auth import get_user_model

User = get_user_model()
email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
full_name = os.environ.get('DJANGO_SUPERUSER_FULL_NAME', 'System Administrator')

if email and password:
    user, created = User.objects.get_or_create(
        email=email.strip(),
        defaults={
            'full_name': full_name.strip(),
            'role': 'admin',
            'is_staff': True,
            'is_superuser': True,
            'is_active': True,
        }
    )
    if created:
        user.set_password(password.strip())
        user.save()
        print(f"Successfully created Administrator account for: {email}")
    else:
        user.is_staff = True
        user.is_superuser = True
        user.role = 'admin'
        user.set_password(password.strip())
        user.save()
        print(f"Administrator account {email} already exists; updated admin privileges & password.")
else:
    print("Notice: DJANGO_SUPERUSER_EMAIL and DJANGO_SUPERUSER_PASSWORD not set in environment. Skipping admin creation.")
EOF

echo "==> Build script completed successfully!"
