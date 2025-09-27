Test2 Branch>
Registration Website - 2(2.2)
Gateway based payments

# IEEE VBIT SB - Dynamic Event Registration Portal

## Project Overview

This is a comprehensive, dynamic web application designed for the IEEE VBIT SB to manage event registrations. It solves the problem of needing to manually code and deploy a new website for each event. With this system, all event creation, management, and registration tracking is handled through a secure admin dashboard, with a separate, public-facing page that automatically displays the currently active event.

The project includes a full payment integration with Razorpay, allowing for both free and paid event registrations with automated payment processing.

### Key Features

*   **Dynamic Event Management:** Admins can create, edit, activate, and close registrations for events without touching any code.
*   **Flexible Registration Forms:**
    *   Supports both individual and team-based registrations with variable team sizes.
    *   Allows for different registration forms for Students and Faculty.
    *   Supports adding unique, custom questions for each audience type per event.
*   **Automated Payment Gateway:**
    *   Integrated with Razorpay for secure and automated payment collection for paid events.
    *   Handles both free and paid event flows seamlessly.
*   **Secure Admin Dashboard:** A password-protected area for all event management tasks.
*   **Automated Email Confirmations:** Uses the "Trigger Email" Firebase Extension to automatically send professional HTML confirmation emails upon successful registration.

---

## Tech Stack

*   **Frontend:** HTML5, CSS3, JavaScript (ES6+)
*   **UI Framework:** Bootstrap 4
*   **Backend:** Firebase (Serverless)
    *   **Authentication:** Firebase Auth for secure admin login.
    *   **Database:** Cloud Firestore (NoSQL) for storing all event and registration data.
    *   **Serverless Functions:** Firebase Cloud Functions (Node.js) for securely interacting with the Razorpay API.
    *   **Storage:** Firebase Storage for hosting event posters.
*   **Payment Gateway:** Razorpay

---

## Prerequisites

Before you begin, you will need the following:

1.  **Node.js and npm:** Required for the backend Firebase Functions. Download from [nodejs.org](https://nodejs.org/).
2.  **Firebase CLI:** The command-line tool for managing and deploying Firebase projects. Install it globally by running: `npm install -g firebase-tools`
3.  **Firebase Account:** You must be granted "Editor" access to the project on the [Firebase Console](https://console.firebase.google.com/).
4.  **Razorpay Account:** You will need access to the IEEE VBIT SB Razorpay account to get API keys.

---

## Setup and Installation

Follow these steps to get the project running on your local machine for development.

### 1. Clone the Repository

First, get the code onto your machine.
```bash
git clone <repository_url>
cd <repository_folder>
```

### 2. Frontend Setup

The frontend is a simple static site. The easiest way to run it is with the **Live Server** extension in Visual Studio Code.

### 3. Backend Setup (Firebase Functions)

This is the most critical part.

1.  **Login to Firebase:** In your terminal (at the project's root), log in to the Google account that has access to the project:
    ```bash
    firebase login
    ```

2.  **Install Dependencies:** Navigate into the `functions` directory and install the necessary packages:
    ```bash
    cd functions
    npm install
    ```

3.  **Configure Secret Keys:** The backend function needs your Razorpay API keys to work. These are stored securely in Firebase Secrets, not in the code.
    *   Get the **Test Key ID** and **Test Key Secret** from the Razorpay Dashboard.
    *   In your terminal (still inside the `functions` directory), run these commands, pasting your keys when prompted:

    ```bash
    # Set the Key ID
    firebase functions:secrets:set RAZORPAY_KEY_ID

    # Set the Key Secret
    firebase functions:secrets:set RAZORPAY_KEY_SECRET
    ```

### 4. Running the Project Locally

To test the full application, you need both the frontend and the backend running.

1.  **Start the Frontend:** Use the "Live Server" extension on `index.html`.
2.  **Start the Backend Emulator:** In your terminal (inside the `functions` directory), run:
    ```bash
    firebase emulators:start --only functions
    ```
3.  The terminal will output a local URL for your `createOrder` function, which will look like:
    `http://127.0.0.1:5001/your-project-id/us-central1/createOrder`

4.  **Connect Frontend to Backend:**
    *   Open `Assets/Scripts/public-script.js`.
    *   Find the `CREATE_ORDER_URL` constant at the top.
    *   Paste the local emulator URL from your terminal into this variable.
    *   Ensure the `RAZORPAY_KEY_ID` constant is filled with your **Test Key ID**.

You can now perform a complete end-to-end test of a paid registration on your local machine.

---

## Firebase Configuration

### Firestore Security Rules

The database is protected by rules that only allow specific actions. These are configured in the **Firebase Console > Firestore Database > Rules**. The current secure ruleset is:

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
    
    // Rule for ALL OTHER collections (Registrations, Mail Queue, etc.)
    // This is a "catch-all" for any other collection name.
    match /{collection}/{docId} {
      // Allow anyone to CREATE a document (i.e., register).
      allow create: if true;
      
      // Allow a logged-in ADMIN to READ and UPDATE documents.
      allow read, update: if request.auth != null;
      
      // Block deletion for safety.
      allow delete: if false;
    }
  }
}

```

### Storage Security Rules

File storage is also protected. These are configured in **Firebase Console > Storage > Rules**. The current secure ruleset is:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {

    // Rule for Event Posters (Admin Upload)
    match /event_posters/{imageId=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Rule for Past Event Posters (Admin Upload)
    match /past_event_posters/{imageId=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Rule for QR Codes (Admin Upload)
    match /qr_codes/{imageId=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Rule for Payment Screenshots
    match /screenshots/{screenshotId=**} {
      // Allow ANY user to WRITE (upload) a screenshot.
      allow write, read: if true;
    }
  }
}
```

---

## Deployment

Deploying changes is a two-part process.

### 1. Deploying Backend Changes

If you make any changes to the code inside the **`functions`** folder:
1.  Navigate to the `functions` directory in your terminal.
2.  Run the deploy command:
    ```bash
    firebase deploy --only functions
    ```
3.  This will publish your new backend code. **Important:** If the Function URL changes, you must update it in `public-script.js` and redeploy the frontend.
