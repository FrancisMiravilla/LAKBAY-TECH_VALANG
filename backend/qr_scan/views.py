import json
import random
from html import escape
from django.conf import settings
from django.http import HttpResponse, HttpResponseBadRequest
from django.db.models import F
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, viewsets
from groq import Groq
from .models import CulturalSpot, QRMarker, QRScan, TriviaQuestion, SpotBadge, TriviaAttempt, CulturalIcon
from .serializers import (
    CulturalSpotSerializer, QRMarkerSerializer,
    TriviaQuestionSerializer, TriviaQuestionAdminSerializer,
    CulturalIconSerializer
)

XP_PER_QUIZ = 50
PASS_THRESHOLD = 0.6  # 60% correct to pass


class CulturalIconViewSet(viewsets.ModelViewSet):
    queryset = CulturalIcon.objects.all().order_by('name')
    serializer_class = CulturalIconSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]


class CulturalSpotViewSet(viewsets.ModelViewSet):
    queryset = CulturalSpot.objects.all().order_by('name')
    serializer_class = CulturalSpotSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]


class QRMarkerViewSet(viewsets.ModelViewSet):
    queryset = QRMarker.objects.select_related('spot').all().order_by('created_at')
    serializer_class = QRMarkerSerializer
    permission_classes = [permissions.IsAdminUser]


class TriviaQuestionViewSet(viewsets.ModelViewSet):
    """Admin CRUD for trivia questions. Filter by spot: ?spot=<id>"""
    serializer_class = TriviaQuestionAdminSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = TriviaQuestion.objects.select_related('spot').all()
        spot_id = self.request.query_params.get('spot')
        if spot_id:
            qs = qs.filter(spot_id=spot_id)
        return qs


