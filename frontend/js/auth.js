// ============================================================
// CLOUDVAULT AUTH.JS
// Login + Registration + Email OTP Verification
// ============================================================


// ============================================================
// BACKEND API
// ============================================================

const API_URL =
    "https://cloud-valet.onrender.com";


// ============================================================
// STATE
// ============================================================

let mode = "login";

let pendingEmail = null;


// ============================================================
// ELEMENTS
// ============================================================

const loginTab =
    document.getElementById("loginTab");

const registerTab =
    document.getElementById("registerTab");

const authForm =
    document.getElementById("authForm");

const nameGroup =
    document.getElementById("nameGroup");

const nameInput =
    document.getElementById("name");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const formTitle =
    document.getElementById("formTitle");

const formSubtitle =
    document.getElementById("formSubtitle");

const submitBtn =
    document.getElementById("submitBtn");

const message =
    document.getElementById("message");

const authSection =
    document.getElementById("authSection");

const otpSection =
    document.getElementById("otpSection");

const otpInput =
    document.getElementById("otpInput");

const otpEmailText =
    document.getElementById("otpEmailText");

const verifyOtpBtn =
    document.getElementById("verifyOtpBtn");

const resendOtpBtn =
    document.getElementById("resendOtpBtn");

const otpMessage =
    document.getElementById("otpMessage");

const backBtn =
    document.getElementById("backBtn");


// ============================================================
// IF USER IS ALREADY LOGGED IN
// ============================================================

const existingToken =
    localStorage.getItem(
        "cloudvault_token"
    );

const existingUser =
    localStorage.getItem(
        "cloudvault_user"
    );


if (
    existingToken &&
    existingUser
) {

    window.location.href =
        "index.html";

}


// ============================================================
// LOGIN TAB
// ============================================================

loginTab.addEventListener(
    "click",
    () => {

        mode = "login";

        loginTab
            .classList
            .add("active");

        registerTab
            .classList
            .remove("active");

        nameGroup.style.display =
            "none";

        formTitle.textContent =
            "Welcome Back";

        formSubtitle.textContent =
            "Login to your CloudVault account.";

        submitBtn.textContent =
            "Login";

        passwordInput.setAttribute(
            "autocomplete",
            "current-password"
        );

        clearMessage();

    }
);


// ============================================================
// REGISTER TAB
// ============================================================

registerTab.addEventListener(
    "click",
    () => {

        mode = "register";

        registerTab
            .classList
            .add("active");

        loginTab
            .classList
            .remove("active");

        nameGroup.style.display =
            "block";

        formTitle.textContent =
            "Create Account";

        formSubtitle.textContent =
            "Create your CloudVault account and verify your email.";

        submitBtn.textContent =
            "Create Account";

        passwordInput.setAttribute(
            "autocomplete",
            "new-password"
        );

        clearMessage();

    }
);


// ============================================================
// FORM SUBMIT
// ============================================================

authForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        clearMessage();


        const email =
            emailInput
                .value
                .trim()
                .toLowerCase();


        const password =
            passwordInput.value;


        // EMAIL CHECK

        if (!email) {

            showError(
                "Please enter your email."
            );

            return;

        }


        // PASSWORD CHECK

        if (!password) {

            showError(
                "Please enter your password."
            );

            return;

        }


        if (
            password.length < 6
        ) {

            showError(
                "Password must contain at least 6 characters."
            );

            return;

        }


        // REGISTER

        if (
            mode === "register"
        ) {

            const name =
                nameInput
                    .value
                    .trim();


            if (!name) {

                showError(
                    "Please enter your full name."
                );

                return;

            }


            await registerUser(
                name,
                email,
                password
            );

        }

        // LOGIN

        else {

            await loginUser(
                email,
                password
            );

        }

    }
);


// ============================================================
// REGISTER USER
// ============================================================

