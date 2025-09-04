# Inga

🏆 **Winner of the Diamond Hacks 2025 Patient Safety Sponsor Award**

**Contributors:**  
- Iha Gadiya  
- Ninad Satish

---

## Purpose

Inga is an experimental voice assistant and document management app built for DiamondHacks 2025.  
It helps users securely upload, scan, fill, and manage medical documents and images.  
The app features a chat interface for document-related queries and supports form filling directly from your device.

---

## Functionality

- **Upload/scan multi-page documents:** Capture and store multiple pages of medical documents and images.
- **Fill forms with PDF preview:** Complete medical forms and preview the finalized PDF before submission.
- **Chat to simplify medical terms:** Use the chat interface to get simplified explanations of medical terms, with support for language selection. The chat is pre-prompted to provide easy-to-understand term explanations.
- **Language selection:** Choose your preferred language for chat and document interactions.

---

## Features

- Secure authentication with Supabase
- Upload and scan medical documents/images
- Store documents and images in Supabase
- Fill forms and submit them digitally
- PDF form preview before finalizing
- Chat interface for document and form assistance, focused on simplifying medical language
- Language selection for chat and document interactions
- Modern UI with Expo and React Native

---

## Tools Used

- **Expo** (React Native framework)
- **Supabase** (database, authentication, storage, edge functions)
- **OpenAI** (for chat and language simplification)
- **PDF libraries** (for form preview and finalization)
- **Expo Router** (for navigation)
- **TypeScript** (for type safety)
- **Jest** (for testing)

---

## Architecture

- **Mobile app:** Handles UI and user interactions
- **Supabase:** Provides database, storage, authentication, and secure proxy functions for OpenAI
- **Supabase Edge Functions:**  
  - `openai-proxy`: Handles standard text-based chat messages  
  - `openai-vision`: Handles messages containing both text and images

**Security:**  
- Authentication required for all API requests  
- OpenAI API keys stored server-side  
- Images accessed via signed URLs  
- Each user can only access their own data

---

## Get Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Add environment variables to the `.env` file**
   ```
   SUPABASE_URL=your-supabase-url
   SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. **Deploy Supabase Functions (if using your own Supabase project)**
   ```bash
   cd supabase/functions
   chmod +x deploy.sh
   ./deploy.sh
   ```
   Set these secrets for the functions:
   ```bash
   supabase secrets set OPENAI_API_KEY=your-openai-api-key
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. **Start the app**
   ```bash
   npx expo start
   ```

   After running `npx expo start`, you will see options in your terminal to open the app in several environments:

   - **Development build:** For full native features and debugging ([setup guide](https://docs.expo.dev/develop/development-builds/introduction/))
   - **Android emulator:** Press `a` to launch the app in Android Studio's emulator ([setup guide](https://docs.expo.dev/workflow/android-studio-emulator/))
   - **iOS simulator:** Press `i` to launch the app in Xcode's iOS simulator ([setup guide](https://docs.expo.dev/workflow/ios-simulator/))
   - **Expo Go:** Scan the QR code with the Expo Go app on your iOS or Android device ([Expo Go](https://expo.dev/go)). This is a quick way to preview the app, but some native features may be limited.

   Choose the option that matches your development setup. For most features, a development build or emulator/simulator is recommended.

---

## Disclaimer

This app is an experimental project for public use and **does not fall under HIPAA compliance**.  
No liability is taken for the handling, storage, or transmission of medical data.  
Please do not use this app for sensitive or regulated medical information.