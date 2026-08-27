from django.db import models


class BudgetItem(models.Model):
    event = models.ForeignKey('events.Event', on_delete=models.CASCADE, related_name='budget_items')
    category = models.CharField(max_length=100)
    planned_amount = models.DecimalField(max_digits=10, decimal_places=2)
    actual_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return f'{self.category} for {self.event}'


class Payment(models.Model):
    class Type(models.TextChoices):
        DEPOSIT = 'deposit', 'Deposit'
        BALANCE = 'balance', 'Balance'
        EXPENSE = 'expense', 'Expense'
        REFUND = 'refund', 'Refund'

    class Method(models.TextChoices):
        CASH = 'cash', 'Cash'
        BANK_TRANSFER = 'bank_transfer', 'Bank Transfer'
        CARD = 'card', 'Card'
        MOBILE_MONEY = 'mobile_money', 'Mobile Money'
        CHEQUE = 'cheque', 'Cheque'

    event = models.ForeignKey('events.Event', on_delete=models.CASCADE, related_name='payments')
    type = models.CharField(max_length=20, choices=Type.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()
    method = models.CharField(max_length=20, choices=Method.choices)
    reference = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f'{self.get_type_display()} of {self.amount} for {self.event}'
