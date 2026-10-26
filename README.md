# 🎙️ Real-Time Speech Emotion Detection (Deep Learning - LSTM)

A real-time emotion detection system from speech using deep learning techniques. This project captures voice input from users, analyzes it using an LSTM-based neural network, and detects emotions such as **happy**, **sad**, **angry**, **neutral**, etc. It also provides **personalized recommendations** based on the detected emotion.

---

## 🎯 Objective

To detect human emotions in real-time from voice using deep learning and provide meaningful feedback like songs, activities, or motivational content based on the emotion.

---

## 🧠 Technologies & Libraries

- **Python**
- **TensorFlow / Keras** (LSTM model)
- **Librosa** (audio feature extraction)
- **Flask + Flask-SocketIO** (real-time backend)
- **React.js** (frontend UI)
- **Socket.IO** (for real-time audio communication)
- **pyaudio / sounddevice** (live audio input)


---

## 🗂️ Features

- 🎤 Real-time microphone input and transcription
- 📊 LSTM model trained on audio features (MFCC)
- 😄 Emotion classes: Happy, Sad, Angry, Neutral, etc.
- 🧠 Live emotion visualization
- 📽️ Suggests songs, videos, or activities based on detected emotion
- 🔌 REST + WebSocket communication (React + Flask)

---

## 🔧 Setup Instructions

### 1. Clone the Repo
```bash
git clone https://github.com/your-username/speech-emotion-detector.git
cd emotion-detector

cd backend
python -m venv env
source env/bin/activate  # or `env\Scripts\activate` on Windows
pip install -r requirements.txt
python app.py


python train_model.py


cd frontend
npm install
npm start


speech-emotion-detector/
├── backend/
│   ├── app.py
│   ├── model/ (trained LSTM)
│   ├── utils/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   └── public/
└── README.md




Last updated: 2026-10-26 04:31 UTC
