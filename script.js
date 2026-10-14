"use strict";

/* ==========================================
   I LOVE READING — BOOK TRACKER
   ========================================== */

const BOOKS_KEY = "iLoveReadingBooks_v1";
const GOAL_KEY = "iLoveReadingGoal_v1";
const THEME_KEY = "iLoveReadingTheme_v1";

const VALID_STATUSES = ["To Read", "Reading", "Finished"];

const $ = (selector) => document.querySelector(selector);

const elements = {
    form: $("#book-form"),
    title: $("#book-title"),
    author: $("#book-author"),
    status: $("#book-status"),
    titleError: $("#title-error"),
    authorError: $("#author-error"),
    formMessage: $("#form-message"),
    bookList: $("#book-list"),
    search: $("#search-input"),
    statusFilter: $("#status-filter"),
    collectionFilter: $("#collection-filter"),
    totalCount: $("#total-count"),
    todoCount: $("#todo-count"),
    readingCount: $("#reading-count"),
    finishedCount: $("#finished-count"),
    themeToggle: $("#theme-toggle"),
    goalForm: $("#goal-form"),
    goalYear: $("#goal-year"),
    goalTarget: $("#goal-target"),
    goalProgressText: $("#goal-progress-text"),
    goalPercentage: $("#goal-percentage"),
    goalProgressTrack: $("#goal-progress-track"),
    goalProgressBar: $("#goal-progress-bar"),
    goalMessage: $("#goal-message"),
    exportJson: $("#export-json"),
    exportCsv: $("#export-csv"),
    importFile: $("#import-file"),
    backupMessage: $("#backup-message")
};

let books = loadBooks();
let readingGoal = loadGoal();

/* ==========================================
   SAFE STORAGE
   ========================================== */

function saveBooks() {
    try {
        localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
        return true;
    } catch (error) {
        console.error("Could not save books:", error);
        showMessage(
            elements.formMessage,
            "Unable to save. Your browser storage may be full.",
            true
        );
        return false;
    }
}

function loadBooks() {
    try {
        const saved = localStorage.getItem(BOOKS_KEY);

        if (!saved) return [];

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) return [];

        return parsed
            .filter((book) =>
                book &&
                typeof book.title === "string" &&
                book.title.trim() &&
                typeof book.author === "string" &&
                book.author.trim() &&
                VALID_STATUSES.includes(book.status)
            )
            .map((book, index) => ({
                id: String(book.id || createId()),
                title: book.title.trim(),
                author: book.author.trim(),
                status: book.status,
                createdAt: Number(book.createdAt) || Date.now(),
                order: Number.isFinite(Number(book.order))
                    ? Number(book.order)
                    : index,
                favorite: book.favorite === true,
                rating: Math.max(
                    0,
                    Math.min(5, Math.round(Number(book.rating) || 0))
                ),
                review: typeof book.review === "string"
                    ? book.review.slice(0, 2000)
                    : "",
                finishedAt: Number(book.finishedAt) || null
            }));
    } catch (error) {
        console.error("Could not load books:", error);
        return [];
    }
}

function loadGoal() {
    const defaultGoal = {
        year: new Date().getFullYear(),
        target: 12
    };

    try {
        const saved = localStorage.getItem(GOAL_KEY);

        if (!saved) return defaultGoal;

        const parsed = JSON.parse(saved);

        return {
            year: Number.isInteger(Number(parsed.year))
                ? Number(parsed.year)
                : defaultGoal.year,
            target: Number.isInteger(Number(parsed.target)) &&
                    Number(parsed.target) > 0
                ? Math.min(10000, Number(parsed.target))
                : defaultGoal.target
        };
    } catch {
        return defaultGoal;
    }
}

function saveGoal() {
    try {
        localStorage.setItem(GOAL_KEY, JSON.stringify(readingGoal));
        return true;
    } catch (error) {
        console.error("Could not save reading goal:", error);
        return false;
    }
}

function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    return "book-" + Date.now() + "-" +
        Math.random().toString(36).slice(2);
}

function showMessage(element, message, isError = false) {
    if (!element) return;

    element.textContent = message;
    element.style.color = isError ? "#dc2626" : "";
}

/* ==========================================
   ADD A BOOK
   ========================================== */

