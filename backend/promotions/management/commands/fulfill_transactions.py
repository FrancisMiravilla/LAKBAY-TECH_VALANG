from django.core.management.base import BaseCommand
from promotions.models import Transaction, Wallet

class Command(BaseCommand):
    help = 'Manually fulfill all pending transactions when PayMongo webhooks are delayed'

    def handle(self, *args, **kwargs):
        txs = Transaction.objects.filter(status='PENDING')
        count = 0
        
        if not txs.exists():
            self.stdout.write(self.style.WARNING('No pending transactions found.'))
            return

        for t in txs:
            w, _ = Wallet.objects.get_or_create(user=t.user)
            w.balance += t.coins_to_add
            w.save()
            t.status = 'PAID'
            t.save()
            count += 1
            self.stdout.write(self.style.SUCCESS(f'Fulfilled {t.coins_to_add} coins for user {t.user.username}'))
            
        self.stdout.write(self.style.SUCCESS(f'Successfully fulfilled {count} pending transactions!'))
