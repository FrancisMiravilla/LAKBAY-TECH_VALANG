import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from promotions.models import Transaction, Wallet

txs = Transaction.objects.filter(status='PENDING')
count = 0
for t in txs:
    w, _ = Wallet.objects.get_or_create(user=t.user)
    w.balance += t.coins_to_add
    w.save()
    t.status = 'PAID'
    t.save()
    count += 1
print('Fulfilled', count, 'transactions')
