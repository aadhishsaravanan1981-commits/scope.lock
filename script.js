const pageInfo = {
	dashboard: { label: "Dashboard", title: "Project Dashboard" },
	scope: { label: "Project Scope", title: "Project Scope" },
	changes: { label: "Change Requests", title: "Change Requests" },
	agreement: { label: "Agreements", title: "Agreements" },
	reports: { label: "Reports & Audit", title: "Reports & Audit" }
};

const starterRequests = [
	{ id: 1, title: "Add export to PDF", description: "Allow reports to be downloaded as PDF files.", priority: "Medium", status: "In review", requestedBy: "Jordan Lee" },
	{ id: 2, title: "Update onboarding copy", description: "Clarify the first-time setup instructions.", priority: "Low", status: "Approved", requestedBy: "Sam Rivera" }
];

const storageKey = "scopelock-change-requests";
const loginPage = document.getElementById("loginPage");
const app = document.getElementById("app");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginView = document.getElementById("loginView");
const registerView = document.getElementById("registerView");
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const authFeedback = document.getElementById("authFeedback");
const content = document.getElementById("content");
const toast = document.getElementById("toast");
const accountsStorageKey = "scopelock-accounts";
let currentUser = null;
let activePage = "dashboard";
let toastTimeout;

function loadRequests() {
	try {
		const saved = JSON.parse(localStorage.getItem(storageKey));
		return Array.isArray(saved) ? saved : [...starterRequests];
	} catch {
		return [...starterRequests];
	}
}

let requests = loadRequests();

function loadAccounts() {
	try {
		const saved = JSON.parse(localStorage.getItem(accountsStorageKey));
		return Array.isArray(saved) ? saved : [];
	} catch {
		return [];
	}
}

let accounts = loadAccounts();

function saveAccounts() {
	try {
		localStorage.setItem(accountsStorageKey, JSON.stringify(accounts));
		return true;
	} catch {
		authFeedback.textContent = "This browser could not save the account. Check its storage settings.";
		return false;
	}
}

function switchAuthMode(mode) {
	const showRegister = mode === "register";
	loginView.classList.toggle("hidden", showRegister);
	registerView.classList.toggle("hidden", !showRegister);
	loginTab.classList.toggle("active", !showRegister);
	registerTab.classList.toggle("active", showRegister);
	loginTab.setAttribute("aria-selected", String(!showRegister));
	registerTab.setAttribute("aria-selected", String(showRegister));
	authFeedback.textContent = "";
}

function fallbackHash(input) {
	let hash = 2166136261;
	for (let index = 0; index < input.length; index += 1) {
		hash ^= input.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0).toString(16).padStart(8, "0");
}

async function hashPassword(password, salt) {
	const input = `${salt}:${password}`;
	if (globalThis.crypto?.subtle) {
		const data = new TextEncoder().encode(input);
		const digest = await crypto.subtle.digest("SHA-256", data);
		return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
	}
	return fallbackHash(input);
}

function startSession(user) {
	currentUser = user;
	document.getElementById("userName").textContent = user.name;
	document.getElementById("userRole").textContent = user.role;
	document.getElementById("avatar").textContent = user.name.charAt(0).toUpperCase();
	authFeedback.textContent = "";
	loginPage.classList.add("hidden");
	app.classList.remove("hidden");
	renderPage("dashboard");
}

function saveRequests() {
	try {
		localStorage.setItem(storageKey, JSON.stringify(requests));
	} catch {
		showToast("Changes could not be saved in this browser.");
	}
}

function escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, (character) => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#39;"
	})[character]);
}

function showToast(message) {
	toast.textContent = message;
	Object.assign(toast.style, {
		position: "fixed",
		right: "20px",
		bottom: "20px",
		zIndex: "10",
		padding: "12px 16px",
		borderRadius: "8px",
		color: "white",
		background: "#171d3b",
		boxShadow: "0 8px 24px #171d3b30"
	});
	toast.hidden = false;
	clearTimeout(toastTimeout);
	toastTimeout = setTimeout(() => {
		toast.textContent = "";
		toast.hidden = true;
	}, 2800);
}