elements.form.addEventListener("submit", function (event) {
    event.preventDefault();

    const title = elements.title.value.trim();
    const author = elements.author.value.trim();
    const status = elements.status.value;

    elements.titleError.textContent = "";
    elements.authorError.textContent = "";
    showMessage(elements.formMessage, "");

    let valid = true;

    if (!title) {
        elements.titleError.textContent = "Please enter a book title.";
        valid = false;
    }

    if (!author) {
        elements.authorError.textContent = "Please enter the author's name.";
        valid = false;
    }

    if (!VALID_STATUSES.includes(status)) {
        showMessage(elements.formMessage, "Please select a valid status.", true);
        valid = false;
    }

    if (!valid) return;

    const now = Date.now();

    const newBook = {
        id: createId(),
        title,
        author,
        status,
        createdAt: now,
        order: now,
        favorite: false,
        rating: 0,
        review: "",
        finishedAt: status === "Finished" ? now : null
    };

    books.push(newBook);

    if (!saveBooks()) {
        books.pop();
        return;
    }

    elements.form.reset();

    elements.status.value = "To Read";

    showMessage(
        elements.formMessage,
        `"${title}" was added to your bookshelf!`
    );

    renderAll();
});

/* ==========================================
   SEARCH AND FILTER
   ========================================== */

elements.search.addEventListener("input", renderBooks);

elements.statusFilter.addEventListener("change", renderBooks);

elements.collectionFilter.addEventListener("change", renderBooks);

/* ==========================================
   STATISTICS
   ========================================== */

function renderStatistics() {
    elements.totalCount.textContent = books.length;

    elements.todoCount.textContent =
        books.filter(book => book.status === "To Read").length;

    elements.readingCount.textContent =
        books.filter(book => book.status === "Reading").length;

    elements.finishedCount.textContent =
        books.filter(book => book.status === "Finished").length;
}

/* ==========================================
   DISPLAY BOOKS
   ========================================== */

function renderBooks() {
    const query = elements.search.value.trim().toLowerCase();
    const selectedStatus = elements.statusFilter.value;
    const selectedCollection = elements.collectionFilter.value;

    const filteredBooks = books
        .filter(book => {
            const matchesSearch =
                book.title.toLowerCase().includes(query) ||
                book.author.toLowerCase().includes(query);

            const matchesStatus =
                selectedStatus === "All" ||
                book.status === selectedStatus;

            const matchesCollection =
                selectedCollection !== "Favourites" ||
                book.favorite;

            return matchesSearch && matchesStatus && matchesCollection;
        })
        .sort((a, b) => {
            const timeDifference =
                Number(b.createdAt) - Number(a.createdAt);

            return timeDifference || Number(b.order) - Number(a.order);
        });

    elements.bookList.replaceChildren();

    if (filteredBooks.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";

        empty.textContent = books.length === 0
            ? "📚 Your bookshelf is waiting! Add your first book above."
            : "🔎 No books match your search or selected filters.";

        elements.bookList.appendChild(empty);
        return;
    }

    filteredBooks.forEach(book => {
        elements.bookList.appendChild(createBookCard(book));
    });
}

function createBookCard(book) {
    const card = document.createElement("article");
    card.className = "book-card";

    const title = document.createElement("h3");
    title.textContent = book.title;

    const author = document.createElement("p");
    author.textContent = "By " + book.author;

    const statusLabel = document.createElement("label");
    statusLabel.className = "status-label";
    statusLabel.textContent = "Reading status";

    const statusSelect = document.createElement("select");
    statusSelect.setAttribute(
        "aria-label",
        "Reading status for " + book.title
    );

    VALID_STATUSES.forEach(status => {
        const option = document.createElement("option");
        option.value = status;
        option.textContent = status;
        option.selected = book.status === status;
        statusSelect.appendChild(option);
    });

    statusSelect.addEventListener("change", () => {
        const previousStatus = book.status;
        book.status = statusSelect.value;

        if (book.status === "Finished" && previousStatus !== "Finished") {
            book.finishedAt = Date.now();
        } else if (book.status !== "Finished") {
            book.finishedAt = null;
        }

        if (saveBooks()) {
            renderAll();
        }
    });

    const actions = document.createElement("div");
    actions.className = "book-actions";

    const favoriteButton = document.createElement("button");
    favoriteButton.type = "button";
    favoriteButton.className = "favorite-button";
    favoriteButton.textContent = book.favorite
        ? "❤️ Favourite"
        : "♡ Add favourite";

    favoriteButton.setAttribute(
        "aria-pressed",
        String(book.favorite)
    );

    favoriteButton.addEventListener("click", () => {
        book.favorite = !book.favorite;

        if (saveBooks()) {
            renderBooks();
        }
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "🗑️ Delete";
    deleteButton.setAttribute("aria-label", "Delete " + book.title);

    deleteButton.addEventListener("click", () => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${book.title}"?`
        );

        if (!confirmed) return;

        const previousBooks = [...books];

        books = books.filter(item => item.id !== book.id);

        if (saveBooks()) {
            renderAll();
        } else {
            books = previousBooks;
            renderAll();
        }
    });

    actions.append(favoriteButton, deleteButton);

    const ratingArea = document.createElement("div");
    ratingArea.className = "rating-area";

    const ratingLabel = document.createElement("span");
    ratingLabel.className = "rating-label";
    ratingLabel.textContent = "Your rating";

    const stars = document.createElement("div");
    stars.className = "rating-stars";
    stars.setAttribute("role", "group");
    stars.setAttribute("aria-label", "Rate " + book.title);

    for (let rating = 1; rating <= 5; rating++) {
        const star = document.createElement("button");
        star.type = "button";
        star.className = "star-button" +
            (rating <= book.rating ? " selected" : "");

        star.textContent = rating <= book.rating ? "★" : "☆";
        star.setAttribute("aria-label", rating + " out of 5 stars");
        star.setAttribute("aria-pressed", String(rating === book.rating));

        star.addEventListener("click", () => {
            const previousRating = book.rating;
            book.rating = rating;

            if (saveBooks()) {
                renderBooks();
            } else {
                book.rating = previousRating;
            }
        });

        stars.appendChild(star);
    }

    ratingArea.append(ratingLabel, stars);

    const reviewArea = document.createElement("div");
    reviewArea.className = "review-area";

    const reviewLabel = document.createElement("label");
    reviewLabel.className = "review-label";
    reviewLabel.textContent = "Your review";
    reviewLabel.htmlFor = "review-" + book.id;

    const reviewInput = document.createElement("textarea");
    reviewInput.id = "review-" + book.id;
    reviewInput.className = "review-input";
    reviewInput.maxLength = 2000;
    reviewInput.placeholder = "Write your thoughts about this book...";
    reviewInput.value = book.review;

    const saveReviewButton = document.createElement("button");
    saveReviewButton.type = "button";
    saveReviewButton.className = "review-save-button";
    saveReviewButton.textContent = "Save review";

    saveReviewButton.addEventListener("click", () => {
        const previousReview = book.review;
        book.review = reviewInput.value.trim();

        if (saveBooks()) {
            saveReviewButton.textContent = "✓ Review saved";
        } else {
            book.review = previousReview;
        }
    });

    reviewArea.append(reviewLabel, reviewInput, saveReviewButton);

    const statusGroup = document.createElement("div");
    statusGroup.className = "status-group";
    statusGroup.append(statusLabel, statusSelect);

    card.append(
        title,
        author,
        statusGroup,
        actions,
        ratingArea,
        reviewArea
    );

    return card;
}

