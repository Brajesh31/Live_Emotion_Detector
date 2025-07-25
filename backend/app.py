

from flask import Flask
from flask_socketio import SocketIO, emit
import numpy as np
import librosa
import io
import tensorflow as tf
import wave
import logging
from datetime import datetime

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Setup logging
logging.basicConfig(level=logging.INFO, filename="app.log", format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Load trained LSTM model
model = tf.keras.models.load_model("speech_emotion_model.h5")

# Emotion labels
emotion_labels = ["Neutral", "Calm", "Happy", "Sad", "Angry", "Fearful", "Disgust", "Surprised"]

# Recommendation dictionary for music, videos, and activities
recommendations = {
    "Neutral": {
        "music": "Lo-fi beats (e.g., ChilledCow’s Lo-Fi Hip Hop Radio)",
        "video": "TED Talk: How to Get Stuff Done",
        "activity": "Journaling or a short walk"
    },
    "Calm": {
        "music": "Classical: Debussy’s Clair de Lune",
        "video": "BBC Planet Earth nature clips",
        "activity": "Meditation or yoga"
    },
    "Happy": {
        "music": "Pop: Pharrell Williams’ Happy",
        "video": "Key & Peele comedy sketches",
        "activity": "Dancing or calling a friend"
    },
    "Sad": {
        "music": "Acoustic: Ed Sheeran’s Perfect",
        "video": "The Pursuit of Happyness clips",
        "activity": "Writing a gratitude list"
    },
    "Angry": {
        "music": "Rock: Linkin Park’s Numb",
        "video": "John Wick action trailer",
        "activity": "Running or punching bag workout"
    },
    "Fearful": {
        "music": "Ambient: Brian Eno’s Music for Airports",
        "video": "Headspace anxiety relief video",
        "activity": "5-4-3-2-1 grounding technique"
    },
    "Disgust": {
        "music": "Jazz: Miles Davis’ So What",
        "video": "Funny pet videos on YouTube",
        "activity": "Cleaning or creative hobby"
    },
    "Surprised": {
        "music": "Electronic: Daft Punk’s One More Time",
        "video": "Inception movie trailer",
        "activity": "Trying a new recipe or quiz"
    }
}

# AML-specific recommendations for agent guidance
aml_recommendations = {
    "Fearful": {
        "action": "De-escalate: Speak calmly, reassure about security measures.",
        "resource": "AML de-escalation training video",
        "resource_link": "https://example.com/de-escalation-training"
    },
    "Angry": {
        "action": "Resolve conflict: Acknowledge frustration, offer escalation.",
        "resource": "Conflict resolution guide",
        "resource_link": "https://example.com/conflict-resolution"
    },
    "Sad": {
        "action": "Show empathy: Express understanding, offer support.",
        "resource": "Empathy training module",
        "resource_link": "https://example.com/empathy-training"
    },
    "Neutral": {
        "action": "Maintain professionalism: Continue with standard procedure.",
        "resource": "AML compliance guide",
        "resource_link": "https://example.com/aml-compliance"
    },
    "Calm": {
        "action": "Reinforce trust: Confirm transaction details clearly.",
        "resource": "Customer trust-building guide",
        "resource_link": "https://example.com/trust-building"
    },
    "Happy": {
        "action": "Engage positively: Thank them for their cooperation.",
        "resource": "Positive customer engagement tips",
        "resource_link": "https://example.com/positive-engagement"
    },
    "Disgust": {
        "action": "Redirect focus: Address concerns politely and shift to solutions.",
        "resource": "Handling difficult customers",
        "resource_link": "https://example.com/difficult-customers"
    },
    "Surprised": {
        "action": "Clarify details: Explain unexpected aspects calmly.",
        "resource": "Effective communication guide",
        "resource_link": "https://example.com/communication-guide"
    }
}

# Get model input shape
EXPECTED_SHAPE = model.input_shape
print(f"✅ Model expected input shape: {EXPECTED_SHAPE}")

def convert_to_wav(audio_data):
    """Convert raw audio bytes to WAV format"""
    try:
        wav_io = io.BytesIO()
        with wave.open(wav_io, "wb") as wf:
            wf.setnchannels(1)  # Mono audio
            wf.setsampwidth(2)  # 16-bit PCM
            wf.setframerate(22050)  # 22.05 kHz
            wf.writeframes(audio_data)
        wav_io.seek(0)
        return wav_io
    except Exception as e:
        logger.error(f"Error converting to WAV: {str(e)}")
        return None

def extract_features(audio_data):
    try:
        # Convert raw audio to WAV
        audio_wav = convert_to_wav(audio_data)
        if audio_wav is None:
            return None

        # Load audio file using librosa
        y, sr = librosa.load(audio_wav, sr=22050)

        # Extract MFCC features
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40)

        # Pad or truncate to ensure fixed length (200 frames)
        max_pad_len = 200
        if mfccs.shape[1] < max_pad_len:
            pad_width = max_pad_len - mfccs.shape[1]
            mfccs = np.pad(mfccs, ((0, 0), (0, pad_width)), mode='constant')
        else:
            mfccs = mfccs[:, :max_pad_len]

        # Reshape to match model input shape
        mfccs = np.expand_dims(mfccs, axis=0)  # Add batch dimension
        mfccs = np.expand_dims(mfccs, axis=-1)  # Add channel dimension

        print(f"✅ Final MFCC Shape for Model: {mfccs.shape}")
        return mfccs

    except Exception as e:
        logger.error(f"Feature Extraction Error: {str(e)}")
        return None

@socketio.on("audio_chunk")
def handle_audio_chunk(audio_data):
    """Handle incoming audio chunks from client"""
    logger.info("Received audio chunk")
    if not isinstance(audio_data, bytes) or len(audio_data) < 100:
        logger.error("Invalid audio data")
        emit("error", {"message": "Invalid audio data"})
        return

    features = extract_features(audio_data)
    if features is None:
        emit("error", {"message": "Failed to extract audio features"})
        return

    try:
        # Convert to float32 and match model input shape
        features = np.asarray(features).astype(np.float32)

        # Make prediction
        prediction = model.predict(features)
        emotion_index = np.argmax(prediction)
        detected_emotion = emotion_labels[emotion_index]
        confidence = float(prediction[0][emotion_index])

        # Emit emotion result with recommendations
        emit("emotion_result", {
            "emotion": detected_emotion,
            "confidence": confidence,
            "recommendations": recommendations.get(detected_emotion, {}),
            "aml_recommendations": aml_recommendations.get(detected_emotion, {})
        })
        logger.info(f"Predicted Emotion: {detected_emotion} (Confidence: {confidence:.2f})")

    except Exception as e:
        logger.error(f"Prediction Error: {str(e)}")
        emit("error", {"message": "Prediction failed"})

@socketio.on("stop_audio")
def stop_audio():
    """Stop receiving audio"""
    logger.info("Stopped Receiving Audio")

if __name__ == "__main__":
    socketio.run(app, debug=True)


