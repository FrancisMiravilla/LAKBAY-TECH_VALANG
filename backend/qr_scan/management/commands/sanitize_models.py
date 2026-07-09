"""Re-sanitize already-uploaded 3D models.

New uploads are cleaned automatically in the serializer, but models uploaded
before that was added still contain glTF extensions Viro's AR loader can't
parse (e.g. KHR_materials_sheen), so they stay invisible in mobile AR. This
command downloads each stored .glb, strips those extensions, and re-uploads the
cleaned file to Cloudinary, updating the record's URL.

Usage:
    python manage.py sanitize_models          # apply changes
    python manage.py sanitize_models --dry-run  # report only, no writes
"""

import urllib.request
import uuid

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from qr_scan.models import ARTarget, CulturalSpot
from qr_scan.glb_utils import strip_incompatible_extensions
from qr_scan.cloudinary_storage import CloudinaryRawStorage


class Command(BaseCommand):
    help = "Strip Viro-incompatible glTF extensions from already-uploaded 3D models."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help="Report what would change without uploading.")

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        targets = [
            (ARTarget, 'AR target'),
            (CulturalSpot, 'cultural spot'),
        ]
        total_changed = 0

        for model_cls, label in targets:
            for obj in model_cls.objects.exclude(model_3d='').exclude(model_3d__isnull=True):
                url = str(obj.model_3d)
                if not url:
                    continue
                try:
                    raw = self._download(url)
                except Exception as exc:  # noqa: BLE001 — report and continue
                    self.stderr.write(f"  ! {label} #{obj.id} '{obj.name}': download failed ({exc})")
                    continue

                cleaned = strip_incompatible_extensions(raw)
                needs_ext_fix = not url.endswith('.glb')
                if cleaned == raw and not needs_ext_fix:
                    self.stdout.write(f"  = {label} #{obj.id} '{obj.name}': already clean")
                    continue

                saved = len(raw) - len(cleaned)
                reason = f"strip {saved} bytes" if cleaned != raw else "fix .glb extension"
                if dry_run:
                    self.stdout.write(f"  ~ {label} #{obj.id} '{obj.name}': WOULD {reason}")
                    total_changed += 1
                    continue

                try:
                    new_url = self._upload(cleaned)
                except Exception as exc:  # noqa: BLE001
                    self.stderr.write(f"  ! {label} #{obj.id} '{obj.name}': upload failed ({exc})")
                    continue

                obj.model_3d = new_url
                obj.save(update_fields=['model_3d'])
                total_changed += 1
                self.stdout.write(self.style.SUCCESS(
                    f"  + {label} #{obj.id} '{obj.name}': sanitized ({saved} bytes) -> {new_url}"))

        verb = "would be" if dry_run else "were"
        self.stdout.write(self.style.SUCCESS(f"\nDone. {total_changed} model(s) {verb} sanitized."))

    @staticmethod
    def _download(url):
        req = urllib.request.Request(url, headers={'User-Agent': 'lakbay-sanitizer'})
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.read()

    @staticmethod
    def _upload(data):
        # Use the same storage as normal uploads so the URL ends in .glb. The
        # ContentFile MUST have a .glb name — Cloudinary derives the public_id
        # from it (a nameless stream becomes ".../stream" with no extension).
        storage = CloudinaryRawStorage()
        content = ContentFile(data, name=f"{uuid.uuid4().hex}.glb")
        return storage._save(f"lakbay/models/{content.name}", content)
