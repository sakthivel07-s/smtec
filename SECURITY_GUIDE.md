# Security Best Practices for SMTEC

You noticed that your Firebase API Key is visible in the browser. **This is completely normal for Firebase web apps.**

Unlike a backend server password, the Firebase API Key is just an identifier that tells Google "this request belongs to the SMTEC project." It does **not** give full admin access to your database.

However, to make your app 100% secure, you must follow these two steps:

## 1. Restrict the API Key (Prevent Quota Theft)
Since the key is public, someone could theoretically copy it and use it on *their* website, using up your free tier limits. To stop this, you must tell Google to **only accept requests from your specific domains**.

1.  Go to the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
2.  Select your project (e.g., `smtec-9b0af`).
3.  Find the **"Browser key"** (or the key that matches the one in your code) and click the **Edit icon (pencil)**.
4.  Under **"Application restrictions"**, select **"Websites"**.
5.  Click **"Add Item"** and add these two entries:
    *   `https://smtec.netlify.app/*` (Your live site)
    *   `http://localhost:5173/*` (For your local testing)
6.  Click **Save**.

**Result:** Now, if a hacker copies your API key and tries to use it on `evil-hacker.com`, Google will block the request immediately.

## 2. Firestore Rules (Prevent Data Theft)
We have already implemented this! The `firestore.rules` file we created ensures that even if someone *does* try to send a request from your website:
*   They **cannot** write data unless they are an Admin.
*   They **cannot** delete data unless they are an Admin.
*   They **cannot** read data unless they are logged in.

## 3. (Optional) Use Environment Variables
To keep your code clean and avoid committing keys to GitHub, we should move the config to a `.env` file.

1.  Create a file named `.env` in your project root (`e:\smtec\.env`).
2.  Add your keys there:
    ```env
    VITE_FIREBASE_API_KEY=AIzaSyCAf...
    VITE_FIREBASE_AUTH_DOMAIN=smtec-....firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=smtec-...
    ...
    ```
3.  Update `src/config/firebase.js` to use `import.meta.env.VITE_FIREBASE_API_KEY` instead of the hardcoded string.

*Note: Even with .env files, the key will still be visible in the browser network tab. This is unavoidable for client-side apps. Step 1 (Key Restriction) is the correct solution.*
