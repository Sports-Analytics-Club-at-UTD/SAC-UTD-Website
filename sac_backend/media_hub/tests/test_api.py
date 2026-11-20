from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Role
from core.test_utils import as_list, make_user
from media_hub.models import MediaUpload

# Keep test uploads off S3/disk.
IN_MEMORY_STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}


class MediaUploadWorkflowTests(APITestCase):
    def setUp(self):
        self.officer = make_user("mkt_officer1", role=Role.OFFICER_MARKETING)
        self.director = make_user("mkt_dir1", role=Role.DIRECTOR_MARKETING)
        self.other_officer = make_user("mkt_officer2", role=Role.OFFICER_MARKETING)

    def test_officer_can_submit_upload_defaults_to_pending(self):
        self.client.force_authenticate(user=self.officer)
        response = self.client.post(
            reverse("media_hub:media-upload-list"), {"title": "Homecoming tailgate photo"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        upload = MediaUpload.objects.get(id=response.data["id"])
        self.assertEqual(upload.status, MediaUpload.Status.PENDING)
        self.assertEqual(upload.uploaded_by, self.officer)

    def test_officer_only_sees_own_uploads(self):
        MediaUpload.objects.create(title="Mine", uploaded_by=self.officer)
        MediaUpload.objects.create(title="Not mine", uploaded_by=self.other_officer)

        self.client.force_authenticate(user=self.officer)
        response = self.client.get(reverse("media_hub:media-upload-list"))
        titles = [u["title"] for u in as_list(response.data)]
        self.assertIn("Mine", titles)
        self.assertNotIn("Not mine", titles)

    def test_director_sees_all_uploads(self):
        MediaUpload.objects.create(title="From officer 1", uploaded_by=self.officer)
        MediaUpload.objects.create(title="From officer 2", uploaded_by=self.other_officer)

        self.client.force_authenticate(user=self.director)
        response = self.client.get(reverse("media_hub:media-upload-list"))
        self.assertEqual(len(as_list(response.data)), 2)

    def test_director_can_approve_upload(self):
        upload = MediaUpload.objects.create(title="Needs review", uploaded_by=self.officer)
        self.client.force_authenticate(user=self.director)

        url = reverse("media_hub:media-upload-review", args=[upload.id])
        response = self.client.post(url, {"status": "approved"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        upload.refresh_from_db()
        self.assertEqual(upload.status, MediaUpload.Status.APPROVED)

    def test_officer_cannot_approve_own_upload(self):
        upload = MediaUpload.objects.create(title="Sneaky self-approve", uploaded_by=self.officer)
        self.client.force_authenticate(user=self.officer)

        url = reverse("media_hub:media-upload-review", args=[upload.id])
        response = self.client.post(url, {"status": "approved"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        upload.refresh_from_db()
        self.assertEqual(upload.status, MediaUpload.Status.PENDING)

    def test_public_approved_feed_only_shows_approved_items_no_auth_needed(self):
        MediaUpload.objects.create(title="Approved one", uploaded_by=self.officer, status=MediaUpload.Status.APPROVED)
        MediaUpload.objects.create(title="Still pending", uploaded_by=self.officer, status=MediaUpload.Status.PENDING)
        MediaUpload.objects.create(title="Rejected one", uploaded_by=self.officer, status=MediaUpload.Status.REJECTED)

        self.client.force_authenticate(user=None)  # public homepage scroller, no login
        response = self.client.get(reverse("media_hub:media-upload-approved"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [u["title"] for u in response.data]
        self.assertEqual(titles, ["Approved one"])

    def test_logged_out_cannot_list_or_upload(self):
        url = reverse("media_hub:media-upload-list")
        self.assertEqual(self.client.get(url).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            self.client.post(url, {"title": "anon"}, format="json").status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_unapproved_user_cannot_upload(self):
        pending = make_user("mkt_pending", role=Role.OFFICER_MARKETING, is_approved=False)
        self.client.force_authenticate(user=pending)
        response = self.client.post(reverse("media_hub:media-upload-list"), {"title": "x"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_officer_cannot_edit_or_delete_own_upload_director_can(self):
        upload = MediaUpload.objects.create(title="Mine", uploaded_by=self.officer)
        url = reverse("media_hub:media-upload-detail", args=[upload.id])

        self.client.force_authenticate(user=self.officer)
        self.assertEqual(self.client.patch(url, {"display_order": 1}, format="json").status_code, 403)
        self.assertEqual(self.client.delete(url).status_code, 403)

        self.client.force_authenticate(user=self.director)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_204_NO_CONTENT)

    def test_list_shows_uploader_username(self):
        MediaUpload.objects.create(title="Mine", uploaded_by=self.officer)
        self.client.force_authenticate(user=self.officer)
        response = self.client.get(reverse("media_hub:media-upload-list"))
        self.assertEqual(as_list(response.data)[0]["uploaded_by_username"], "mkt_officer1")

    @override_settings(STORAGES=IN_MEMORY_STORAGES)
    def test_upload_accepts_images_and_rejects_other_files(self):
        self.client.force_authenticate(user=self.officer)
        url = reverse("media_hub:media-upload-list")

        image = SimpleUploadedFile("flyer.png", b"\x89PNG fake", content_type="image/png")
        self.assertEqual(self.client.post(url, {"title": "ok", "file": image}).status_code, 201)

        script = SimpleUploadedFile("evil.html", b"<script>", content_type="text/html")
        self.assertEqual(self.client.post(url, {"title": "bad", "file": script}).status_code, 400)

        disguised = SimpleUploadedFile("evil.html", b"<script>", content_type="image/png")
        self.assertEqual(self.client.post(url, {"title": "bad", "file": disguised}).status_code, 400)
