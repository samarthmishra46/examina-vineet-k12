import os
import sys

from dotenv import load_dotenv

load_dotenv()

from sarvamai import SarvamAI

api_key = os.environ.get("SARVAM_API_KEY")
if not api_key:
    sys.exit("SARVAM_API_KEY is not set. Add it to scripts/sarvam-test/.env and re-run.")

client = SarvamAI(api_subscription_key=api_key)

response = client.chat.completions(
    model="sarvam-105b-conversations",
    messages=[{"role": "user", "content": "Hello! Reply with a short one-line greeting."}],
)

print(response.choices[0].message.content)
