// ============================================================
// CLOUDVAULT APP.JS
// Azure Blob Storage + JWT + Activity Logs
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

const API_URL = "https://cloud-valet.onrender.com";

const TOKEN = localStorage.getItem(
    "cloudvault_token"
);

let CURRENT_USER = null;

try {

    CURRENT_USER = JSON.parse(
        localStorage.getItem(
            "cloudvault_user"
        )
    );

} catch {

    CURRENT_USER = null;

}


// ============================================================
// LOGIN PROTECTION
// ============================================================

if (!TOKEN || !CURRENT_USER) {

    window.location.href =
        "login.html";

}


// ============================================================
// SELECTORS
// ============================================================

const $ = selector =>
    document.querySelector(selector);

const $$ = selector =>
    document.querySelectorAll(selector);


// ============================================================
// GLOBAL VARIABLES
// ============================================================

let currentPage = "drive";

let currentFileId = null;

let files = [];

let folders = [];

let vaultFiles = [];


// ============================================================
// API REQUEST
// ============================================================

async function apiRequest(
    endpoint,
    options = {}
) {

    const headers = {

        ...(options.headers || {}),

        Authorization:
            `Bearer ${TOKEN}`

    };


    const response = await fetch(
        API_URL + endpoint,
        {
            ...options,
            headers
        }
    );


    if (!response.ok) {

        let message =
            `Server error ${response.status}`;


        try {

            const data =
                await response.json();

            message =
                data.detail ||
                message;

        } catch {}


        if (
            response.status === 401
        ) {

            localStorage.removeItem(
                "cloudvault_token"
            );

            localStorage.removeItem(
                "cloudvault_user"
            );


            toast(
                "Your session expired. Redirecting to login..."
            );

            setTimeout(() => {

                window.location.href =
                    "login.html";

            }, 900);

        }


        throw new Error(
            message
        );

    }


    const contentType =
        response.headers.get(
            "content-type"
        );


    if (
        contentType &&
        contentType.includes(
            "application/json"
        )
    ) {

        return await response.json();

    }


    return response;

}


// ============================================================
// HTML SAFETY
// ============================================================

function escapeHTML(text) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        text || "";

    return div.innerHTML;

}


// ============================================================
// FORMAT SIZE
// ============================================================

function formatSize(bytes) {

    bytes = Number(
        bytes || 0
    );


    if (bytes === 0) {

        return "0 KB";

    }


    const units = [
        "Bytes",
        "KB",
        "MB",
        "GB",
        "TB"
    ];


    const index =
        Math.min(

            Math.floor(
                Math.log(bytes) /
                Math.log(1024)
            ),

            units.length - 1

        );


    const value =
        bytes /
        Math.pow(
            1024,
            index
        );


    return (
        value.toFixed(
            index === 0
                ? 0
                : 1
        )
        +
        " "
        +
        units[index]
    );

}


// ============================================================
// FILE ICON
// ============================================================

function getFileType(filename) {

    const extension =
        filename
            .split(".")
            .pop()
            .toLowerCase();


    if (extension === "pdf") {

        return {
            className: "pdf",
            icon: "fa-solid fa-file-pdf"
        };

    }


    if (
        ["doc", "docx"]
            .includes(extension)
    ) {

        return {
            className: "word",
            icon: "fa-solid fa-file-word"
        };

    }


    if (
        ["xls", "xlsx", "csv"]
            .includes(extension)
    ) {

        return {
            className: "excel",
            icon: "fa-solid fa-file-excel"
        };

    }


    if (
        [
            "jpg",
            "jpeg",
            "png",
            "gif",
            "webp"
        ].includes(extension)
    ) {

        return {
            className: "image",
            icon: "fa-solid fa-image"
        };

    }


    if (
        ["mp4", "webm", "mov"]
            .includes(extension)
    ) {

        return {
            className: "video",
            icon: "fa-solid fa-file-video"
        };

    }


    return {
        className: "generic",
        icon: "fa-solid fa-file"
    };

}


// ============================================================
// TOAST
// ============================================================

function toast(message) {

    const box =
        $("#toast");

    const text =
        $("#toastText");


    if (!box || !text) {

        console.log(message);

        return;

    }


    text.textContent =
        message;


    box.classList.add(
        "show"
    );


    clearTimeout(
        window.cloudVaultToast
    );


    window.cloudVaultToast =
        setTimeout(
            () => {

                box.classList.remove(
                    "show"
                );

            },
            2500
        );

}


// ============================================================
// MODALS
// ============================================================

function openOverlay(id) {

    document
        .getElementById(id)
        ?.classList
        .add("show");

}


function closeOverlay(id) {

    document
        .getElementById(id)
        ?.classList
        .remove("show");

}


// ============================================================
// PROFESSIONAL DIALOG SYSTEM
// Replaces alert(), prompt() and confirm()
// ============================================================

