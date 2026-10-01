import base64
import os
import sys

from dotenv import load_dotenv

load_dotenv()

from sarvamai import SarvamAI

api_key = os.environ.get("SARVAM_API_KEY")
if not api_key:
    sys.exit("SARVAM_API_KEY is not set. Add it to scripts/sarvam-test/.env and re-run.")

client = SarvamAI(api_subscription_key=api_key)

HINGLISH_LINE = (
    "Chaliye shuru karte hain. Is question mein percentage ko fraction mein "
    "convert karo, calculation bahut fast ho jayegi. Dekho, ek simple trick hai."
)

CANDIDATE_VOICES = ["aditya", "rahul", "vijay"]

for voice in CANDIDATE_VOICES:
    response = client.text_to_speech.convert(
        text=HINGLISH_LINE,
        language_code="hi-IN",
        speaker=voice,
        model="bulbul:v3",
    )
    audio_bytes = base64.b64decode(response.audios[0])
    out_path = f"aryan_sir_{voice}.wav"
    with open(out_path, "wb") as f:
        f.write(audio_bytes)
    print(f"Wrote {out_path}")
