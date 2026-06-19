from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from decouple import config
from google import genai
import json
import re

@api_view(['POST'])
@permission_classes([AllowAny])
def generate_quiz(request):
    topic = request.data.get('topic', 'Cultural Icon')
    information = request.data.get('information', '')
    
    api_key = config('GEMINI_API_KEY', default='')
    if not api_key:
        return Response({"error": "Gemini API key not configured"}, status=500)
        
    client = genai.Client(api_key=api_key)
    
    prompt = f"""
    Based on the following information about {topic}, generate exactly 5 multiple-choice trivia questions.
    The questions should test the user's reading comprehension of the provided text.
    
    Information:
    {information}
    
    Return the output STRICTLY as a JSON array of objects. Do not wrap it in markdown or backticks. 
    Each object must have exactly these keys:
    - "question" (string)
    - "options" (array of 4 strings)
    - "correct_answer" (string, must exactly match one of the options)
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        
        # Clean up markdown formatting if the AI includes it
        text = response.text.strip()
        text = re.sub(r'^```json\s*', '', text)
        text = re.sub(r'^```\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        text = text.strip()
        
        quiz_data = json.loads(text)
        return Response({"quiz": quiz_data})
    except Exception as e:
        return Response({"error": str(e)}, status=500)
