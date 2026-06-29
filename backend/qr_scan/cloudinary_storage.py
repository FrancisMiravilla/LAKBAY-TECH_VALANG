import os
import cloudinary.uploader
from django.core.files.storage import Storage


class CloudinaryRawStorage(Storage):
    """
    Stores raw binary files (GLB, GLTF, etc.) on Cloudinary's CDN.
    The field value saved to the database is the full secure HTTPS URL
    returned by Cloudinary, so instance.model_3d.url works with no extra logic.
    """

    def deconstruct(self):
        return ('qr_scan.cloudinary_storage.CloudinaryRawStorage', [], {})

    def _save(self, name, content):
        folder = os.path.dirname(name).replace('\\', '/')
        result = cloudinary.uploader.upload(
            content,
            resource_type='raw',
            folder=folder or 'lakbay/models',
            overwrite=True,
            use_filename=True,
            unique_filename=False,
        )
        return result['secure_url']

    def url(self, name):
        return name

    def exists(self, name):
        return False

    def _open(self, name, mode='rb'):
        raise NotImplementedError('CloudinaryRawStorage is write-only.')

    def delete(self, name):
        pass

    def get_valid_name(self, name):
        return name

    def get_available_name(self, name, max_length=None):
        return name
