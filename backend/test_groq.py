from decouple import config
from groq import Groq

key = config('GROQ_API_KEY', default='')
client = Groq(api_key=key)
try:
    response = client.chat.completions.create(
        model='llama-3.1-8b-instant',
        messages=[{'role': 'user', 'content': 'Say hello briefly.'}],
        temperature=0.5,
    )
    print('SUCCESS:', response.choices[0].message.content)
except Exception as e:
    print('ERROR:', type(e).__name__, str(e))