async function registerUser(
    name,
    email,
    password
) {

    try {

        submitBtn.disabled =
            true;


        submitBtn.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Sending OTP...
        `;


        const formData =
            new FormData();


        formData.append(
            "name",
            name
        );


        formData.append(
            "email",
            email
        );


        formData.append(
            "password",
            password
        );


        const response =
            await fetch(
                `${API_URL}/register`,
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await readJsonResponse(
                response
            );


        if (
            !response.ok
        ) {

            throw new Error(
                data.detail ||
                "Registration failed."
            );

        }


        pendingEmail =
            data.email ||
            email;


        showOtpScreen();


    } catch (error) {

        showError(
            error.message ||
            "Unable to register. Please try again."
        );


    } finally {

        submitBtn.disabled =
            false;


        submitBtn.textContent =
            mode === "register"
                ? "Create Account"
                : "Login";

    }

}


// ============================================================
// SHOW OTP SCREEN
// ============================================================

function showOtpScreen() {

    authSection.style.display =
        "none";


    otpSection.style.display =
        "block";


    otpEmailText.textContent =
        pendingEmail;


    otpInput.value =
        "";


    otpMessage.className =
        "message success";


    otpMessage.innerHTML = `
        OTP sent successfully.<br>
        Please check your Inbox.
        If you don't see the email,
        check your <strong>Spam or Junk folder</strong>.
    `;


    setTimeout(
        () => {

            otpInput.focus();

        },
        100
    );

}


// ============================================================
// OTP INPUT
// ============================================================

otpInput.addEventListener(
    "input",
    () => {

        otpInput.value =
            otpInput
                .value
                .replace(
                    /\D/g,
                    ""
                )
                .slice(
                    0,
                    6
                );

    }
);


// ============================================================
// VERIFY OTP BUTTON
// ============================================================

verifyOtpBtn.addEventListener(
    "click",
    verifyOtp
);


// ============================================================
// PRESS ENTER TO VERIFY OTP
// ============================================================

otpInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            verifyOtp();

        }

    }
);


// ============================================================
// VERIFY OTP
// ============================================================

async function verifyOtp() {

    const otp =
        otpInput
            .value
            .trim();


    otpMessage.textContent =
        "";


    otpMessage.className =
        "message";


    if (
        otp.length !== 6
    ) {

        showOtpError(
            "Enter the complete 6-digit OTP."
        );

        return;

    }


    if (
        !pendingEmail
    ) {

        showOtpError(
            "Registration session not found. Please register again."
        );

        return;

    }


    try {

        verifyOtpBtn.disabled =
            true;


        verifyOtpBtn.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Verifying...
        `;


        const formData =
            new FormData();


        formData.append(
            "email",
            pendingEmail
        );


        formData.append(
            "otp",
            otp
        );


        const response =
            await fetch(
                `${API_URL}/verify-otp`,
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await readJsonResponse(
                response
            );


        if (
            !response.ok
        ) {

            throw new Error(
                data.detail ||
                "OTP verification failed."
            );

        }


        otpMessage.className =
            "message success";


        otpMessage.textContent =
            "Email verified! Account created successfully.";


        const verifiedEmail =
            pendingEmail;


        pendingEmail =
            null;


        setTimeout(
            () => {

                showLoginAfterVerification(
                    verifiedEmail
                );

            },
            1200
        );


    } catch (error) {

        showOtpError(
            error.message ||
            "OTP verification failed."
        );


    } finally {

        verifyOtpBtn.disabled =
            false;


        verifyOtpBtn.textContent =
            "Verify Email";

    }

}


// ============================================================
// RESEND OTP
// ============================================================

resendOtpBtn.addEventListener(
    "click",
    resendOtp
);


async function resendOtp() {

    if (
        !pendingEmail
    ) {

        showOtpError(
            "Registration session not found. Please register again."
        );

        return;

    }


    try {

        resendOtpBtn.disabled =
            true;


        resendOtpBtn.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Sending...
        `;


        const formData =
            new FormData();


        formData.append(
            "email",
            pendingEmail
        );


        const response =
            await fetch(
                `${API_URL}/resend-otp`,
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await readJsonResponse(
                response
            );


        if (
            !response.ok
        ) {

            throw new Error(
                data.detail ||
                "Unable to resend OTP."
            );

        }


        otpMessage.className =
            "message success";


        otpMessage.innerHTML = `
            New OTP sent successfully.<br>
            Please check your Inbox.
            If it is not there,
            check your <strong>Spam or Junk folder</strong>.
        `;


        otpInput.value =
            "";


        otpInput.focus();


    } catch (error) {

        showOtpError(
            error.message ||
            "Unable to resend OTP."
        );


    } finally {

        resendOtpBtn.disabled =
            false;


        resendOtpBtn.textContent =
            "Resend OTP";

    }

}


// ============================================================
// BACK FROM OTP
// ============================================================

backBtn.addEventListener(
    "click",
    () => {

        pendingEmail =
            null;


        otpSection.style.display =
            "none";


        authSection.style.display =
            "block";


        otpInput.value =
            "";


        otpMessage.textContent =
            "";


        clearMessage();

    }
);


// ============================================================
// LOGIN USER
// ============================================================

async function loginUser(
    email,
    password
) {

    try {

        submitBtn.disabled =
            true;


        submitBtn.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Logging in...
        `;


        const formData =
            new FormData();


        formData.append(
            "email",
            email
        );


        formData.append(
            "password",
            password
        );


        const response =
            await fetch(
                `${API_URL}/login`,
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await readJsonResponse(
                response
            );


        if (
            !response.ok
        ) {

            throw new Error(
                data.detail ||
                "Login failed."
            );

        }


        // TOKEN

        const token =
            data.access_token ||
            data.token;


        if (!token) {

            throw new Error(
                "Login succeeded but no authentication token was returned."
            );

        }


        localStorage.setItem(
            "cloudvault_token",
            token
        );


        // USER INFORMATION

        const userData =
            data.user || {
                email: email
            };


        localStorage.setItem(
            "cloudvault_user",
            JSON.stringify(
                userData
            )
        );


        message.className =
            "message success";


        message.textContent =
            "Login successful! Opening CloudVault...";


        setTimeout(
            () => {

                window.location.href =
                    "index.html";

            },
            700
        );


    } catch (error) {

        showError(
            error.message ||
            "Unable to login."
        );


    } finally {

        submitBtn.disabled =
            false;


        submitBtn.textContent =
            mode === "register"
                ? "Create Account"
                : "Login";

    }

}


// ============================================================
// SHOW LOGIN AFTER EMAIL VERIFICATION
// ============================================================

function showLoginAfterVerification(
    email
) {

    otpSection.style.display =
        "none";


    authSection.style.display =
        "block";


    mode =
        "login";


    loginTab
        .classList
        .add("active");


    registerTab
        .classList
        .remove("active");


    nameGroup.style.display =
        "none";


    formTitle.textContent =
        "Welcome Back";


    formSubtitle.textContent =
        "Your email is verified. Login to continue.";


    submitBtn.textContent =
        "Login";


    emailInput.value =
        email;


    passwordInput.value =
        "";


    passwordInput.setAttribute(
        "autocomplete",
        "current-password"
    );


    message.className =
        "message success";


    message.textContent =
        "Account created successfully. Please login.";


    setTimeout(
        () => {

            passwordInput.focus();

        },
        100
    );

}


// ============================================================
// SAFE JSON RESPONSE
// ============================================================

async function readJsonResponse(
    response
) {

    try {

        return await response.json();

    } catch (error) {

        return {
            detail:
                response.ok
                    ? ""
                    : `Server error (${response.status})`
        };

    }

}


// ============================================================
// ERROR MESSAGE
// ============================================================

function showError(
    text
) {

    message.className =
        "message error";


    message.textContent =
        text;

}


// ============================================================
// OTP ERROR
// ============================================================

function showOtpError(
    text
) {

    otpMessage.className =
        "message error";


    otpMessage.textContent =
        text;

}


// ============================================================
// CLEAR MESSAGE
// ============================================================

function clearMessage() {

    message.className =
        "message";


    message.textContent =
        "";

}