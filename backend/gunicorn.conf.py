# Loaded automatically by `gunicorn config.wsgi` when started from this directory.
# Gunicorn's default is 1 sync worker, which serves one request at a time: a slow
# request (e.g. a Cloudinary upload) blocks every page that loads after it.
import os

worker_class = "gthread"
workers = int(os.environ.get("WEB_CONCURRENCY", 2))
threads = int(os.environ.get("GUNICORN_THREADS", 4))
timeout = 120
