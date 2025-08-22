# Specification: Form Scanning and Voice-Guided Filling

## 1. Overview

This document outlines the specifications for a new feature that allows users to scan a physical form, convert it into a digital and fillable format, and then complete it either manually or through a voice-guided chat interface. The final, filled form will be saved to the user's device, with the flexibility to switch to a cloud-based storage solution like Supabase in the future.

## 2. Core Features

### 2.1. Form Scanning and Conversion
- The user can scan a physical form using the device's camera.
- The scanned image is sent to an OpenAI LLM, which analyzes it and converts it into a structured JSON representation of the form fields.

### 2.2. User Choice
- After the form is processed, the user is presented with two options:
  1.  **Manual Filling**: A standard digital form interface.
  2.  **Voice-Guided Filling**: A voice chat interface that walks the user through the form.

### 2.3. Manual Form Filling
- A dynamically generated form is displayed based on the structured JSON from the LLM.
- The user can input text, select options, and fill out the form as they would with any digital form.

### 2.4. Voice-Guided Form Filling
- A chat interface powered by the OpenAI Realtime API.
- The AI assistant will ask the user questions corresponding to each form field.
- The user's spoken responses are transcribed and used to fill the form fields.
- A voice bubble animation will be displayed when the user is speaking to provide visual feedback.

### 2.5. Data Storage
- Once the form is completed (either manually or via voice), the filled data is saved to the device.
- The storage mechanism will be designed as a modular `StorageService`, making it easy to replace the local storage implementation with a Supabase backend in the future without altering the core application logic.

## 3. Technical Stack

- **Frontend**: React Native / Expo
- **AI/LLM**: OpenAI API (Vision for scanning, Realtime for voice chat)
- **Backend/Security**: Supabase Functions (to act as a secure proxy for OpenAI API calls, preventing exposure of API keys on the client).

## 4. API and Data Models

### 4.1. Supabase Functions
- **`process-form`**: 
  - **Input**: Image of the form (e.g., in base64 format).
  - **Action**: Calls the OpenAI Vision API with a prompt engineered for structured form extraction.
  - **Output**: A JSON object representing the form's structure (e.g., `[{ "fieldName": "Full Name", "fieldType": "text" }, ...]`).
- **`start-voice-session`**:
  - **Input**: The structured JSON of the form.
  - **Action**: Initiates a session with the OpenAI Realtime API, providing it with the context of the form to be filled.
  - **Output**: Session details required for the client to connect.

### 4.2. Data Model
- **Form Structure**: A JSON array representing the fields of the form.
  ```json
  [
    { "fieldName": "email_address", "label": "Email Address", "type": "email" },
    { "fieldName": "full_name", "label": "Full Name", "type": "text" },
    { "fieldName": "age", "label": "Age", "type": "number" }
  ]
  ```
- **Filled Form Data**: A simple key-value object.
  ```json
  {
    "email_address": "test@example.com",
    "full_name": "John Doe",
    "age": 30
  }
  ```

## 5. Screens, Components, and Services

### 5.1. Screens (Feature-Specific Views)
Located in `app/forms/screens/`:

- **`FormScannerScreen.tsx`**: A screen that uses the device camera to capture an image of the form.
- **`FormPreviewScreen.tsx`**: Displays the captured image and allows the user to confirm before processing.
- **`ChoiceScreen.tsx`**: The screen where the user chooses between manual and voice-guided filling.
- **`ManualFormScreen.tsx`**: Renders a dynamic form based on the JSON structure received from the `process-form` function.
- **`VoiceChatScreen.tsx`**: The main screen for the voice-guided experience. It will handle the connection to the OpenAI Realtime API and include the voice bubble animation.

### 5.2. Reusable Components
Located in the root `/components` directory:

- Any generic, reusable components (e.g., custom buttons, input fields, loading indicators) will be created and placed here to be shared across the application.

### 5.3. Services
Located in `app/forms/services/`:

- **`FormProcessor.ts`**: A module to interact with the `process-form` Supabase function.
- **`VoiceService.ts`**: A module to manage the voice chat session.
- **`StorageService.ts`**: A modular service for saving and retrieving form data, initially implemented for local device storage.