function setupProfessionalDialogs() {

    if (
        document.getElementById(
            "cvDialogStyles"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "cvDialogStyles";


    style.textContent = `

        .cv-dialog-backdrop {

            position: fixed;

            inset: 0;

            z-index: 99999;

            display: flex;

            align-items: center;

            justify-content: center;

            padding: 20px;

            background:
                rgba(
                    15,
                    23,
                    42,
                    0.48
                );

            backdrop-filter:
                blur(6px);

            opacity: 0;

            visibility: hidden;

            transition:
                opacity .18s ease,
                visibility .18s ease;
        }


        .cv-dialog-backdrop.show {

            opacity: 1;

            visibility: visible;
        }


        .cv-dialog {

            width:
                min(
                    440px,
                    100%
                );

            background:
                #ffffff;

            border:
                1px solid
                rgba(
                    148,
                    163,
                    184,
                    0.22
                );

            border-radius:
                20px;

            box-shadow:
                0 28px 80px
                rgba(
                    15,
                    23,
                    42,
                    0.22
                );

            transform:
                translateY(12px)
                scale(.98);

            transition:
                transform .18s ease;

            overflow:
                hidden;
        }


        .cv-dialog-backdrop.show
        .cv-dialog {

            transform:
                translateY(0)
                scale(1);
        }


        .cv-dialog-head {

            display: flex;

            gap: 14px;

            align-items:
                flex-start;

            padding:
                24px
                24px
                12px;
        }


        .cv-dialog-icon {

            width: 46px;

            height: 46px;

            flex:
                0 0 46px;

            border-radius:
                14px;

            display: flex;

            align-items: center;

            justify-content:
                center;

            font-size:
                20px;

            color:
                #2563eb;

            background:
                #eff6ff;
        }


        .cv-dialog-icon.danger {

            color:
                #dc2626;

            background:
                #fef2f2;
        }


        .cv-dialog-icon.warning {

            color:
                #d97706;

            background:
                #fffbeb;
        }


        .cv-dialog-title {

            margin:
                1px 0 5px;

            font-size:
                19px;

            font-weight:
                750;

            color:
                #0f172a;
        }


        .cv-dialog-message {

            margin: 0;

            color:
                #64748b;

            font-size:
                14px;

            line-height:
                1.55;

            white-space:
                pre-line;
        }


        .cv-dialog-body {

            padding:
                8px
                24px
                4px;
        }


        .cv-dialog-input {

            width:
                100%;

            border:
                1px solid
                #dbe3ef;

            border-radius:
                12px;

            padding:
                13px 14px;

            outline:
                none;

            font-size:
                15px;

            color:
                #0f172a;

            background:
                #fff;

            transition:
                border-color .15s ease,
                box-shadow .15s ease;
        }


        .cv-dialog-input:focus {

            border-color:
                #3b82f6;

            box-shadow:
                0 0 0 4px
                rgba(
                    59,
                    130,
                    246,
                    .10
                );
        }


        .cv-dialog-error {

            min-height:
                18px;

            margin-top:
                8px;

            color:
                #dc2626;

            font-size:
                12px;
        }


        .cv-dialog-actions {

            display:
                flex;

            justify-content:
                flex-end;

            gap:
                10px;

            padding:
                20px
                24px
                24px;
        }


        .cv-dialog-btn {

            border:
                0;

            border-radius:
                11px;

            padding:
                11px
                17px;

            font-size:
                14px;

            font-weight:
                700;

            cursor:
                pointer;

            transition:
                transform .12s ease,
                opacity .12s ease,
                background .12s ease;
        }


        .cv-dialog-btn:hover {

            transform:
                translateY(-1px);
        }


        .cv-dialog-btn.secondary {

            color:
                #334155;

            background:
                #f1f5f9;
        }


        .cv-dialog-btn.primary {

            color:
                #ffffff;

            background:
                linear-gradient(
                    90deg,
                    #2563eb,
                    #4f46e5
                );
        }


        .cv-dialog-btn.danger {

            color:
                #ffffff;

            background:
                #dc2626;
        }


        .cv-choice-grid {

            display:
                grid;

            gap:
                10px;
        }


        .cv-choice {

            width:
                100%;

            display:
                flex;

            align-items:
                center;

            gap:
                12px;

            border:
                1px solid
                #e2e8f0;

            border-radius:
                13px;

            padding:
                13px 14px;

            background:
                #fff;

            color:
                #0f172a;

            cursor:
                pointer;

            text-align:
                left;

            font-weight:
                650;

            transition:
                border-color .15s ease,
                background .15s ease,
                transform .12s ease;
        }


        .cv-choice:hover {

            border-color:
                #bfdbfe;

            background:
                #f8fbff;

            transform:
                translateY(-1px);
        }


        .cv-choice.danger {

            color:
                #dc2626;
        }


        @media (
            max-width: 520px
        ) {

            .cv-dialog-actions {

                flex-direction:
                    column-reverse;
            }


            .cv-dialog-btn {

                width:
                    100%;
            }

        }

    `;


    document.head.appendChild(
        style
    );

}


// ============================================================
// OPEN PROFESSIONAL DIALOG
// ============================================================

function openProfessionalDialog({

    title,

    message = "",

    icon =
        "fa-circle-info",

    tone =
        "normal",

    type =
        "confirm",

    value =
        "",

    placeholder =
        "",

    confirmText =
        "Continue",

    cancelText =
        "Cancel",

    choices = []

}) {

    setupProfessionalDialogs();


    return new Promise(
        resolve => {


            const backdrop =
                document.createElement(
                    "div"
                );


            backdrop.className =
                "cv-dialog-backdrop";


            const iconTone =

                tone ===
                "danger"

                    ? "danger"

                    :
                    tone ===
                    "warning"

                        ? "warning"

                        : "";


            const actionClass =

                tone ===
                "danger"

                    ? "danger"

                    : "primary";


            let bodyHTML =
                "";


            // INPUT DIALOG

            if (
                type ===
                "input"
            ) {

                bodyHTML = `

                    <div class="cv-dialog-body">

                        <input
                            class="cv-dialog-input"
                            type="text"
                            value="${escapeHTML(value)}"
                            placeholder="${escapeHTML(placeholder)}"
                            autocomplete="off"
                        >

                        <div class="cv-dialog-error"></div>

                    </div>

                `;

            }


            // CHOICE DIALOG

            if (
                type ===
                "choice"
            ) {

                bodyHTML = `

                    <div class="cv-dialog-body">

                        <div class="cv-choice-grid">

                            ${
                                choices
                                    .map(
                                        choice => `

                                            <button
                                                type="button"
                                                class="cv-choice ${
                                                    choice.tone ===
                                                    "danger"

                                                        ? "danger"

                                                        : ""
                                                }"
                                                data-choice="${escapeHTML(choice.value)}"
                                            >

                                                <i class="fa-solid ${choice.icon || "fa-circle"}"></i>

                                                <span>
                                                    ${escapeHTML(choice.label)}
                                                </span>

                                            </button>

                                        `
                                    )
                                    .join("")
                            }

                        </div>

                    </div>

                `;

            }


            backdrop.innerHTML = `

                <div
                    class="cv-dialog"
                    role="dialog"
                    aria-modal="true"
                >

                    <div class="cv-dialog-head">

                        <div class="cv-dialog-icon ${iconTone}">

                            <i class="fa-solid ${icon}"></i>

                        </div>


                        <div>

                            <div class="cv-dialog-title">

                                ${escapeHTML(title)}

                            </div>


                            <p class="cv-dialog-message">

                                ${escapeHTML(message)}

                            </p>

                        </div>

                    </div>


                    ${bodyHTML}


                    ${
                        type ===
                        "choice"

                            ? ""

                            : `

                                <div class="cv-dialog-actions">

                                    ${
                                        type ===
                                        "info"

                                            ? ""

                                            : `

                                                <button
                                                    type="button"
                                                    class="cv-dialog-btn secondary"
                                                    data-cancel
                                                >

                                                    ${escapeHTML(cancelText)}

                                                </button>

                                            `
                                    }


                                    <button
                                        type="button"
                                        class="cv-dialog-btn ${actionClass}"
                                        data-confirm
                                    >

                                        ${escapeHTML(confirmText)}

                                    </button>

                                </div>

                            `
                    }

                </div>

            `;


            document.body.appendChild(
                backdrop
            );


            requestAnimationFrame(
                () => {

                    backdrop.classList.add(
                        "show"
                    );

                }
            );


            const cleanup =
                valueToResolve => {

                    backdrop.classList.remove(
                        "show"
                    );


                    setTimeout(
                        () => {

                            backdrop.remove();

                            resolve(
                                valueToResolve
                            );

                        },
                        160
                    );

                };


            // CLICK OUTSIDE

            backdrop.addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        backdrop
                    ) {

                        cleanup(
                            type ===
                            "input"

                                ? null

                                : false
                        );

                    }

                }
            );


            // CANCEL

            const cancelButton =
                backdrop.querySelector(
                    "[data-cancel]"
                );


            cancelButton
                ?.addEventListener(
                    "click",
                    () => {

                        cleanup(
                            type ===
                            "input"

                                ? null

                                : false
                        );

                    }
                );


            // CONFIRM

            const confirmButton =
                backdrop.querySelector(
                    "[data-confirm]"
                );


            confirmButton
                ?.addEventListener(
                    "click",
                    () => {


                        if (
                            type ===
                            "input"
                        ) {

                            const input =
                                backdrop.querySelector(
                                    ".cv-dialog-input"
                                );


                            const error =
                                backdrop.querySelector(
                                    ".cv-dialog-error"
                                );


                            const inputValue =
                                input
                                    .value
                                    .trim();


                            if (
                                !inputValue
                            ) {

                                error.textContent =
                                    "This field cannot be empty.";


                                input.focus();


                                return;

                            }


                            cleanup(
                                inputValue
                            );


                            return;

                        }


                        cleanup(
                            true
                        );

                    }
                );


            // CHOICES

            backdrop
                .querySelectorAll(
                    "[data-choice]"
                )
                .forEach(
                    button => {

                        button.addEventListener(
                            "click",
                            () => {

                                cleanup(
                                    button.dataset.choice
                                );

                            }
                        );

                    }
                );


            // INPUT KEYBOARD

            const input =
                backdrop.querySelector(
                    ".cv-dialog-input"
                );


            if (input) {

                setTimeout(
                    () => {

                        input.focus();

                        input.select();

                    },
                    80
                );


                input.addEventListener(
                    "keydown",
                    event => {


                        if (
                            event.key ===
                            "Enter"
                        ) {

                            confirmButton
                                ?.click();

                        }


                        if (
                            event.key ===
                            "Escape"
                        ) {

                            cancelButton
                                ?.click();

                        }

                    }
                );

            }

        }
    );

}


// ============================================================
// PROFESSIONAL CONFIRM
// ============================================================

function professionalConfirm(

    title,

    message,

    {

        confirmText =
            "Confirm",

        cancelText =
            "Cancel",

        tone =
            "normal",

        icon =
            "fa-circle-question"

    } = {}

) {

    return openProfessionalDialog({

        title,

        message,

        type:
            "confirm",

        confirmText,

        cancelText,

        tone,

        icon

    });

}


