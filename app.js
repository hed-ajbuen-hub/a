const pages = {
    donors: {
        endpoint: "/api/donors",
        columns: ["id", "full_name", "email", "phone", "address"]
    },
    campaigns: {
        endpoint: "/api/campaigns",
        columns: ["id", "title", "target_amount", "current_amount", "status"]
    },
    donations: {
        endpoint: "/api/donations",
        columns: ["donation_number", "donor_name", "campaign_title", "amount", "status"]
    },
    beneficiaries: {
        endpoint: "/api/beneficiaries",
        columns: ["id", "full_name", "classification", "eligibility_status"]
    },
    courses: {
        endpoint: "/api/courses",
        columns: ["id", "course_name"]
    },
    enrollments: {
        endpoint: "/api/enrollments",
        columns: ["student_name", "college_id", "course_name", "enrollment_date"]
    }
};

const page = pages[document.body.dataset.page];
const form = document.querySelector("#record-form");
const tableBody = document.querySelector("#records-table");
const submitButton = form.querySelector("button[type='submit']");
const statusMessage = document.createElement("p");
statusMessage.setAttribute("role", "status");
statusMessage.setAttribute("aria-live", "polite");
form.insertAdjacentElement("afterend", statusMessage);
let currentUserRole = "user";
document.querySelectorAll("[data-admin-only]").forEach((section) => {
    section.hidden = true;
});

async function initializeSession() {
    let user;
    try {
        user = await requestJson("/api/auth/me");
    } catch {
        window.location.replace("login.html");
        return false;
    }

    const controls = document.querySelector("[data-session-controls]");
    currentUserRole = user.role;
    const identity = document.createElement("span");
    identity.className = "session-user";
    identity.append(document.createTextNode(`${user.username} `));
    const role = document.createElement("strong");
    role.textContent = user.role;
    identity.append(role);
    const logoutButton = document.createElement("button");
    logoutButton.className = "logout-button";
    logoutButton.type = "button";
    logoutButton.textContent = "Sign out";
    logoutButton.addEventListener("click", async () => {
        logoutButton.disabled = true;
        try {
            await requestJson("/api/auth/logout", { method: "POST" });
        } finally {
            window.location.replace("login.html");
        }
    });
    controls.append(identity, logoutButton);

    if (user.role === "admin") {
        document.querySelectorAll("[data-admin-only]").forEach((section) => {
            section.hidden = false;
        });
    }
    return true;
}