function requestRows() {
	if (!requests.length) {
		return '<p class="panel-subtitle">No change requests yet.</p>';
	}

	return requests.map((request) => `
		<article class="project">
			<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
				<div>
					<strong>${escapeHtml(request.title)}</strong>
					<p class="panel-subtitle" style="margin:6px 0;">${escapeHtml(request.description)}</p>
					<small>Requested by ${escapeHtml(request.requestedBy)} · ${escapeHtml(request.priority)} priority</small>
				</div>
				<strong>${escapeHtml(request.status)}</strong>
			</div>
			${request.status === "In review" ? `
				<div style="display:flex;gap:8px;margin-top:12px;">
					<button class="primary" type="button" data-action="approve" data-id="${request.id}">Approve</button>
					<button type="button" data-action="reject" data-id="${request.id}">Decline</button>
				</div>` : ""}
		</article>
	`).join("");
}

function renderDashboard() {
	const openCount = requests.filter((request) => request.status === "In review").length;
	const approvedCount = requests.filter((request) => request.status === "Approved").length;

	return `
		<div class="welcome">
			<div>
				<h3>Welcome, ${escapeHtml(currentUser.name.split(/\s+/)[0])}</h3>
				<p>Here is the latest activity across your workspace.</p>
			</div>
			<button class="primary" type="button" data-action="go-changes">＋ New request</button>
		</div>
		<div class="stats">
			<article class="card"><div class="stat-title">Active projects</div><div class="stat-value">3</div><div class="stat-foot">Across your workspace</div></article>
			<article class="card"><div class="stat-title">In-scope features</div><div class="stat-value">24</div><div class="stat-foot">Tracked in the project plan</div></article>
			<article class="card"><div class="stat-title">Requests in review</div><div class="stat-value">${openCount}</div><div class="stat-foot">Awaiting a decision</div></article>
			<article class="card"><div class="stat-title">Approved changes</div><div class="stat-value">${approvedCount}</div><div class="stat-foot">Recorded in this demo</div></article>
		</div>
		<div class="columns">
			<section class="panel">
				<h3>Recent change requests</h3>
				<p class="panel-subtitle">Review project updates and decisions.</p>
				${requestRows()}
			</section>
			<section class="panel">
				<h3>Project overview</h3>
				<p class="panel-subtitle">Current delivery at a glance.</p>
				<article class="project"><strong>Client Portal Redesign</strong><p class="panel-subtitle">In progress · Due Nov 28, 2026</p><div>Scope completion: <strong>68%</strong></div></article>
				<article class="project"><strong>Billing Workflow</strong><p class="panel-subtitle">In review · Due Dec 12, 2026</p><div>Scope completion: <strong>42%</strong></div></article>
				<article class="project"><strong>Support Knowledge Base</strong><p class="panel-subtitle">Planning · Due Jan 15, 2027</p><div>Scope completion: <strong>18%</strong></div></article>
			</section>
		</div>
	`;
}