// ============================================================
// PROFESSIONAL PROMPT
// ============================================================

function professionalPrompt(

    title,

    message,

    value = "",

    {

        placeholder =
            "",

        confirmText =
            "Save",

        icon =
            "fa-pen"

    } = {}

) {

    return openProfessionalDialog({

        title,

        message,

        type:
            "input",

        value,

        placeholder,

        confirmText,

        icon

    });

}


// ============================================================
// PROFESSIONAL CHOICE
// ============================================================

function professionalChoice(

    title,

    message,

    choices

) {

    return openProfessionalDialog({

        title,

        message,

        type:
            "choice",

        icon:
            "fa-ellipsis",

        choices

    });

}


// ============================================================
// PROFESSIONAL INFO
// ============================================================

function professionalInfo(

    title,

    message,

    {

        confirmText =
            "OK",

        tone =
            "normal",

        icon =
            "fa-circle-info"

    } = {}

) {

    return openProfessionalDialog({

        title,

        message,

        type:
            "info",

        confirmText,

        tone,

        icon

    });

}
// ============================================================
// PROFILE
// ============================================================

function loadProfile() {

    if (!CURRENT_USER) {
        return;
    }

    const name =
        $(".profile-text strong");

    const email =
        $(".profile-text span");

    const avatar =
        $(".profile-image");


    if (name) {
        name.textContent =
            CURRENT_USER.name;
    }


    if (email) {
        email.textContent =
            CURRENT_USER.email;
    }


    if (avatar) {

        avatar.textContent =
            CURRENT_USER.name
                .charAt(0)
                .toUpperCase();

    }

}


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "CloudVault started"
        );

        setupProfessionalDialogs();

        loadProfile();

        await testBackend();

        setupUploadInput();

        setupFolderUpload();

        await loadFolders();

        await loadFiles();

        await loadStorage();

    }
);


// ============================================================
// BACKEND TEST
// ============================================================

async function testBackend() {

    try {

        const data =
            await apiRequest("/");


        console.log(
            "BACKEND CONNECTED:",
            data
        );


        console.log(
            "Storage:",
            data.storage
        );


    } catch (error) {

        console.error(
            "BACKEND ERROR:",
            error
        );

    }

}


// ============================================================
// NEW MENU
// ============================================================

$("#newBtn")
    ?.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            $("#newMenu")
                ?.classList
                .toggle("show");

        }
    );


$("#newMenu")
    ?.addEventListener(
        "click",
        async event => {

            event.stopPropagation();


            const button =
                event.target.closest(
                    "[data-new]"
                );


            if (!button) {
                return;
            }


            const action =
                button.dataset.new;


            $("#newMenu")
                .classList
                .remove("show");


            if (action === "file") {

                $("#fileInput")
                    ?.click();

            }


            if (action === "folder") {

                await createFolder();

            }


            if (
                action ===
                "folderUpload"
            ) {

                $("#folderInput")
                    ?.click();

            }

        }
    );


// ============================================================
// UPLOAD INPUT SETUP
// ============================================================

function setupUploadInput() {

    const input =
        $("#fileInput");


    if (!input) {

        console.error(
            "fileInput not found"
        );

        return;

    }


    console.log(
        "Azure upload handler ready"
    );


    input.onchange =
        async event => {

            const selectedFiles =
                Array.from(
                    event.target.files
                );


            if (
                selectedFiles.length ===
                0
            ) {

                return;

            }


            let successfulUploads = 0;


            for (
                const file
                of selectedFiles
            ) {

                const result =
                    await uploadFileToAzure(
                        file
                    );


                if (result) {

                    successfulUploads++;

                }

            }


            event.target.value =
                "";


            await loadFiles();

            await loadStorage();


            if (
                successfulUploads > 0
            ) {

                toast(
                    successfulUploads === 1
                        ? "File uploaded successfully"
                        : `${successfulUploads} files uploaded successfully`
                );

            }

        };

}


// ============================================================
// AZURE FILE UPLOAD
// ============================================================

async function uploadFileToAzure(
    file
) {

    try {

        console.log(
            "Uploading to Azure:",
            file.name
        );


        toast(
            `Uploading ${file.name}...`
        );


        const formData =
            new FormData();


        formData.append(
            "file",
            file
        );


        const response =
            await fetch(
                `${API_URL}/upload`,
                {
                    method:
                        "POST",

                    headers: {
                        Authorization:
                            `Bearer ${TOKEN}`
                    },

                    body:
                        formData
                }
            );


        let data = {};


        try {

            data =
                await response.json();

        } catch {}


        console.log(
            "UPLOAD RESPONSE:",
            data
        );


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Upload failed"
            );

        }


        return data;


    } catch (error) {

        console.error(
            "AZURE UPLOAD ERROR:",
            error
        );


        await professionalInfo(

            "Upload Failed",

            `${file.name} could not be uploaded.\n\n${error.message}`,

            {
                confirmText:
                    "Close",

                tone:
                    "danger",

                icon:
                    "fa-cloud-arrow-up"
            }

        );


        return null;

    }

}


// ============================================================
// FOLDER UPLOAD
// ============================================================

function setupFolderUpload() {

    const input =
        $("#folderInput");


    if (!input) {
        return;
    }


    input.onchange =
        async event => {

            const selectedFiles =
                Array.from(
                    event.target.files
                );


            if (!selectedFiles.length) {
                return;
            }


            let folderName =
                "Uploaded Folder";


            const relativePath =
                selectedFiles[0]
                    .webkitRelativePath;


            if (relativePath) {

                folderName =
                    relativePath
                        .split("/")[0];

            }


            await createFolderWithName(
                folderName
            );


            let uploadedCount = 0;


            for (
                const file
                of selectedFiles
            ) {

                const result =
                    await uploadFileToAzure(
                        file
                    );


                if (result) {
                    uploadedCount++;
                }

            }


            event.target.value =
                "";


            await loadFolders();

            await loadFiles();

            await loadStorage();


            toast(
                `${folderName} uploaded • ${uploadedCount} file${
                    uploadedCount === 1
                        ? ""
                        : "s"
                }`
            );

        };

}


// ============================================================
// LOAD FILES
// ============================================================

async function loadFiles() {

    try {

        let endpoint =
            "/files";


        if (
            currentPage ===
            "starred"
        ) {

            endpoint =
                "/starred";

        }


        if (
            currentPage ===
            "shared"
        ) {

            endpoint =
                "/shared";

        }


        if (
            currentPage ===
            "trash"
        ) {

            endpoint =
                "/trash";

        }


        files =
            await apiRequest(
                endpoint
            );


        if (!Array.isArray(files)) {

            files = [];

        }


        if (
            currentPage ===
            "recent"
        ) {

            files.sort(
                (a, b) =>
                    Number(b.id) -
                    Number(a.id)
            );

        }


        renderFiles();


    } catch (error) {

        console.error(
            "LOAD FILE ERROR:",
            error
        );


        files = [];

        renderFiles();

    }

}


// ============================================================
// RENDER FILES
// ============================================================