/* ==========================================
   READING GOAL
   ========================================== */

function renderGoal() {
    if (!elements.goalYear || !elements.goalTarget) return;

    elements.goalYear.value = readingGoal.year;
    elements.goalTarget.value = readingGoal.target;

    const finishedBooks = books.filter(book => {
        if (book.status !== "Finished") return false;

        // New completions use the actual completion date.
        // Older saved books without a completion date are counted
        // using their original added date as a fallback.
        const completionDate = book.finishedAt || book.createdAt;

        return new Date(completionDate).getFullYear() === readingGoal.year;
    }).length;

    const percentage = Math.min(
        100,
        Math.round((finishedBooks / readingGoal.target) * 100)
    );

    elements.goalProgressText.textContent =
        `${finishedBooks} of ${readingGoal.target} books finished`;

    elements.goalPercentage.textContent = percentage + "%";

    elements.goalProgressBar.style.width = percentage + "%";

    elements.goalProgressTrack.setAttribute(
        "aria-valuenow",
        String(percentage)
    );

    elements.goalProgressTrack.setAttribute(
        "aria-valuetext",
        `${percentage}% complete`
    );

    if (finishedBooks >= readingGoal.target) {
        elements.goalMessage.textContent =
            "🎉 Congratulations! You achieved your reading goal!";
    } else {
        elements.goalMessage.textContent =
            `Keep going! Finish ${readingGoal.target - finishedBooks} more book(s) to reach your goal.`;
    }
}

elements.goalForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const year = Number(elements.goalYear.value);
    const target = Number(elements.goalTarget.value);

    if (
        !Number.isInteger(year) ||
        year < 2000 ||
        year > 2100 ||
        !Number.isInteger(target) ||
        target < 1 ||
        target > 10000
    ) {
        showMessage(
            elements.goalMessage,
            "Enter a year between 2000 and 2100 and a target between 1 and 10,000.",
            true
        );
        return;
    }

    const previousGoal = { ...readingGoal };

    readingGoal = { year, target };

    if (!saveGoal()) {
        readingGoal = previousGoal;
        showMessage(elements.goalMessage, "Could not save your goal.", true);
        return;
    }

    showMessage(elements.goalMessage, "Your reading goal has been saved!");
    renderGoal();
});

/* ==========================================
   DARK MODE
   ========================================== */

function applyTheme(theme) {
    const dark = theme === "dark";

    document.body.classList.toggle("dark-mode", dark);

    if (elements.themeToggle) {
        elements.themeToggle.textContent = dark
            ? "☀️ Light mode"
            : "🌙 Dark mode";

        elements.themeToggle.setAttribute(
            "aria-pressed",
            String(dark)
        );
    }
}

