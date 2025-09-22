# IEEE VBIT SB - Dynamic Event Registration Portal

**Version:** 2.1 (QR Payments & IEEE Member Verification)
**Branch:** Main

## 1. Project Overview

This is a comprehensive, dynamic web application designed for the IEEE VBIT SB to manage event registrations. It solves the challenge of needing to manually edit code for each new event by providing a secure admin dashboard for all event management tasks.

This version utilizes a robust **QR Code and Manual Verification** system and introduces a flexible, conditional registration flow for IEEE members.

### Key Features

*   **Dynamic Event Management:** Admins can create, edit, activate, and close event registrations entirely through the dashboard without touching any code.
*   **Flexible Registration Forms:**
    *   Supports distinct registration forms for **Students** and **Faculty**.
    *   Allows for unique, custom questions for both participant types on a per-event basis.
*   **Advanced Payment System:**
    *   Admins can enable payments by providing a fee, a payment QR code, and clear instructions.
    *   **Conditional Free Registration:** Admins can configure, on a per-event basis, whether registration is free for IEEE members.
*   **IEEE Member Verification Flow:**
    *   A special registration path for IEEE members allows them to submit their Membership ID and Card for verification.
    *   Includes a pop-up guide with images and links to help users find their membership details.
*   **Admin Verification Workflow:** The "View Registrations" page intelligently displays the correct information for each participant, showing either payment details or IEEE membership credentials.
*   **Two-Step Email Confirmations:** Uses the "Trigger Email" Firebase Extension to send:
    1.  An initial "Pending Verification" email upon submission.
    2.  A final "Registration Confirmed" email after an admin clicks "Verify."
*   **Secure Admin Dashboard:** A redesigned, password-protected area for all event management and data tracking.

---

## 2. Tech Stack

*   **Frontend:** HTML5, CSS3, JavaScript (ES6+)
*   **UI Framework:** Bootstrap 4
*   **Backend & Database:** **Firebase** (Serverless)
    *   **Authentication:** Firebase Auth for secure admin login.
    *   **Database:** Cloud Firestore (NoSQL) for storing all event and registration data.
    *   **Storage:** Firebase Storage for hosting event posters, QR codes, payment screenshots, and membership cards.
*   **Data Export:** Google Apps Script for pulling registration data from Firestore into a Google Sheet.

---

## 3. Prerequisites

To set up and manage this project, you will need:

1.  **Firebase Account:** You must be granted **"Editor"** access to the project on the [Firebase Console](https://console.firebase.google.com/).
2.  **Google Account:** Required for using the Google Apps Script to export registration data.

---

## 4. Local Development Setup

This is a static frontend application, making the local setup very straightforward.

1.  **Get the Code:** Download and unzip the project folder to a location on your computer.

2.  **Update Firebase Configuration:**
    *   Open the `Assets/Scripts/config.js` file in a code editor.
    *   Ensure the `firebaseConfig` object contains the correct API keys and project ID from your Firebase project settings.

3.  **Run Locally:**
    *   The recommended method is to use the **Live Server** extension in Visual Studio Code.
    *   Right-click the `index.html` file in the project's root directory and select "Open with Live Server".

---

## 5. Firebase Configuration

### Firestore Security Rules

The database is protected by rules that define access permissions. These are configured in the **Firebase Console > Firestore Database > Rules**.

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Rule for the 'events' collection
    match /events/{eventId} {
      allow read: if true;
      allow write, delete: if request.auth != null;
    }

    // Rule for the 'pastEvents' collection
    match /pastEvents/{eventId} {
      allow read: if true;
      allow write, delete: if request.auth != null;
    }
    
    // Rule for ALL OTHER collections (e.g., Registrations, Mail Queue)
    match /{collection}/{docId} {
      allow create: if true;                      // Allows anyone to submit a registration.
      allow read, update: if request.auth != null; // Allows admins to read/verify data.
      allow delete: if false;                     // Protects against accidental deletion.
    }
  }
}

---
### Firestore Security Rules
File storage is also secured. These are configured in Firebase Console > Storage > Rules.
code
```JavaScript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {

    // Rule for Admin-Uploaded assets
    match /(event_posters|past_event_posters|qr_codes)/{imageId=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Rule for Publicly Uploaded files (Screenshots and Membership Cards)
    match /(screenshots|membership_cards)/{fileId=**} {
      // Allow ANYONE to upload a file.
      allow write: if true;
      
      // Allow ANYONE to read the file. This is required for getDownloadURL() to work.
      allow read: if true;
    }
  }
}
```
## 6. Google Apps Script for Data Export
Create a new Google Sheet.
Open Extensions > Apps Script.
Replace the default content of Code.gs with the code from the provided Apps Script file.
In the Apps Script editor, go to Project Settings (the gear icon ⚙️) and enable "Show 'appsscript.json' manifest file in editor".
Click on the appsscript.json file that appears and paste the content from the provided appsscript.json file. This is crucial for connecting to Firebase.
*Configure the Script:*
In Code.gs, update the FIREBASE_PROJECT_ID variable with your project's ID.
For each event you want to export, update the FIRESTORE_COLLECTION variable to match the collection name generated by the website (e.g., MyEventNameParticipants).
The provided script is pre-configured to handle all participant data, including student/faculty specific fields and IEEE member verification details (membershipId, membershipCardURL).
## 7 Run the Script:
From the Google Sheet, a new menu item named "Firebase Importer" will appear. Click it, then select "Import Registrations".
The first time, a pop-up will ask for authorization. You must grant the script permission to connect to external services (Firebase) and manage your spreadsheets.
After authorization, the script will execute and populate your sheet with the registration data.