function renderFiles() {

    const container =
        $("#fileRows");


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    const heading =
        $("#filesHeading");


    if (heading) {

        heading.textContent =
            currentPage === "trash"
                ? "Trash"
                : currentPage === "starred"
                    ? "Starred Files"
                    : currentPage === "shared"
                        ? "Shared Files"
                        : currentPage === "recent"
                            ? "Recent Files"
                            : "Files";

    }


    let displayFiles =
        [...files];


    const search =
        $("#searchInput")
            ?.value
            .trim()
            .toLowerCase()
        ||
        "";


    if (search) {

        displayFiles =
            displayFiles.filter(
                file =>
                    String(
                        file.name || ""
                    )
                        .toLowerCase()
                        .includes(search)
            );

    }


    const resultCount =
        $("#resultCount");


    if (resultCount) {

        resultCount.textContent =
            `${displayFiles.length} item${
                displayFiles.length === 1
                    ? ""
                    : "s"
            }`;

    }


    const emptyState =
        $("#emptyState");


    if (emptyState) {

        emptyState.classList.toggle(
            "show",
            displayFiles.length === 0
        );

    }


    const filesTable =
        $("#filesTable");


    if (filesTable) {

        filesTable.style.display =
            displayFiles.length
                ? "block"
                : "none";

    }


    if (
        displayFiles.length ===
        0
    ) {

        const emptyTitle =
            $("#emptyState h3");

        const emptyText =
            $("#emptyState p");


        if (emptyTitle) {

            if (
                currentPage ===
                "trash"
            ) {

                emptyTitle.textContent =
                    "Trash is empty";

            } else if (
                currentPage ===
                "starred"
            ) {

                emptyTitle.textContent =
                    "No starred files";

            } else if (
                currentPage ===
                "shared"
            ) {

                emptyTitle.textContent =
                    "No shared files";

            } else {

                emptyTitle.textContent =
                    "No files found";

            }

        }


        if (emptyText) {

            if (
                currentPage ===
                "trash"
            ) {

                emptyText.textContent =
                    "Files moved to Trash will appear here.";

            } else if (
                currentPage ===
                "starred"
            ) {

                emptyText.textContent =
                    "Star important files to find them quickly.";

            } else if (
                currentPage ===
                "shared"
            ) {

                emptyText.textContent =
                    "Files shared with you will appear here.";

            } else {

                emptyText.textContent =
                    "Upload files using the New button.";

            }

        }


        return;

    }


    displayFiles.forEach(
        file => {

            const type =
                getFileType(
                    file.name
                );


            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "file-row";


            row.innerHTML = `

                <div class="file-name">

                    <div class="file-icon ${type.className}">

                        <i class="${type.icon}"></i>

                    </div>


                    <span class="actual-file-name">

                        ${escapeHTML(file.name)}

                        ${
                            file.starred
                                ? '<i class="fa-solid fa-star star-indicator"></i>'
                                : ""
                        }

                        ${
                            file.shared
                                ? '<i class="fa-solid fa-user-group shared-indicator"></i>'
                                : ""
                        }

                    </span>

                </div>


                <span>
                    ${escapeHTML(
                        CURRENT_USER.name
                    )}
                </span>


                <span>
                    ${escapeHTML(
                        file.modified_at ||
                        file.uploaded_at ||
                        "Recently"
                    )}
                </span>


                <span>
                    ${formatSize(
                        file.size
                    )}
                </span>


                <button
                    class="more-btn"
                    type="button"
                    aria-label="File actions"
                >

                    <i class="fa-solid fa-ellipsis-vertical"></i>

                </button>

            `;


            if (
                currentPage !==
                "trash"
            ) {

                row.addEventListener(
                    "dblclick",
                    () => {

                        previewFile(
                            file.id
                        );

                    }
                );

            }


            row
                .querySelector(
                    ".more-btn"
                )
                .addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();


                        currentFileId =
                            file.id;


                        if (
                            currentPage ===
                            "trash"
                        ) {

                            showContextMenu(
                                $("#trashMenu"),
                                event.clientX,
                                event.clientY
                            );

                        } else {

                            updateStarMenu(
                                file
                            );


                            showContextMenu(
                                $("#fileMenu"),
                                event.clientX,
                                event.clientY
                            );

                        }

                    }
                );


            container.appendChild(
                row
            );

        }
    );

}


// ============================================================
// SEARCH
// ============================================================

$("#searchInput")
    ?.addEventListener(
        "input",
        () => {

            if (
                currentPage ===
                "activity"
            ) {

                return;

            }


            renderFiles();

        }
    );


// ============================================================
// SIDEBAR NAVIGATION
// ============================================================

$$("[data-page]")
    .forEach(
        button => {

            button.addEventListener(
                "click",
                async () => {

                    currentPage =
                        button.dataset.page;


                    $("#privateVault")
                        ?.classList
                        .remove(
                            "active"
                        );


                    const driveArea =
                        $("#driveArea");


                    if (driveArea) {

                        driveArea.style.display =
                            "block";

                    }


                    $$(".menu-item")
                        .forEach(
                            item => {

                                item.classList.remove(
                                    "active"
                                );

                            }
                        );


                    button.classList.add(
                        "active"
                    );


                    const pages = {

                        drive: {

                            title:
                                "My Drive",

                            description:
                                "Store, manage and share your files securely."

                        },

                        shared: {

                            title:
                                "Shared with me",

                            description:
                                "Your shared cloud files."

                        },

                        recent: {

                            title:
                                "Recent",

                            description:
                                "Recently uploaded and accessed files."

                        },

                        starred: {

                            title:
                                "Starred",

                            description:
                                "Important starred files."

                        },

                        activity: {

                            title:
                                "Activity",

                            description:
                                "Recent actions performed in your CloudVault account."

                        },

                        trash: {

                            title:
                                "Trash",

                            description:
                                "Restore or permanently delete files."

                        }

                    };


                    const page =
                        pages[
                            currentPage
                        ];


                    if (page) {

                        const pageTitle =
                            $("#pageTitle");

                        const pageDescription =
                            $("#pageDescription");


                        if (pageTitle) {

                            pageTitle.textContent =
                                page.title;

                        }


                        if (pageDescription) {

                            pageDescription.textContent =
                                page.description;

                        }

                    }


                    const quickSection =
                        $("#quickSection");

                    const folderSection =
                        $("#folderSection");


                    if (quickSection) {

                        quickSection.style.display =
                            currentPage ===
                            "drive"
                                ? "block"
                                : "none";

                    }


                    if (folderSection) {

                        folderSection.style.display =
                            currentPage ===
                            "drive"
                                ? "block"
                                : "none";

                    }


                    if (
                        currentPage ===
                        "activity"
                    ) {

                        await loadActivity();

                    } else {

                        await loadFiles();

                    }

                }
            );

        }
    );


// ============================================================
// ACTIVITY LOG
// ============================================================

async function loadActivity() {

    try {

        const logs =
            await apiRequest(
                "/activity"
            );


        const container =
            $("#fileRows");


        if (!container) {
            return;
        }


        container.innerHTML =
            "";


        const quickSection =
            $("#quickSection");

        const folderSection =
            $("#folderSection");


        if (quickSection) {

            quickSection.style.display =
                "none";

        }


        if (folderSection) {

            folderSection.style.display =
                "none";

        }


        const filesHeading =
            $("#filesHeading");


        if (filesHeading) {

            filesHeading.textContent =
                "Recent Activity";

        }


        const resultCount =
            $("#resultCount");


        if (resultCount) {

            resultCount.textContent =
                `${logs.length} activit${
                    logs.length === 1
                        ? "y"
                        : "ies"
                }`;

        }


        const emptyState =
            $("#emptyState");


        if (emptyState) {

            emptyState.classList.toggle(
                "show",
                logs.length === 0
            );

        }


        const filesTable =
            $("#filesTable");


        if (filesTable) {

            filesTable.style.display =
                logs.length
                    ? "block"
                    : "none";

        }


        if (
            logs.length ===
            0
        ) {

            const emptyTitle =
                $("#emptyState h3");

            const emptyText =
                $("#emptyState p");


            if (emptyTitle) {

                emptyTitle.textContent =
                    "No activity yet";

            }


            if (emptyText) {

                emptyText.textContent =
                    "Your CloudVault activity will appear here.";

            }


            return;

        }


        logs.forEach(
            log => {

                const row =
                    document.createElement(
                        "div"
                    );


                row.className =
                    "file-row";


                row.innerHTML = `

                    <div class="file-name">

                        <div class="file-icon generic">

                            <i class="fa-solid fa-clock-rotate-left"></i>

                        </div>


                        <span class="actual-file-name">

                            ${escapeHTML(log.action)}

                            ${
                                log.file_name
                                    ? " - " +
                                      escapeHTML(
                                          log.file_name
                                      )
                                    : ""
                            }

                        </span>

                    </div>


                    <span>

                        ${escapeHTML(
                            CURRENT_USER.name
                        )}

                    </span>


                    <span>

                        ${escapeHTML(
                            log.created_at ||
                            "-"
                        )}

                    </span>


                    <span>

                        ${escapeHTML(
                            log.details ||
                            "-"
                        )}

                    </span>


                    <span></span>

                `;


                container.appendChild(
                    row
                );

            }
        );


    } catch (error) {

        console.error(
            "ACTIVITY ERROR:",
            error
        );


        toast(
            "Could not load activity"
        );

    }

}


