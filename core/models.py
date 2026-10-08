import uuid

from django.db import models


class BaseModel(models.Model):
    """
    Abstract base for every EgoBellPay model.

    Gives each table a UUID primary key and created/updated timestamps,
    so the other models do not repeat these three fields.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
