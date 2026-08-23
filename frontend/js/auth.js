// ============================================================
// CLOUDVAULT AUTH.JS
// Login + Registration + Email OTP Verification
// ============================================================


const API_URL =
    "http://127.0.0.1:8000";


let mode =
    "login";


let pendingEmail =
    null;


// ============================================================
// ELEMENTS
// ============================================================

const loginTab =
    document.getElementById(
        "loginTab"
    );


const registerTab =
    document.getElementById(
        "registerTab"
    );


const authForm =
    document.getElementById(
        "authForm"
    );


const nameGroup =
    document.getElementById(
        "nameGroup"
    );


const nameInput =
    document.getElementById(
        "name"
    );


const emailInput =
    document.getElementById(
        "email"
    );


const passwordInput =
    document.getElementById(
        "password"
    );


const formTitle =
    document.getElementById(
        "formTitle"
    );


const formSubtitle =
    document.getElementById(
        "formSubtitle"
    );


const submitBtn =
    document.getElementById(
        "submitBtn"
    );


const message =
    document.getElementById(
        "message"
    );


const authSection =
    document.getElementById(
        "authSection"
    );


const otpSection =
    document.getElementById(
        "otpSection"
    );


const otpInput =
    document.getElementById(
        "otpInput"
    );


const otpEmailText =
    document.getElementById(
        "otpEmailText"
    );


const verifyOtpBtn =
    document.getElementById(
        "verifyOtpBtn"
    );


const resendOtpBtn =
    document.getElementById(
        "resendOtpBtn"
    );


const otpMessage =
    document.getElementById(
        "otpMessage"
    );


const backBtn =
    document.getElementById(
        "backBtn"
    );


// ============================================================
// IF ALREADY LOGGED IN
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

        mode =
            "login";


        loginTab
            .classList
            .add(
                "active"
            );


        registerTab
            .classList
            .remove(
                "active"
            );


        nameGroup.style.display =
            "none";


        formTitle.textContent =
            "Welcome Back";


        formSubtitle.textContent =
            "Login to your CloudVault account.";


        submitBtn.textContent =
            "Login";


        clearMessage();

    }
);


// ============================================================
// REGISTER TAB
// ============================================================

registerTab.addEventListener(
    "click",
    () => {

        mode =
            "register";


        registerTab
            .classList
            .add(
                "active"
            );


        loginTab
            .classList
            .remove(
                "active"
            );


        nameGroup.style.display =
            "block";


        formTitle.textContent =
            "Create Account";


        formSubtitle.textContent =
            "Create your CloudVault account and verify your email.";


        submitBtn.textContent =
            "Create Account";


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
                .trim();


        const password =
            passwordInput
                .value;


        if (
            !email
        ) {

            showError(
                "Please enter your email."
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


        if (
            mode ===
            "register"
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


        } else {

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
                    method:
                        "POST",

                    body:
                        formData
                }
            );


        const data =
            await response.json();


        if (
            !response.ok
        ) {

            throw new Error(
                data.detail ||
                "Registration failed"
            );

        }


        pendingEmail =
            data.email ||
            email.toLowerCase();


        showOtpScreen();


    } catch (
        error
    ) {

        showError(
            error.message
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


    otpMessage.textContent =
        "";


    otpMessage.className =
        "message";


    setTimeout(
        () => {

            otpInput.focus();

        },
        100
    );

}


// ============================================================
// VERIFY OTP
// ============================================================

verifyOtpBtn.addEventListener(
    "click",
    verifyOtp
);


otpInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Enter"
        ) {

            verifyOtp();

        }

    }
);


// Allow numbers only

otpInput.addEventListener(
    "input",
    () => {

        otpInput.value =
            otpInput.value
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
                    method:
                        "POST",

                    body:
                        formData
                }
            );


        const data =
            await response.json();


        if (
            !response.ok
        ) {

            throw new Error(
                data.detail ||
                "OTP verification failed"
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


    } catch (
        error
    ) {

        showOtpError(
            error.message
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
    async () => {

        if (
            !pendingEmail
        ) {

            showOtpError(
                "Registration session not found."
            );

            return;

        }


        try {

            resendOtpBtn.disabled =
                true;


            resendOtpBtn.textContent =
                "Sending...";


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
                        method:
                            "POST",

                        body:
                            formData
                    }
                );


            const data =
                await response.json();


            if (
                !response.ok
            ) {

                throw new Error(
                    data.detail ||
                    "Could not resend OTP"
                );

            }


            otpMessage.className =
                "message success";


            otpMessage.textContent =
                "New OTP sent successfully.";


        } catch (
            error
        ) {

            showOtpError(
                error.message
            );


        } finally {

            resendOtpBtn.disabled =
                false;


            resendOtpBtn.textContent =
                "Resend OTP";

        }

    }
);


// ============================================================
// BACK FROM OTP
// ============================================================

backBtn.addEventListener(
    "click",
    () => {

        otpSection.style.display =
            "none";


        authSection.style.display =
            "block";


        registerTab.click();

    }
);


// ============================================================
// AFTER OTP SUCCESS
// ============================================================

function showLoginAfterVerification(
    email
) {

    otpSection.style.display =
        "none";


    authSection.style.display =
        "block";


    loginTab.click();


    emailInput.value =
        email;


    passwordInput.value =
        "";


    message.className =
        "message success";


    message.textContent =
        "Account verified. Login with your password.";


    passwordInput.focus();

}


// ============================================================
// LOGIN
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
                    method:
                        "POST",

                    body:
                        formData
                }
            );


        const data =
            await response.json();


        if (
            !response.ok
        ) {

            throw new Error(
                data.detail ||
                "Login failed"
            );

        }


        localStorage.setItem(
            "cloudvault_token",
            data.access_token
        );


        localStorage.setItem(
            "cloudvault_user",
            JSON.stringify(
                data.user
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
            600
        );


    } catch (
        error
    ) {

        showError(
            error.message
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
// ERROR HELPERS
// ============================================================

function showError(
    text
) {

    message.className =
        "message error";


    message.textContent =
        text;

}


function showOtpError(
    text
) {

    otpMessage.className =
        "message error";


    otpMessage.textContent =
        text;

}


function clearMessage() {

    message.className =
        "message";


    message.textContent =
        "";

}