// ============================================================
// CONTEXT MENU
// ============================================================

function showContextMenu(
    menu,
    x,
    y
) {

    if (!menu) {
        return;
    }


    hideMenus();


    menu.classList.add(
        "show"
    );


    menu.style.left =
        Math.min(
            x,
            window.innerWidth -
            240
        )
        +
        "px";


    menu.style.top =
        Math.min(
            y,
            window.innerHeight -
            360
        )
        +
        "px";

}


function hideMenus() {

    $$(".context-menu")
        .forEach(
            menu => {

                menu.classList.remove(
                    "show"
                );

            }
        );

}


document.addEventListener(
    "click",
    () => {

        $("#newMenu")
            ?.classList
            .remove(
                "show"
            );


        hideMenus();

    }
);


// ============================================================
// STAR MENU
// ============================================================

function updateStarMenu(file) {

    const button =
        $(
            '#fileMenu [data-action="star"]'
        );


    if (!button) {
        return;
    }


    const text =
        button.querySelector(
            "span"
        );


    if (text) {

        text.textContent =
            file.starred
                ? "Remove from Starred"
                : "Add to Starred";

    }

}
// ============================================================
// FILE ACTIONS
// ============================================================

$("#fileMenu")
    ?.addEventListener(
        "click",
        async event => {

            event.stopPropagation();

            const button =
                event.target.closest(
                    "[data-action]"
                );

            if (!button) {
                return;
            }

            const action =
                button.dataset.action;

            hideMenus();


            if (
                action ===
                "preview"
            ) {

                previewFile(
                    currentFileId
                );

            }


            if (
                action ===
                "download"
            ) {

                downloadFile(
                    currentFileId
                );

            }


            if (
                action ===
                "rename"
            ) {

                await renameFile(
                    currentFileId
                );

            }


            if (
                action ===
                "star"
            ) {

                await starFile(
                    currentFileId
                );

            }


            if (
                action ===
                "trash"
            ) {

                await moveToTrash(
                    currentFileId
                );

            }


            if (
                action ===
                "vault"
            ) {

                await moveToVault(
                    currentFileId
                );

            }


            if (
                action ===
                "share"
            ) {

                openShare(
                    currentFileId
                );

            }

        }
    );


// ============================================================
// PREVIEW
// ============================================================

function previewFile(
    fileId
) {

    const file =
        files.find(
            item =>
                Number(item.id) ===
                Number(fileId)
        );


    if (!file) {

        toast(
            "File not found"
        );

        return;

    }


    const area =
        $("#previewArea");


    if (!area) {
        return;
    }


    const previewName =
        $("#previewName");

    const previewInfo =
        $("#previewInfo");


    if (previewName) {

        previewName.textContent =
            file.name;

    }


    if (previewInfo) {

        previewInfo.textContent =
            `${formatSize(file.size)} • Microsoft Azure`;

    }


    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();


    const previewURL =
        `${API_URL}/preview/${fileId}`;


    if (
        [
            "jpg",
            "jpeg",
            "png",
            "gif",
            "webp"
        ].includes(
            extension
        )
    ) {

        area.innerHTML = `

            <img
                src="${previewURL}"
                alt="${escapeHTML(file.name)}"
            >

        `;

    } else if (
        extension ===
        "pdf"
    ) {

        area.innerHTML = `

            <iframe
                src="${previewURL}"
            ></iframe>

        `;

    } else {

        const type =
            getFileType(
                file.name
            );


        area.innerHTML = `

            <div class="preview-placeholder">

                <i class="${type.icon}"></i>

                <h3>
                    ${escapeHTML(file.name)}
                </h3>

                <p>
                    ${formatSize(file.size)}
                </p>

                <p>
                    Preview is not available for this file type.
                </p>

            </div>

        `;

    }


    openOverlay(
        "previewOverlay"
    );

}


// ============================================================
// DOWNLOAD
// ============================================================

function downloadFile(
    fileId
) {

    toast(
        "Preparing download..."
    );


    window.open(
        `${API_URL}/download/${fileId}`,
        "_blank"
    );

}


// ============================================================
// RENAME FILE - PROFESSIONAL MODAL
// ============================================================

async function renameFile(
    fileId
) {

    const file =
        files.find(
            item =>
                Number(item.id) ===
                Number(fileId)
        );


    if (!file) {

        toast(
            "File not found"
        );

        return;

    }


    const newName =
        await professionalPrompt(

            "Rename File",

            "Enter a new name for this file.",

            file.name,

            {
                placeholder:
                    "File name",

                confirmText:
                    "Rename",

                icon:
                    "fa-pen"
            }

        );


    if (!newName) {
        return;
    }


    if (
        newName ===
        file.name
    ) {

        toast(
            "File name unchanged"
        );

        return;

    }


    try {

        await apiRequest(

            `/rename/${fileId}?new_name=${encodeURIComponent(newName)}`,

            {
                method:
                    "PUT"
            }

        );


        toast(
            "File renamed successfully"
        );


        await loadFiles();


        if (
            currentPage ===
            "activity"
        ) {

            await loadActivity();

        }


    } catch (error) {

        await professionalInfo(

            "Rename Failed",

            error.message,

            {
                tone:
                    "danger",

                icon:
                    "fa-triangle-exclamation"
            }

        );

    }

}


// ============================================================
// STAR / UNSTAR
// ============================================================

async function starFile(
    fileId
) {

    try {

        const data =
            await apiRequest(
                `/star/${fileId}`,
                {
                    method:
                        "PUT"
                }
            );


        toast(
            data.starred
                ? "Added to Starred"
                : "Removed from Starred"
        );


        await loadFiles();


    } catch (error) {

        await professionalInfo(

            "Unable to Update File",

            error.message,

            {
                tone:
                    "danger",

                icon:
                    "fa-star"
            }

        );

    }

}


// ============================================================
// MOVE FILE TO TRASH - PROFESSIONAL CONFIRMATION
// ============================================================

async function moveToTrash(
    fileId
) {

    const file =
        files.find(
            item =>
                Number(item.id) ===
                Number(fileId)
        );


    if (!file) {

        toast(
            "File not found"
        );

        return;

    }


    const confirmed =
        await professionalConfirm(

            "Move to Trash?",

            `"${file.name}" will be moved to Trash. You can restore it later.`,

            {
                confirmText:
                    "Move to Trash",

                cancelText:
                    "Cancel",

                tone:
                    "warning",

                icon:
                    "fa-trash"
            }

        );


    if (!confirmed) {
        return;
    }


    try {

        await apiRequest(
            `/trash/${fileId}`,
            {
                method:
                    "PUT"
            }
        );


        toast(
            "File moved to Trash"
        );


        await loadFiles();

        await loadStorage();


    } catch (error) {

        await professionalInfo(

            "Unable to Move File",

            error.message,

            {
                tone:
                    "danger",

                icon:
                    "fa-triangle-exclamation"
            }

        );

    }

}


// ============================================================
// TRASH ACTIONS
// ============================================================

$("#trashMenu")
    ?.addEventListener(
        "click",
        async event => {

            event.stopPropagation();


            const button =
                event.target.closest(
                    "[data-trash-action]"
                );


            if (!button) {
                return;
            }


            hideMenus();


            if (
                button.dataset
                    .trashAction ===
                "restore"
            ) {

                await restoreFile(
                    currentFileId
                );

            }


            if (
                button.dataset
                    .trashAction ===
                "delete"
            ) {

                await deleteForever(
                    currentFileId
                );

            }

        }
    );


