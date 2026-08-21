from django.contrib import admin

from .models import MediaUpload


@admin.register(MediaUpload)
class MediaUploadAdmin(admin.ModelAdmin):
    list_display = ("title", "uploaded_by", "status", "reviewed_by", "display_order")
    list_filter = ("status",)
    search_fields = ("title",)