function renderPage(page) {
	activePage = pageInfo[page] ? page : "dashboard";
	const pageMeta = pageInfo[activePage];
	document.getElementById("breadcrumb").textContent = pageMeta.label;
	document.getElementById("pageTitle").textContent = pageMeta.title;
	document.querySelectorAll(".nav[data-page]").forEach((button) => {
		const isActive = button.dataset.page === activePage;
		button.classList.toggle("active", isActive);
		button.setAttribute("aria-current", isActive ? "page" : "false");
	});

	if (activePage === "dashboard") {
		content.innerHTML = renderDashboard();
	} else if (activePage === "scope") {
		content.innerHTML = `
			<div class="welcome"><div><h3>Client Portal Redesign</h3><p>Approved scope and delivery milestones.</p></div></div>
			<div class="columns">
				<section class="panel"><h3>Included in scope</h3><p class="panel-subtitle">Features agreed for this project.</p>
					<article class="project"><strong>Account and profile management</strong><p class="panel-subtitle">Profile editing, preferences, and secure account recovery.</p></article>
					<article class="project"><strong>Project dashboard</strong><p class="panel-subtitle">Progress, key dates, and recent project updates.</p></article>
					<article class="project"><strong>Document center</strong><p class="panel-subtitle">View and download approved project documents.</p></article>
					<article class="project"><strong>Responsive interface</strong><p class="panel-subtitle">Support for desktop, tablet, and mobile screens.</p></article>
				</section>
				<section class="panel"><h3>Delivery milestones</h3><p class="panel-subtitle">Planned checkpoints for the project.</p>
					<article class="project"><strong>Discovery and sign-off</strong><p class="panel-subtitle">Completed · Sep 18, 2026</p></article>
					<article class="project"><strong>Design approval</strong><p class="panel-subtitle">Completed · Oct 02, 2026</p></article>
					<article class="project"><strong>Development review</strong><p class="panel-subtitle">In progress · Oct 30, 2026</p></article>
					<article class="project"><strong>Launch handover</strong><p class="panel-subtitle">Planned · Nov 28, 2026</p></article>
				</section>
			</div>`;
	} else if (activePage === "changes") {
		content.innerHTML = `
			<div class="welcome"><div><h3>Change requests</h3><p>Submit and track work outside the approved project scope.</p></div></div>
			<div class="columns">
				<section class="panel"><h3>Submit a request</h3><p class="panel-subtitle">New requests are saved in this browser for the demo.</p>
					<form id="requestForm">
						<label for="requestTitle">Request title</label><input id="requestTitle" name="title" maxlength="100" required placeholder="What would you like to change?">
						<label for="requestDescription">Description</label><textarea id="requestDescription" name="description" rows="4" maxlength="500" required placeholder="Describe the requested work and why it is needed."></textarea>
						<label for="requestPriority">Priority</label><select id="requestPriority" name="priority"><option>Low</option><option selected>Medium</option><option>High</option></select>
						<button class="primary full" type="submit">Submit request</button>
					</form>
				</section>
				<section class="panel"><h3>Request history</h3><p class="panel-subtitle">Current status of submitted changes.</p>${requestRows()}</section>
			</div>`;
	} else if (activePage === "agreement") {
		content.innerHTML = `
			<div class="welcome"><div><h3>Agreements</h3><p>Key project documents and their current status.</p></div></div>
			<section class="panel"><h3>Project documents</h3><p class="panel-subtitle">Documents are sample records for this demo.</p>
				<article class="project"><strong>Master Services Agreement</strong><p class="panel-subtitle">Signed · Sep 12, 2026 · Version 1.0</p></article>
				<article class="project"><strong>Client Portal Redesign - Statement of Work</strong><p class="panel-subtitle">Approved · Sep 18, 2026 · Version 1.2</p></article>
				<article class="project"><strong>Billing Workflow - Statement of Work</strong><p class="panel-subtitle">Pending review · Oct 10, 2026 · Version 1.0</p></article>
			</section>`;
	} else {
		content.innerHTML = `
			<div class="welcome"><div><h3>Reports &amp; audit</h3><p>A summary of project scope activity.</p></div></div>
			<div class="stats">
				<article class="card"><div class="stat-title">Tracked requests</div><div class="stat-value">${requests.length}</div><div class="stat-foot">In this browser</div></article>
				<article class="card"><div class="stat-title">Approved</div><div class="stat-value">${requests.filter((item) => item.status === "Approved").length}</div><div class="stat-foot">Approved changes</div></article>
				<article class="card"><div class="stat-title">Declined</div><div class="stat-value">${requests.filter((item) => item.status === "Declined").length}</div><div class="stat-foot">Declined changes</div></article>
				<article class="card"><div class="stat-title">In review</div><div class="stat-value">${requests.filter((item) => item.status === "In review").length}</div><div class="stat-foot">Awaiting decision</div></article>
			</div>
			<section class="panel"><h3>Audit activity</h3><p class="panel-subtitle">Request history recorded in this demo.</p>${requestRows()}</section>`;
	}
}