// ============================================================
// RESTORE FILE
// ============================================================

async function restoreFile(
    fileId
) {

    try {

        await apiRequest(
            `/restore/${fileId}`,
            {
                method:
                    "PUT"
            }
        );


        toast(
            "File restored successfully"
        );


        await loadFiles();

        await loadStorage();


    } catch (error) {

        await professionalInfo(

            "Restore Failed",

            error.message,

            {
                tone:
                    "danger",

                icon:
                    "fa-trash-arrow-up"
            }

        );

    }

}


// ============================================================
// DELETE PERMANENTLY - PROFESSIONAL CONFIRMATION
// ============================================================

async function deleteForever(
    fileId
) {

    const file =
        files.find(
            item =>
                Number(item.id) ===
                Number(fileId)
        );


    const fileName =
        file
            ? file.name
            : "this file";


    const confirmed =
        await professionalConfirm(

            "Delete Permanently?",

            `"${fileName}" will be permanently deleted from Microsoft Azure.\n\nThis action cannot be undone.`,

            {
                confirmText:
                    "Delete Forever",

                cancelText:
                    "Cancel",

                tone:
                    "danger",

                icon:
                    "fa-trash-can"
            }

        );


    if (!confirmed) {
        return;
    }


    try {

        await apiRequest(
            `/files/${fileId}`,
            {
                method:
                    "DELETE"
            }
        );


        toast(
            "File permanently deleted"
        );


        await loadFiles();

        await loadStorage();


    } catch (error) {

        await professionalInfo(

            "Delete Failed",

            error.message,

            {
                tone:
                    "danger",

                icon:
                    "fa-trash-can"
            }

        );

    }

}


// ============================================================
// FOLDERS
// ============================================================

async function loadFolders() {

    try {

        folders =
            await apiRequest(
                "/folders"
            );


        if (
            !Array.isArray(
                folders
            )
        ) {

            folders = [];

        }


        renderFolders();


    } catch (error) {

        console.error(
            "FOLDER ERROR:",
            error
        );


        toast(
            "Could not load folders"
        );

    }

}


// ============================================================
// CREATE FOLDER - PROFESSIONAL INPUT
// ============================================================

async function createFolder() {

    const name =
        await professionalPrompt(

            "New Folder",

            "Give your folder a clear name.",

            "",

            {
                placeholder:
                    "Folder name",

                confirmText:
                    "Create Folder",

                icon:
                    "fa-folder-plus"
            }

        );


    if (!name) {
        return;
    }


    await createFolderWithName(
        name
    );

}


// ============================================================
// CREATE FOLDER API
// ============================================================

async function createFolderWithName(
    name
) {

    try {

        const formData =
            new FormData();


        formData.append(
            "name",
            name
        );


        await apiRequest(
            "/folders",
            {
                method:
                    "POST",

                body:
                    formData
            }
        );


        toast(
            "Folder created successfully"
        );


        await loadFolders();


    } catch (error) {

        await professionalInfo(

            "Folder Creation Failed",

            error.message,

            {
                tone:
                    "danger",

                icon:
                    "fa-folder-plus"
            }

        );

    }

}


// ============================================================
// RENDER FOLDERS
// ============================================================

function renderFolders() {

    const grid =
        $("#folderGrid");


    if (!grid) {
        return;
    }


    grid.innerHTML =
        "";


    if (
        folders.length ===
        0
    ) {

        return;

    }


    folders.forEach(
        folder => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "folder-card";


            card.innerHTML = `

                <div class="folder-top">

                    <i class="fa-solid fa-folder folder-icon"></i>

                    <button
                        class="more-btn folder-more"
                        type="button"
                        aria-label="Folder actions"
                    >

                        <i class="fa-solid fa-ellipsis-vertical"></i>

                    </button>

                </div>


                <h4>
                    ${escapeHTML(folder.name)}
                </h4>


                <p>
                    Azure Cloud Folder
                </p>

            `;


            const moreButton =
                card.querySelector(
                    ".folder-more"
                );


            moreButton
                ?.addEventListener(
                    "click",
                    async event => {

                        event.stopPropagation();


                        await openFolderActions(
                            folder
                        );

                    }
                );


            grid.appendChild(
                card
            );

        }
    );

}


// ============================================================
// PROFESSIONAL FOLDER ACTIONS
// ============================================================

async function openFolderActions(
    folder
) {

    const action =
        await professionalChoice(

            folder.name,

            "Choose what you want to do with this folder.",

            [

                {
                    label:
                        "Rename Folder",

                    value:
                        "rename",

                    icon:
                        "fa-pen"
                },

                {
                    label:
                        "Delete Folder",

                    value:
                        "delete",

                    icon:
                        "fa-trash",

                    tone:
                        "danger"
                }

            ]

        );


    if (
        action ===
        "rename"
    ) {

        await renameFolder(
            folder
        );

    }


    if (
        action ===
        "delete"
    ) {

        await deleteFolder(
            folder
        );

    }

}


// ============================================================
// RENAME FOLDER
// ============================================================

async function renameFolder(
    folder
) {

    const newName =
        await professionalPrompt(

            "Rename Folder",

            "Enter a new folder name.",

            folder.name,

            {
                placeholder:
                    "Folder name",

                confirmText:
                    "Rename",

                icon:
                    "fa-folder"
            }

        );


    if (!newName) {
        return;
    }


    if (
        newName ===
        folder.name
    ) {

        toast(
            "Folder name unchanged"
        );

        return;

    }


    try {

        await apiRequest(

            `/folders/${folder.id}?new_name=${encodeURIComponent(newName)}`,

            {
                method:
                    "PUT"
            }

        );


        await loadFolders();


        toast(
            "Folder renamed successfully"
        );


    } catch (error) {

        await professionalInfo(

            "Rename Failed",

            error.message,

            {
                tone:
                    "danger",

                icon:
                    "fa-folder"
            }

        );

    }

}


// ============================================================
// DELETE FOLDER
// ============================================================

async function deleteFolder(
    folder
) {

    const confirmed =
        await professionalConfirm(

            "Delete Folder?",

            `"${folder.name}" will be deleted.\n\nThis action cannot be undone.`,

            {
                confirmText:
                    "Delete Folder",

                cancelText:
                    "Cancel",

                tone:
                    "danger",

                icon:
                    "fa-folder-minus"
            }

        );


    if (!confirmed) {
        return;
    }


    try {

        await apiRequest(
            `/folders/${folder.id}`,
            {
                method:
                    "DELETE"
            }
        );


        await loadFolders();


        toast(
            "Folder deleted successfully"
        );


    } catch (error) {

        await professionalInfo(

            "Delete Failed",

            error.message,

            {
                tone:
                    "danger",

                icon:
                    "fa-folder-minus"
            }

        );

    }

}


// ============================================================
// SHARE
// ============================================================

function openShare(
    fileId
) {

    currentFileId =
        fileId;


    const file =
        files.find(
            item =>
                Number(item.id) ===
                Number(fileId)
        );


    if (!file) {

        toast(
            "File not found"
        );

        return;

    }


    const shareFileName =
        $("#shareFileName");

    const shareEmail =
        $("#shareEmail");

    const shareMessage =
        $("#shareMessage");

    const peopleList =
        $("#peopleList");

    const shareLink =
        $("#shareLink");


    if (shareFileName) {

        shareFileName.textContent =
            file.name;

    }


    if (shareEmail) {

        shareEmail.value =
            "";

    }


    if (shareMessage) {

        shareMessage.textContent =
            "";

    }


    if (peopleList) {

        peopleList.innerHTML = `

            <div class="person-row">

                <div class="person-avatar">

                    ${CURRENT_USER.name
                        .charAt(0)
                        .toUpperCase()}

                </div>


                <div class="person-info">

                    <strong>

                        ${escapeHTML(
                            CURRENT_USER.name
                        )}

                    </strong>

                    <span>

                        ${escapeHTML(
                            CURRENT_USER.email
                        )}

                        • Owner

                    </span>

                </div>


                <span>
                    Owner
                </span>

            </div>

        `;

    }


    if (shareLink) {

        shareLink.value =
            `${API_URL}/download/${fileId}`;

    }


    openOverlay(
        "shareOverlay"
    );

}