function initializeTheme() {
    let theme = "light";

    try {
        theme = localStorage.getItem(THEME_KEY) || "light";
    } catch (error) {
        console.warn("Theme preference could not be loaded.", error);
    }

    applyTheme(theme);
}

elements.themeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.contains("dark-mode");
    const nextTheme = isDark ? "light" : "dark";

    applyTheme(nextTheme);

    try {
        localStorage.setItem(THEME_KEY, nextTheme);
    } catch (error) {
        console.warn("Theme preference could not be saved.", error);
    }
});

/* ==========================================
   EXPORT JSON
   ========================================== */

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

elements.exportJson.addEventListener("click", () => {
    const backup = {
        app: "I Love Reading",
        version: 1,
        exportedAt: new Date().toISOString(),
        books
    };

    downloadFile(
        JSON.stringify(backup, null, 2),
        "i-love-reading-backup.json",
        "application/json"
    );

    showMessage(elements.backupMessage, "JSON backup downloaded successfully.");
});

/* ==========================================
   EXPORT CSV
   ========================================== */

function csvEscape(value) {
    const text = String(value ?? "");
    return '"' + text.replace(/"/g, '""') + '"';
}

elements.exportCsv.addEventListener("click", () => {
    const headers = [
        "Title",
        "Author",
        "Status",
        "Favourite",
        "Rating",
        "Review",
        "Added Date",
        "Finished Date"
    ];

    const rows = books.map(book => [
        book.title,
        book.author,
        book.status,
        book.favorite ? "Yes" : "No",
        book.rating,
        book.review,
        new Date(book.createdAt).toISOString(),
        book.finishedAt ? new Date(book.finishedAt).toISOString() : ""
    ]);

    const csv = [headers, ...rows]
        .map(row => row.map(csvEscape).join(","))
        .join("\r\n");

    downloadFile(
        "\uFEFF" + csv,
        "i-love-reading-books.csv",
        "text/csv;charset=utf-8"
    );

    showMessage(elements.backupMessage, "CSV file downloaded successfully.");
});

/* ==========================================
   IMPORT JSON BACKUP
   ========================================== */

elements.importFile.addEventListener("change", async function () {
    const file = elements.importFile.files[0];

    if (!file) return;

    try {
        if (file.size > 5 * 1024 * 1024) {
            throw new Error("The backup file must be smaller than 5 MB.");
        }

        const content = await file.text();
        const parsed = JSON.parse(content);

        const importedBooks = Array.isArray(parsed)
            ? parsed
            : parsed.books;

        if (!Array.isArray(importedBooks)) {
            throw new Error("This file does not contain a valid book list.");
        }

        if (importedBooks.length > 10000) {
            throw new Error("The backup contains too many books.");
        }

        const cleanBooks = importedBooks.map((book, index) => {
            if (
                !book ||
                typeof book.title !== "string" ||
                !book.title.trim() ||
                typeof book.author !== "string" ||
                !book.author.trim() ||
                !VALID_STATUSES.includes(book.status)
            ) {
                throw new Error(
                    `Book ${index + 1} has invalid or missing information.`
                );
            }

            const createdAt = Number(book.createdAt);

            return {
                id: createId(),
                title: book.title.trim().slice(0, 300),
                author: book.author.trim().slice(0, 200),
                status: book.status,
                createdAt: Number.isFinite(createdAt) && createdAt > 0
                    ? createdAt
                    : Date.now(),
                order: index,
                favorite: book.favorite === true,
                rating: Math.max(
                    0,
                    Math.min(5, Math.round(Number(book.rating) || 0))
                ),
                review: typeof book.review === "string"
                    ? book.review.slice(0, 2000)
                    : "",
                finishedAt: Number(book.finishedAt) > 0
                    ? Number(book.finishedAt)
                    : null
            };
        });

        const confirmed = window.confirm(
            `This backup contains ${cleanBooks.length} book(s). ` +
            "Importing will replace your current bookshelf. " +
            "Export a backup first if you want to keep your current books. Continue?"
        );

        if (!confirmed) return;

        const previousBooks = books;

        books = cleanBooks;

        if (!saveBooks()) {
            books = previousBooks;
            throw new Error("The imported books could not be saved.");
        }

        renderAll();

        showMessage(
            elements.backupMessage,
            `Successfully imported ${books.length} book(s).`
        );
    } catch (error) {
        showMessage(
            elements.backupMessage,
            error.message || "Could not import this file.",
            true
        );
    } finally {
        elements.importFile.value = "";
    }
});

/* ==========================================
   RENDER EVERYTHING
   ========================================== */

function renderAll() {
    renderStatistics();
    renderBooks();
    renderGoal();
}

initializeTheme();
renderAll();