function formatMoney(value) {
    return `PHP ${Number(value).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function createCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value ?? "";
    return cell;
}

function addStatusCell(row, value) {
    const cell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "badge";
    if (["Pending", "Ineligible"].includes(value)) {
        badge.classList.add("badge-pending");
    } else if (value === "Completed") {
        badge.classList.add("badge-completed");
    } else {
        badge.classList.add("badge-active");
    }
    badge.textContent = value;
    cell.append(badge);
    row.append(cell);
}

function renderRows(records) {
    tableBody.replaceChildren();
    for (const record of records) {
        const row = document.createElement("tr");
        for (const column of page.columns) {
            if (column === "status" || column === "eligibility_status") {
                addStatusCell(row, record[column]);
            } else if (["target_amount", "current_amount", "amount"].includes(column)) {
                row.append(createCell(formatMoney(record[column])));
            } else {
                row.append(createCell(record[column]));
            }
        }
        if ((page === pages.courses && currentUserRole === "admin") || page === pages.enrollments) {
            const actions = document.createElement("td");
            actions.className = "table-actions";
            const editButton = document.createElement("button");
            editButton.className = "table-action";
            editButton.type = "button";
            editButton.textContent = "Edit";
            editButton.addEventListener("click", () => {
                if (page === pages.courses) {
                    form.elements.courseName.value = record.course_name;
                    form.dataset.courseId = record.id;
                    submitButton.textContent = "Update Course";
                } else {
                    form.elements.studentName.value = record.student_name;
                    form.elements.collegeId.value = record.college_id;
                    form.elements.courseId.value = record.course_id;
                    form.elements.enrollmentDate.value = record.enrollment_date;
                    form.dataset.enrollmentId = record.id;
                    submitButton.textContent = "Update Enrollment";
                }
                form.querySelector("[data-cancel-edit]").hidden = false;
                form.elements[page === pages.courses ? "courseName" : "studentName"].focus();
            });
            const deleteButton = document.createElement("button");
            deleteButton.className = "table-action table-action-danger";
            deleteButton.type = "button";
            deleteButton.textContent = "Delete";
            deleteButton.addEventListener("click", async () => {
                const recordName = page === pages.courses ? record.course_name : record.student_name;
                if (!window.confirm(`Delete ${recordName}?`)) return;
                statusMessage.textContent = "";
                try {
                    await requestJson(`${page.endpoint}/${record.id}`, { method: "DELETE" });
                    statusMessage.textContent = page === pages.courses ? "Course deleted." : "Enrollment deleted.";
                    if (page === pages.enrollments && form.dataset.enrollmentId === String(record.id)) {
                        form.reset();
                        resetEnrollmentEdit();
                    }
                    await loadRecords();
                } catch (error) {
                    statusMessage.textContent = error.message;
                }
            });
            actions.append(editButton, deleteButton);
            row.append(actions);
        }
        tableBody.append(row);
    }
}

async function requestJson(url, options) {
    const response = await window.apiRequest(url, options);
    const responseText = await response.text();
    let result = {};
    try {
        result = responseText ? JSON.parse(responseText) : {};
    } catch {
        if (response.status === 408) {
            throw new Error("The temporary share link timed out. The site owner needs to restart the link.");
        }
        throw new Error(`The server returned an invalid response (HTTP ${response.status}).`);
    }
    if (!response.ok) {
        if (response.status === 408) {
            throw new Error("The temporary share link timed out. The site owner needs to restart the link.");
        }
        throw new Error(result.error || `The request could not be completed (HTTP ${response.status}).`);
    }
    return result;
}

async function loadRecords() {
    renderRows(await requestJson(page.endpoint));
}

async function loadDonationOptions() {
    const [donors, campaigns] = await Promise.all([
        requestJson("/api/donors"),
        requestJson("/api/campaigns")
    ]);
    const donorSelect = form.elements.donorId;
    const campaignSelect = form.elements.campaignId;
    for (const select of [donorSelect, campaignSelect]) {
        select.replaceChildren(select.options[0]);
    }
    for (const donor of donors) {
        const option = document.createElement("option");
        option.value = donor.id;
        option.textContent = donor.full_name;
        donorSelect.append(option);
    }
    for (const campaign of campaigns) {
        const option = document.createElement("option");
        option.value = campaign.id;
        option.textContent = campaign.title;
        campaignSelect.append(option);
    }
}

async function loadCourseOptions() {
    const courses = await requestJson("/api/courses");
    const courseSelect = form.elements.courseId;
    courseSelect.replaceChildren(courseSelect.options[0]);
    for (const course of courses) {
        const option = document.createElement("option");
        option.value = course.id;
        option.textContent = course.course_name;
        courseSelect.append(option);
    }
}

function resetCourseEdit() {
    delete form.dataset.courseId;
    submitButton.textContent = "Add Course";
    form.querySelector("[data-cancel-edit]").hidden = true;
}

function resetEnrollmentEdit() {
    delete form.dataset.enrollmentId;
    submitButton.textContent = "Save Enrollment";
    form.querySelector("[data-cancel-edit]").hidden = true;
}

form.querySelector("[data-cancel-edit]")?.addEventListener("click", () => {
    form.reset();
    if (page === pages.courses) resetCourseEdit();
    if (page === pages.enrollments) resetEnrollmentEdit();
    statusMessage.textContent = "";
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    statusMessage.textContent = "";
    submitButton.disabled = true;
    try {
        const editId = page === pages.courses
            ? form.dataset.courseId
            : page === pages.enrollments ? form.dataset.enrollmentId : null;
        await requestJson(editId ? `${page.endpoint}/${editId}` : page.endpoint, {
            method: editId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(Object.fromEntries(new FormData(form)))
        });
        form.reset();
        if (page === pages.courses) resetCourseEdit();
        if (page === pages.enrollments) resetEnrollmentEdit();
        statusMessage.textContent = "Saved successfully.";
        await loadRecords();
        if (page === pages.donations) {
            await loadDonationOptions();
        }
    } catch (error) {
        statusMessage.textContent = error.message;
    } finally {
        submitButton.disabled = false;
    }
});

initializeSession().then((authenticated) => {
    if (!authenticated) return;
    const recordsPromise = page === pages.enrollments
        ? loadCourseOptions().then(loadRecords)
        : loadRecords();
    return Promise.all([
        recordsPromise,
        page === pages.donations ? loadDonationOptions() : Promise.resolve()
    ]).catch((error) => {
        statusMessage.textContent = error.message;
    });
});