// ============================================================
// SHARE WITH PERSON
// ============================================================

$("#addPersonBtn")
    ?.addEventListener(
        "click",
        async () => {

            const shareEmail =
                $("#shareEmail");

            const sharePermission =
                $("#sharePermission");

            const shareMessage =
                $("#shareMessage");


            const email =
                shareEmail
                    ?.value
                    .trim()
                ||
                "";


            const permission =
                sharePermission
                    ?.value
                ||
                "Viewer";


            if (
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
                    .test(
                        email
                    )
            ) {

                if (
                    shareMessage
                ) {

                    shareMessage.textContent =
                        "Please enter a valid email address.";

                }


                return;

            }


            const formData =
                new FormData();


            formData.append(
                "email",
                email
            );


            formData.append(
                "permission",
                permission
            );


            try {

                const result =
                    await apiRequest(
                        `/share/${currentFileId}`,
                        {
                            method:
                                "POST",

                            body:
                                formData
                        }
                    );


                if (
                    shareMessage
                ) {

                    shareMessage.textContent =
                        result.message;

                }


                toast(
                    "File shared successfully"
                );


                if (
                    shareEmail
                ) {

                    shareEmail.value =
                        "";

                }


                await loadFiles();


            } catch (error) {

                if (
                    shareMessage
                ) {

                    shareMessage.textContent =
                        error.message;

                }

            }

        }
    );


// ============================================================
// COPY SHARE LINK
// ============================================================

$("#copyLinkBtn")
    ?.addEventListener(
        "click",
        async () => {

            const shareLink =
                $("#shareLink");


            if (!shareLink) {
                return;
            }


            try {

                await navigator
                    .clipboard
                    .writeText(
                        shareLink.value
                    );


                toast(
                    "Share link copied"
                );


            } catch {

                shareLink.select();


                document.execCommand(
                    "copy"
                );


                toast(
                    "Share link copied"
                );

            }

        }
    );
    // ============================================================
// PRIVATE VAULT
// ============================================================

$("#privateVault")
    ?.addEventListener(
        "click",
        async () => {

            currentPage =
                "vault";


            $$(".menu-item")
                .forEach(
                    item => {

                        item.classList.remove(
                            "active"
                        );

                    }
                );


            $("#privateVault")
                ?.classList
                .add(
                    "active"
                );


            const pageTitle =
                $("#pageTitle");

            const pageDescription =
                $("#pageDescription");


            if (pageTitle) {

                pageTitle.textContent =
                    "Private Vault";

            }


            if (pageDescription) {

                pageDescription.textContent =
                    "Extra protection for your most important files.";

            }


            const quickSection =
                $("#quickSection");

            const folderSection =
                $("#folderSection");


            if (quickSection) {

                quickSection.style.display =
                    "none";

            }


            if (folderSection) {

                folderSection.style.display =
                    "none";

            }


            await loadVaultFiles();

        }
    );


// ============================================================
// MOVE FILE TO PRIVATE VAULT
// ============================================================

async function moveToVault(
    fileId
) {

    const file =
        files.find(
            item =>
                Number(item.id) ===
                Number(fileId)
        );


    if (!file) {

        toast(
            "File not found"
        );

        return;

    }


    const confirmed =
        await professionalConfirm(

            "Move to Private Vault?",

            `"${file.name}" will be moved to your protected Private Vault.`,

            {
                confirmText:
                    "Move to Vault",

                cancelText:
                    "Cancel",

                icon:
                    "fa-shield-halved"
            }

        );


    if (!confirmed) {
        return;
    }


    try {

        await apiRequest(
            `/vault/${fileId}`,
            {
                method:
                    "PUT"
            }
        );


        toast(
            "File moved to Private Vault"
        );


        await loadFiles();


    } catch (error) {

        await professionalInfo(

            "Unable to Move File",

            error.message,

            {
                tone:
                    "danger",

                icon:
                    "fa-shield-halved"
            }

        );

    }

}


// ============================================================
// LOAD PRIVATE VAULT
// ============================================================

async function loadVaultFiles() {

    try {

        vaultFiles =
            await apiRequest(
                "/vault"
            );


        if (
            !Array.isArray(
                vaultFiles
            )
        ) {

            vaultFiles = [];

        }


        renderVaultFiles();


    } catch (error) {

        console.error(
            "VAULT ERROR:",
            error
        );


        await professionalInfo(

            "Private Vault",

            error.message,

            {
                tone:
                    "danger",

                icon:
                    "fa-shield-halved"
            }

        );

    }

}


// ============================================================
// RENDER PRIVATE VAULT
// ============================================================

function renderVaultFiles() {

    const container =
        $("#fileRows");


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    const heading =
        $("#filesHeading");


    if (heading) {

        heading.textContent =
            "Protected Files";

    }


    const resultCount =
        $("#resultCount");


    if (resultCount) {

        resultCount.textContent =
            `${vaultFiles.length} protected item${
                vaultFiles.length === 1
                    ? ""
                    : "s"
            }`;

    }


    const emptyState =
        $("#emptyState");

    const filesTable =
        $("#filesTable");


    if (
        vaultFiles.length ===
        0
    ) {

        if (filesTable) {

            filesTable.style.display =
                "none";

        }


        if (emptyState) {

            emptyState.classList.add(
                "show"
            );

        }


        const title =
            $("#emptyState h3");

        const text =
            $("#emptyState p");


        if (title) {

            title.textContent =
                "Your Private Vault is empty";

        }


        if (text) {

            text.textContent =
                "Move important files here for additional protection.";

        }


        return;

    }


    if (emptyState) {

        emptyState.classList.remove(
            "show"
        );

    }


    if (filesTable) {

        filesTable.style.display =
            "block";

    }


    vaultFiles.forEach(
        file => {

            const type =
                getFileType(
                    file.name
                );


            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "file-row";


            row.innerHTML = `

                <div class="file-name">

                    <div class="file-icon ${type.className}">

                        <i class="${type.icon}"></i>

                    </div>


                    <span class="actual-file-name">

                        ${escapeHTML(file.name)}

                        <i
                            class="fa-solid fa-lock"
                            title="Private Vault"
                        ></i>

                    </span>

                </div>


                <span>

                    ${escapeHTML(
                        CURRENT_USER.name
                    )}

                </span>


                <span>

                    ${escapeHTML(
                        file.modified_at ||
                        file.uploaded_at ||
                        "Recently"
                    )}

                </span>


                <span>

                    ${formatSize(
                        file.size
                    )}

                </span>


                <button
                    class="more-btn"
                    type="button"
                    aria-label="Private Vault actions"
                >

                    <i class="fa-solid fa-ellipsis-vertical"></i>

                </button>

            `;


            row.addEventListener(
                "dblclick",
                () => {

                    previewVaultFile(
                        file
                    );

                }
            );


            row
                .querySelector(
                    ".more-btn"
                )
                ?.addEventListener(
                    "click",
                    async event => {

                        event.stopPropagation();


                        await openVaultActions(
                            file
                        );

                    }
                );


            container.appendChild(
                row
            );

        }
    );

}


// ============================================================
// PRIVATE VAULT ACTION MENU
// ============================================================

