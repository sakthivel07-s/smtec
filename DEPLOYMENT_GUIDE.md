# How to Deploy SMTEC to Netlify

This guide will help you host your Student Management System on Netlify.

## Prerequisites
- I have already created a `netlify.toml` file in your project folder. This is **critical** for the app to work correctly (it handles page routing).
- I have successfully ran `npm run build` to verify your code is ready for production.

---

## Method 1: The Easiest Way (Drag & Drop)

This method is perfect for a quick deployment without setting up Git repositories.

1.  **Locate the Build Folder:**
    - Go to your project folder: `e:\smtec`
    - You should see a folder named `dist`. This folder contains your production-ready website.

2.  **Log in to Netlify:**
    - Open [Netlify](https://app.netlify.com/) in your browser.
    - Log in or Sign up.

3.  **Deploy:**
    - Once logged in, go to the **"Sites"** tab.
    - You will see a box that says **"Drag and drop your site output folder here"**.
    - Drag the **`dist`** folder from your file explorer and drop it into that box on the Netlify website.

4.  **Wait & Verify:**
    - Netlify will upload and deploy your site in a few seconds.
    - Once done, it will give you a random URL (e.g., `jolly-panda-123456.netlify.app`). Click it to test your site.

---

## Method 2: The Professional Way (Git Integration)

This method is recommended for the final product. It automatically updates your website whenever you push code changes to GitHub.

1.  **Push to GitHub:**
    - Ensure your project is pushed to a GitHub repository.

2.  **New Site from Git:**
    - On Netlify, click **"Add new site"** -> **"Import from an existing project"**.
    - Choose **GitHub**.
    - Authorize Netlify to access your GitHub account.
    - Select your `smtec` repository.

3.  **Configure Build Settings:**
    - Netlify should detect these automatically, but double-check:
        - **Build command:** `npm run build`
        - **Publish directory:** `dist`
    - Click **"Deploy Site"**.

---

## Important Note on Firebase
Since your app uses Firebase, your deployed site will work immediately because the Firebase configuration is embedded in your code. However, for better security in a real production environment, you should restrict your Firebase API keys to only allow requests from your Netlify domain (e.g., `your-app.netlify.app`).

1.  Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2.  Select your project.
3.  Edit your API Key restrictions.
4.  Under "Website restrictions", add your new Netlify URL.