loginTab.addEventListener("click", () => switchAuthMode("login"));
registerTab.addEventListener("click", () => switchAuthMode("register"));
document.querySelectorAll("[data-auth-mode]").forEach((button) => {
	button.addEventListener("click", () => switchAuthMode(button.dataset.authMode));
});

registerForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	if (!registerForm.reportValidity()) return;

	const formData = new FormData(registerForm);
	const name = String(formData.get("name")).trim();
	const email = String(formData.get("email")).trim().toLowerCase();
	const password = String(formData.get("password"));
	const confirmPassword = String(formData.get("confirmPassword"));

	if (password !== confirmPassword) {
		authFeedback.textContent = "Those passwords don’t match. Check them and try again.";
		document.getElementById("confirmPassword").focus();
		return;
	}
	if (accounts.some((account) => account.email === email)) {
		authFeedback.textContent = "An account with this email already exists. Sign in instead.";
		return;
	}
	const salt = globalThis.crypto?.getRandomValues
		? Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("")
		: `${Date.now()}-${Math.random().toString(16).slice(2)}`;
	const passwordHash = await hashPassword(password, salt);
	const account = { name, email, role: String(formData.get("role")), salt, passwordHash };
	accounts.push(account);
	if (!saveAccounts()) {
		accounts = accounts.filter((item) => item.email !== email);
		return;
	}

	registerForm.reset();
	startSession(account);
	showToast(`Account created. Welcome, ${name.split(/\s+/)[0]}.`);
});

loginForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	if (!loginForm.reportValidity()) return;

	const formData = new FormData(loginForm);
	const email = String(formData.get("email")).trim().toLowerCase();
	const password = String(formData.get("password"));
	const account = accounts.find((item) => item.email === email);
	if (!account) {
		authFeedback.textContent = "No account found for that email. Create an account to get started.";
		return;
	}
	const passwordHash = await hashPassword(password, account.salt);
	if (passwordHash !== account.passwordHash) {
		authFeedback.textContent = "That password doesn’t match this account. Try again.";
		return;
	}

	loginForm.reset();
	startSession(account);
	showToast(`Welcome back, ${account.name.split(/\s+/)[0]}.`);
});

document.querySelector(".sidebar").addEventListener("click", (event) => {
	const button = event.target.closest(".nav[data-page]");
	if (button) renderPage(button.dataset.page);
});

document.getElementById("logout").addEventListener("click", () => {
	currentUser = null;
	app.classList.add("hidden");
	loginPage.classList.remove("hidden");
	loginForm.reset();
	registerForm.reset();
	switchAuthMode("login");
	document.getElementById("email").focus();
});

content.addEventListener("submit", (event) => {
	if (event.target.id !== "requestForm") return;
	event.preventDefault();
	if (!event.target.reportValidity()) return;

	const formData = new FormData(event.target);
	requests.unshift({
		id: Date.now(),
		title: String(formData.get("title")).trim(),
		description: String(formData.get("description")).trim(),
		priority: String(formData.get("priority")),
		status: "In review",
		requestedBy: currentUser.name
	});
	saveRequests();
	renderPage("changes");
	showToast("Change request submitted.");
});

content.addEventListener("click", (event) => {
	const button = event.target.closest("[data-action]");
	if (!button) return;

	if (button.dataset.action === "go-changes") {
		renderPage("changes");
		return;
	}

	const request = requests.find((item) => item.id === Number(button.dataset.id));
	if (!request) return;
	request.status = button.dataset.action === "approve" ? "Approved" : "Declined";
	saveRequests();
	renderPage(activePage);
	showToast(`Request ${request.status.toLowerCase()}.`);
});