async function openVaultActions(
    file
) {

    const action =
        await professionalChoice(

            file.name,

            "Choose an action for this protected file.",

            [

                {
                    label:
                        "Preview File",

                    value:
                        "preview",

                    icon:
                        "fa-eye"
                },

                {
                    label:
                        "Download File",

                    value:
                        "download",

                    icon:
                        "fa-download"
                },

                {
                    label:
                        "Move Back to My Drive",

                    value:
                        "restore",

                    icon:
                        "fa-arrow-right-from-bracket"
                }

            ]

        );


    if (
        action ===
        "preview"
    ) {

        previewVaultFile(
            file
        );

    }


    if (
        action ===
        "download"
    ) {

        downloadFile(
            file.id
        );

    }


    if (
        action ===
        "restore"
    ) {

        await restoreFromVault(
            file
        );

    }

}


// ============================================================
// VAULT PREVIEW
// ============================================================

function previewVaultFile(
    file
) {

    const area =
        $("#previewArea");


    if (!area) {
        return;
    }


    const previewName =
        $("#previewName");

    const previewInfo =
        $("#previewInfo");


    if (previewName) {

        previewName.textContent =
            file.name;

    }


    if (previewInfo) {

        previewInfo.textContent =
            `${formatSize(file.size)} • Private Vault`;

    }


    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();


    const previewURL =
        `${API_URL}/preview/${file.id}`;


    if (
        [
            "jpg",
            "jpeg",
            "png",
            "gif",
            "webp"
        ].includes(
            extension
        )
    ) {

        area.innerHTML = `

            <img
                src="${previewURL}"
                alt="${escapeHTML(file.name)}"
            >

        `;

    } else if (
        extension ===
        "pdf"
    ) {

        area.innerHTML = `

            <iframe
                src="${previewURL}"
            ></iframe>

        `;

    } else {

        const type =
            getFileType(
                file.name
            );


        area.innerHTML = `

            <div class="preview-placeholder">

                <i class="${type.icon}"></i>

                <h3>
                    ${escapeHTML(file.name)}
                </h3>

                <p>
                    Protected by Private Vault
                </p>

            </div>

        `;

    }


    openOverlay(
        "previewOverlay"
    );

}


// ============================================================
// RESTORE FROM PRIVATE VAULT
// ============================================================

async function restoreFromVault(
    file
) {

    const confirmed =
        await professionalConfirm(

            "Move Back to My Drive?",

            `"${file.name}" will leave Private Vault and return to My Drive.`,

            {
                confirmText:
                    "Move to My Drive",

                cancelText:
                    "Cancel",

                icon:
                    "fa-folder-open"
            }

        );


    if (!confirmed) {
        return;
    }


    try {

        await apiRequest(
            `/vault/${file.id}/restore`,
            {
                method:
                    "PUT"
            }
        );


        toast(
            "File returned to My Drive"
        );


        await loadVaultFiles();


    } catch (error) {

        await professionalInfo(

            "Unable to Restore File",

            error.message,

            {
                tone:
                    "danger",

                icon:
                    "fa-shield-halved"
            }

        );

    }

}


// ============================================================
// STORAGE
// ============================================================

async function loadStorage() {

    try {

        const data =
            await apiRequest(
                "/storage"
            );


        const used =
            Number(
                data.used ||
                data.used_bytes ||
                0
            );


        const total =
            Number(
                data.total ||
                data.total_bytes ||
                5 *
                1024 *
                1024 *
                1024
            );


        const percent =
            total > 0
                ? Math.min(
                    100,
                    (
                        used /
                        total
                    ) * 100
                )
                : 0;


        const storageText =
            $("#storageText");


        if (storageText) {

            storageText.textContent =
                `${formatSize(used)} of ${formatSize(total)} used`;

        }


        const storageBar =
            $("#storageBar");


        if (storageBar) {

            storageBar.style.width =
                `${percent}%`;

        }


        const storagePercent =
            $("#storagePercent");


        if (storagePercent) {

            storagePercent.textContent =
                `${percent.toFixed(1)}%`;

        }


    } catch (error) {

        console.error(
            "STORAGE ERROR:",
            error
        );

    }

}


// ============================================================
// CLOSE NORMAL OVERLAYS
// ============================================================

$$("[data-close]")
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const overlay =
                        button.closest(
                            ".overlay"
                        );


                    overlay
                        ?.classList
                        .remove(
                            "show"
                        );

                }
            );

        }
    );


// ============================================================
// CLICK OUTSIDE NORMAL MODALS
// ============================================================

$$(".overlay")
    .forEach(
        overlay => {

            overlay.addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        overlay
                    ) {

                        overlay.classList.remove(
                            "show"
                        );

                    }

                }
            );

        }
    );


// ============================================================
// ESCAPE KEY
// ============================================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !==
            "Escape"
        ) {

            return;

        }


        $$(".overlay.show")
            .forEach(
                overlay => {

                    overlay.classList.remove(
                        "show"
                    );

                }
            );


        $("#newMenu")
            ?.classList
            .remove(
                "show"
            );


        hideMenus();

    }
);


// ============================================================
// LOGOUT
// ============================================================

$("#logoutBtn")
    ?.addEventListener(
        "click",
        async () => {

            const confirmed =
                await professionalConfirm(

                    "Sign out of CloudVault?",

                    `You are currently signed in as ${CURRENT_USER.email}.`,

                    {
                        confirmText:
                            "Sign Out",

                        cancelText:
                            "Stay Signed In",

                        icon:
                            "fa-right-from-bracket"
                    }

                );


            if (!confirmed) {
                return;
            }


            localStorage.removeItem(
                "cloudvault_token"
            );


            localStorage.removeItem(
                "cloudvault_user"
            );


            window.location.href =
                "login.html";

        }
    );


// ============================================================
// SETTINGS
// ============================================================

$("#settingsBtn")
    ?.addEventListener(
        "click",
        async () => {

            await professionalInfo(

                "CloudVault Settings",

                `Account: ${CURRENT_USER.email}\n\nYour files are stored securely using Microsoft Azure Blob Storage.`,

                {
                    confirmText:
                        "Done",

                    icon:
                        "fa-gear"
                }

            );

        }
    );


// ============================================================
// HELP
// ============================================================

$("#helpBtn")
    ?.addEventListener(
        "click",
        async () => {

            await professionalInfo(

                "CloudVault Help",

                "Use New to upload files or create folders.\n\nUse the three-dot menu beside a file to preview, download, rename, share, star, move to Private Vault, or move it to Trash.",

                {
                    confirmText:
                        "Got It",

                    icon:
                        "fa-circle-question"
                }

            );

        }
    );


// ============================================================
// REFRESH BUTTON
// ============================================================

$("#refreshBtn")
    ?.addEventListener(
        "click",
        async () => {

            toast(
                "Refreshing CloudVault..."
            );


            if (
                currentPage ===
                "vault"
            ) {

                await loadVaultFiles();

            } else if (
                currentPage ===
                "activity"
            ) {

                await loadActivity();

            } else {

                await loadFolders();

                await loadFiles();

            }


            await loadStorage();


            toast(
                "CloudVault refreshed"
            );

        }
    );


// ============================================================
// MANUAL UPLOAD BUTTON
// ============================================================

$("#uploadBtn")
    ?.addEventListener(
        "click",
        () => {

            $("#fileInput")
                ?.click();

        }
    );


// ============================================================
// CLOSE PREVIEW
// ============================================================

$("#closePreview")
    ?.addEventListener(
        "click",
        () => {

            closeOverlay(
                "previewOverlay"
            );

        }
    );


// ============================================================
// CLOSE SHARE
// ============================================================

$("#closeShare")
    ?.addEventListener(
        "click",
        () => {

            closeOverlay(
                "shareOverlay"
            );

        }
    );


// ============================================================
// FINAL SAFETY CHECK
// ============================================================

window.addEventListener(
    "error",
    event => {

        console.error(
            "CLOUDVAULT FRONTEND ERROR:",
            event.error ||
            event.message
        );

    }
);


window.addEventListener(
    "unhandledrejection",
    event => {

        console.error(
            "CLOUDVAULT PROMISE ERROR:",
            event.reason
        );

    }
);


// ============================================================
// CLOUDVAULT READY
// ============================================================

console.log(
    "CloudVault professional interface loaded successfully."
);