class ValidateQRView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        qr_code = request.data.get('qr_code')

        if not qr_code:
            return Response(
                {'error': 'qr_code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            marker = QRMarker.objects.select_related('spot').get(
                qr_code_string=qr_code,
                is_active=True
            )
        except QRMarker.DoesNotExist:
            return Response(
                {'valid': False, 'error': 'Invalid or inactive QR code'},
                status=status.HTTP_404_NOT_FOUND
            )

        _, created = QRScan.objects.get_or_create(user=request.user, qr_marker=marker)
        already_scanned = not created

        if created:
            QRMarker.objects.filter(pk=marker.pk).update(scan_count=F('scan_count') + 1)

        spot = marker.spot
        image_url = request.build_absolute_uri(spot.image.url) if spot.image else None
        image2_url = request.build_absolute_uri(spot.image2.url) if getattr(spot, 'image2', None) else None
        image3_url = request.build_absolute_uri(spot.image3.url) if getattr(spot, 'image3', None) else None
        has_trivia = TriviaQuestion.objects.filter(spot=spot).exists()

        return Response({
            'valid': True,
            'already_scanned': already_scanned,
            'unlock_type': marker.unlock_type,
            'bonus_creature': marker.bonus_creature,
            'has_trivia': has_trivia,
            'spot': {
                'id': spot.id,
                'name': spot.name,
                'hook': spot.hook,
                'image': image_url,
                'image2': image2_url,
                'image3': image3_url,
                'description': spot.description,
                'historical': {
                    'label': 'HISTORICAL BACKGROUND',
                    'body': spot.historical_background,
                },
                'cultural': {
                    'label': 'CULTURAL SIGNIFICANCE',
                    'body': spot.cultural_significance,
                },
                'funFact': {
                    'label': 'FUN FACT',
                    'body': spot.fun_fact,
                },
                'location': spot.location_name,
            }
        }, status=status.HTTP_200_OK)


class UserQRScansView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        scans = QRScan.objects.filter(
            user=request.user
        ).select_related('qr_marker__spot').order_by('-scanned_at')

        data = [{
            'spot_name': scan.qr_marker.spot.name,
            'scanned_at': scan.scanned_at,
            'unlock_type': scan.qr_marker.unlock_type,
        } for scan in scans]

        return Response({'scans': data, 'total': len(data)})


class SpotTriviaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    QUESTIONS_PER_QUIZ = 5

    def get(self, request, spot_id):
        spot = get_object_or_404(CulturalSpot, pk=spot_id)
        all_questions = list(TriviaQuestion.objects.filter(spot=spot))
        sample = random.sample(all_questions, min(self.QUESTIONS_PER_QUIZ, len(all_questions)))
        serializer = TriviaQuestionSerializer(sample, many=True)
        return Response({
            'spot_id': spot.id,
            'spot_name': spot.name,
            'questions': serializer.data,
        })


class SubmitTriviaView(APIView):
    """
    POST body: {"answers": [{"question_id": 1, "choice_index": 0}, ...]}
    Awards badge + XP on first passing attempt (>=60% correct).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, spot_id):
        spot = get_object_or_404(CulturalSpot, pk=spot_id)
        answers = request.data.get('answers', [])

        if not answers:
            return Response(
                {'error': 'answers list is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        score = 0
        results = []

        for item in answers:
            question_id = item.get('question_id')
            choice_index = item.get('choice_index')

            try:
                q = TriviaQuestion.objects.get(pk=question_id, spot=spot)
                correct = (choice_index == q.correct_index)
                if correct:
                    score += 1
                results.append({'question_id': question_id, 'correct': correct})
            except TriviaQuestion.DoesNotExist:
                results.append({'question_id': question_id, 'correct': False})

        total = len(answers)
        passed = total > 0 and (score / total) >= PASS_THRESHOLD

        TriviaAttempt.objects.create(
            user=request.user, spot=spot,
            score=score, total=total, passed=passed
        )

        xp_earned = 0
        badge_awarded = False

        if passed:
            badge, created = SpotBadge.objects.get_or_create(user=request.user, spot=spot)
            if created:
                request.user.__class__.objects.filter(pk=request.user.pk).update(
                    xp=F('xp') + XP_PER_QUIZ
                )
                request.user.refresh_from_db(fields=['xp'])
                xp_earned = XP_PER_QUIZ
                badge_awarded = True

        return Response({
            'score': score,
            'total': total,
            'passed': passed,
            'results': results,
            'badge_awarded': badge_awarded,
            'xp_earned': xp_earned,
            'total_xp': request.user.xp,
        })


class GenerateAITriviaView(APIView):
    """
    GET /api/qr/spots/<spot_id>/ai-trivia/
    Generates 5 unique trivia questions for the spot using Gemini.
    Each call returns a fresh set so every user gets a different experience.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, spot_id):
        spot = get_object_or_404(CulturalSpot, pk=spot_id)

        client = Groq(api_key=settings.GROQ_API_KEY)

        prompt = f"""You are a cultural trivia generator for a Philippine tourism app called LAKBAY.

Generate exactly 5 multiple-choice trivia questions about this cultural spot:

Name: {spot.name}
Location: {spot.location_name}
Description: {spot.description}
Historical Background: {spot.historical_background}
Cultural Significance: {spot.cultural_significance}
Fun Fact: {spot.fun_fact or 'N/A'}

Rules:
- Each question must have exactly 4 choices
- Questions must be factual and based on the info above
- Vary the difficulty (mix easy, medium, hard)
- Do NOT repeat the same question type
- Return ONLY valid JSON, no markdown, no explanation

Required JSON format:
{{
  "questions": [
    {{
      "question": "Question text here?",
      "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
      "correct_index": 0
    }}
  ]
}}"""

        try:
            response = client.chat.completions.create(
                model='llama-3.1-8b-instant',
                messages=[{'role': 'user', 'content': prompt}],
                temperature=1.0,
            )
            raw = response.choices[0].message.content.strip()
            # Strip markdown code fences if Gemini wraps with ```json
            if raw.startswith('```'):
                raw = raw.split('```')[1]
                if raw.startswith('json'):
                    raw = raw[4:]
            data = json.loads(raw.strip())
            questions = []
            for q in data.get('questions', [])[:5]:
                idx = q.get('correct_index', 0)
                questions.append({
                    'question':      q['question'],
                    'choices':       q['choices'],
                    'correct_answer': q['choices'][idx],
                })
            return Response({'spot_id': spot.id, 'spot_name': spot.name, 'questions': questions})
        except Exception as e:
            return Response(
                {'error': f'AI generation failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class GenerateIconAITriviaView(APIView):
    """
    GET /api/qr/catch-icons/<icon_id>/ai-trivia/
    Generates 5 trivia questions about a cultural icon using Groq AI.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, icon_id):
        icon = get_object_or_404(CulturalIcon, pk=icon_id)

        client = Groq(api_key=settings.GROQ_API_KEY)

        prompt = f"""You are a cultural trivia generator for a Philippine tourism app called LAKBAY.

Generate exactly 5 multiple-choice trivia questions about this cultural icon from Zamboanga City:

Name: {icon.name}
About: {icon.about}
Cultural Significance: {icon.significance}
Tagline: {icon.tagline}

Rules:
- Each question must have exactly 4 choices
- Questions must be factual and based on the info above
- Vary the difficulty (mix easy, medium, hard)
- Do NOT repeat the same question type
- Return ONLY valid JSON, no markdown, no explanation

Required JSON format:
{{
  "questions": [
    {{
      "question": "Question text here?",
      "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
      "correct_index": 0
    }}
  ]
}}"""

        try:
            response = client.chat.completions.create(
                model='llama-3.1-8b-instant',
                messages=[{'role': 'user', 'content': prompt}],
                temperature=1.0,
            )
            raw = response.choices[0].message.content.strip()
            if raw.startswith('```'):
                raw = raw.split('```')[1]
                if raw.startswith('json'):
                    raw = raw[4:]
            data = json.loads(raw.strip())
            questions = []
            for q in data.get('questions', [])[:5]:
                idx = q.get('correct_index', 0)
                questions.append({
                    'question':      q['question'],
                    'choices':       q['choices'],
                    'correct_answer': q['choices'][idx],
                })
            return Response({'icon_id': icon.id, 'icon_name': icon.name, 'questions': questions})
        except Exception as e:
            return Response(
                {'error': f'AI generation failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


def model_viewer_page(request):
    """Serves the 3-D model viewer HTML page for the mobile WebView.
    Query param: ?url=<glb_url>
    No authentication required — it's a static page, not an API endpoint.
    """
    model_url = request.GET.get('url', '').strip()
    if not model_url:
        return HttpResponseBadRequest('Missing ?url parameter')

    safe_url = escape(model_url)

    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
  <style>
    *{{margin:0;padding:0;box-sizing:border-box;}}
    html,body{{width:100%;height:100%;background:transparent;overflow:hidden;}}

    canvas{{position:absolute;top:0;left:0;width:100%!important;height:100%!important;}}

    .disc{{
      position:absolute;bottom:10%;left:50%;
      transform:translateX(-50%);
      width:120px;height:20px;
      background:radial-gradient(ellipse,rgba(233,30,140,0.45) 0%,transparent 70%);
      border-radius:50%;
      animation:discPulse 3s ease-in-out infinite;
      pointer-events:none;
      z-index:10;
    }}
    @keyframes discPulse{{
      0%,100%{{transform:translateX(-50%) scaleX(1);opacity:0.5;}}
      50%{{transform:translateX(-50%) scaleX(1.3);opacity:0.2;}}
    }}

    .ring{{
      position:absolute;bottom:10%;left:50%;
      border-radius:50%;border-style:solid;
      animation:ringPulse 3s ease-in-out infinite;
      pointer-events:none;
      z-index:10;
    }}
    .ring1{{width:130px;height:22px;border-width:2px;border-color:rgba(233,30,140,0.35);animation-delay:0s;}}
    .ring2{{width:165px;height:28px;border-width:1px;border-color:rgba(180,79,232,0.2);animation-delay:0.5s;}}
    @keyframes ringPulse{{
      0%,100%{{transform:translateX(-50%) scaleX(1);opacity:1;}}
      50%{{transform:translateX(-50%) scaleX(1.2);opacity:0.3;}}
    }}

    .particle{{
      position:absolute;top:50%;left:50%;
      width:5px;height:5px;
      background:#e91e8c;border-radius:50%;
      margin:-2.5px 0 0 -2.5px;
      animation:orbit linear infinite;
      pointer-events:none;
      z-index:10;
    }}
    @keyframes orbit{{
      from{{transform:rotate(var(--a)) translateX(var(--r)) scale(var(--s));opacity:var(--o);}}
      50%{{opacity:calc(var(--o)*0.3);}}
      to{{transform:rotate(calc(var(--a) + 360deg)) translateX(var(--r)) scale(var(--s));opacity:var(--o);}}
    }}
  </style>
</head>
<body>
  <div class="disc"></div>
  <div class="ring ring1"></div>
  <div class="ring ring2"></div>

  <script type="importmap">
  {{
    "imports": {{
      "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
    }}
  }}
  </script>

  <script type="module">
    import * as THREE from 'three';
    import {{ GLTFLoader }} from 'three/addons/loaders/GLTFLoader.js';

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({{ antialias: true, alpha: true }});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(renderer.domElement);

    // ── Scene / Camera ────────────────────────────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0.3, 2.8);

    // ── Lighting ──────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 2.5));
    const sun = new THREE.DirectionalLight(0xffffff, 3.0);
    sun.position.set(4, 8, 6);
    scene.add(sun);
    const back = new THREE.DirectionalLight(0xffffff, 1.5);
    back.position.set(-4, 4, -4);
    scene.add(back);
    const fill = new THREE.DirectionalLight(0xe91e8c, 0.4);
    fill.position.set(0, -4, 4);
    scene.add(fill);

    // ── Load GLB ──────────────────────────────────────────────────────────────
    let model = null;
    let floatClock = 0;

    new GLTFLoader().load(
      '{safe_url}',
      (gltf) => {{
        model = gltf.scene;

        // Fix materials — ensure vertex colors and textures render correctly
        model.traverse((child) => {{
          if (child.isMesh) {{
            const mat = child.material;
            if (mat) {{
              mat.needsUpdate = true;
              if (child.geometry.attributes.color) mat.vertexColors = true;
            }}
          }}
        }});

        // Auto-fit to viewport (larger target size)
        const box    = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());
        const scale  = 2.4 / Math.max(size.x, size.y, size.z);
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));

        scene.add(model);

        if (window.ReactNativeWebView)
          window.ReactNativeWebView.postMessage(JSON.stringify({{type:'MODEL_LOADED'}}));
      }},
      undefined,
      () => {{
        if (window.ReactNativeWebView)
          window.ReactNativeWebView.postMessage(JSON.stringify({{type:'MODEL_ERROR'}}));
      }}
    );

    // ── CSS particles ─────────────────────────────────────────────────────────
    for (var i = 0; i < 30; i++) {{
      var p     = document.createElement('div');
      p.className = 'particle';
      var ang   = (i / 30) * 360;
      var rad   = (55 + Math.random() * 60).toFixed(0) + 'px';
      var dur   = (3  + Math.random() * 5 ).toFixed(2) + 's';
      var delay = (-Math.random() * 8     ).toFixed(2) + 's';
      var sc    = (0.5 + Math.random() * 0.9).toFixed(2);
      var op    = (0.35 + Math.random() * 0.65).toFixed(2);
      p.style.cssText = '--a:'+ang+'deg;--r:'+rad+';--s:'+sc+';--o:'+op+
        ';animation-duration:'+dur+';animation-delay:'+delay;
      document.body.appendChild(p);
    }}

    // ── Animate ───────────────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    (function animate() {{
      requestAnimationFrame(animate);
      const dt = clock.getDelta();
      floatClock += dt;
      if (model) {{
        model.rotation.y += dt * 0.45;
        model.position.y  = Math.sin(floatClock * 1.1) * 0.12;
      }}
      renderer.render(scene, camera);
    }})();

    // ── Resize ────────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {{
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }});
  </script>
</body>
</html>"""

    response = HttpResponse(html, content_type='text/html; charset=utf-8')
    response['X-Frame-Options'] = 'ALLOWALL'
    response['Access-Control-Allow-Origin'] = '*'
    return response
